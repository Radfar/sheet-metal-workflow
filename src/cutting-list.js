import ExcelJS from "exceljs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LASER_TEMPLATE_PATH = path.join(__dirname, "../test-data/Excel/RA-5075 Jul 02-26.xlsx");

function clean(value) {
  return String(value ?? "").trim();
}

function safeFilename(value) {
  return clean(value)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .trim();
}

function dateParts(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function monthName(month) {
  return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][month - 1];
}

function excelDate(value) {
  const parts = dateParts(value);
  return parts ? new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0) : null;
}

function formatOrderShipRange(orderDate, shipDate) {
  const start = dateParts(orderDate);
  const end = dateParts(shipDate);
  if (!start) return "";
  const startLabel = monthName(start.month) + " " + String(start.day).padStart(2, "0");
  if (!end) return startLabel + "-" + String(start.year).slice(-2);
  if (start.year === end.year && start.month === end.month) {
    return startLabel + "-" + String(end.day).padStart(2, "0");
  }
  const endLabel = monthName(end.month) + " " + String(end.day).padStart(2, "0");
  return start.year === end.year
    ? startLabel + "-" + endLabel
    : startLabel + ", " + String(start.year).slice(-2) + "-" + endLabel + ", " + String(end.year).slice(-2);
}

function normalizeCommonDxfFilename(filename, fixtureTag) {
  const name = clean(filename || "").trim().toLowerCase();
  const tag = clean(fixtureTag || "").trim().toLowerCase();
  if (!name || !tag) return name;
  return name.replace(new RegExp("(^|[^a-z0-9])" + tag + "(?=[^a-z0-9]|$)", "i"), "$1");
}
function classifyMaterial(component, dxf, fixture) {
  const code = clean(component.materialCode || dxf.materialCode).toUpperCase();
  const material = clean(component.materialGrade) || (code === "C11" || code === "C16" ? "CRS" : "");
  const gauge = clean(component.gauge) || (code === "C11" ? "11GA" : code === "C16" ? "16GA" : "");
  if (!material || !gauge) {
    throw new Error("Cannot classify " + clean(component.partNumber) + " in " + clean(fixture.fixtureTag) +
      ". Verify its DXF material code or enter Material and Thickness in the BOM component data.");
  }
  return { material, gauge, finish: clean(component.cuttingListFinish) || clean(fixture.finish) };
}

function applyTableHeader(ws, row) {
  const headers = ["", "DXF FILE NAME", "", "", "", "", "", "MATERIAL", "THK", "Q. REQ'D", "FINISH"];
  ws.mergeCells(row, 2, row, 7);
  headers.forEach((value, index) => {
    const cell = ws.getCell(row, index + 1);
    if (value) cell.value = value;
    cell.font = { name: "Arial", size: 9, bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right: { style: "thin" }
    };
  });
  ws.getRow(row).height = 22;
}

function addSectionComment(ws, row, sectionName, payload) {
  const path = [sectionName, "LASER_DXF", clean(payload.customer), clean(payload.projectName), clean(payload.mountingComment)]
    .filter(Boolean).join("\\");
  ws.mergeCells(row, 2, row, 11);
  const cell = ws.getCell(row, 2);
  cell.value = path;
  cell.font = { name: "Arial", size: 9, bold: true };
  cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7EBEF" } };
  cell.border = { bottom: { style: "thin" } };
  ws.getRow(row).height = 24;
}

export async function buildCuttingListWorkbook(payload = {}) {
  const fixtures = Array.isArray(payload.fixtures) ? payload.fixtures : [];
  if (!fixtures.length) throw new Error("No fixture BOM data was supplied.");

  const hashFixtureMap = new Map();
  for (const fixture of fixtures) {
    for (const component of (Array.isArray(fixture.components) ? fixture.components : [])) {
      const hash = component.dxf?.sha256;
      if (!hash) continue;
      if (!hashFixtureMap.has(hash)) hashFixtureMap.set(hash, new Set());
      hashFixtureMap.get(hash).add(clean(fixture.fixtureTag));
    }
  }
  const commonHashes = new Set([...hashFixtureMap.entries()].filter(([, tags]) => tags.size > 1).map(([hash]) => hash));
  const groups = { common: [], gauge16: [], gauge11: [] };
  const groupMap = new Map();
  const skipped = [];

  for (const fixture of fixtures) {
    const fixtureTag = clean(fixture.fixtureTag);
    const fixtureQuantity = Number(fixture.fixtureQuantity);
    if (!fixtureTag || !Number.isFinite(fixtureQuantity) || fixtureQuantity <= 0) {
      skipped.push(fixtureTag || "Unknown fixture");
      continue;
    }

    for (const component of (Array.isArray(fixture.components) ? fixture.components : [])) {
      const dxf = component.dxf;
      if (!dxf || !clean(dxf.originalFilename)) continue;
      const qtyPerAssembly = Number(component.quantityPerAssembly);
      if (!Number.isFinite(qtyPerAssembly) || qtyPerAssembly < 0 || component.quantityPerAssembly === "") {
        throw new Error("Invalid BOM quantity for " + clean(component.partNumber) + " in " + fixtureTag + ".");
      }

      const classified = classifyMaterial(component, dxf, fixture);
      const hashCommon = Boolean(dxf.sha256 && commonHashes.has(dxf.sha256));
      const isCommon = Boolean(dxf.consolidationKey) ||
        clean(dxf.fixtureTag).toUpperCase() === "COMMON" ||
        hashCommon;
      const dxfIdentity = dxf.consolidationKey
        ? "approved:" + clean(dxf.consolidationKey).toLowerCase()
        : hashCommon ? "sha256:" + clean(dxf.sha256)
        : clean(dxf.originalFilename).toLowerCase();
      const identity = [
        dxfIdentity,
        classified.material.toUpperCase(),
        classified.gauge.toUpperCase(),
        classified.finish.toUpperCase()
      ].join("|");

      if (!groupMap.has(identity)) {
        const line = {
          dxfFilename: clean(dxf.originalFilename),
          material: classified.material,
          gauge: classified.gauge,
          finish: classified.finish,
          quantity: 0,
          sourceFixtureTag: isCommon ? "COMMON" : fixtureTag,
          fixtureContributions: []
        };
        groupMap.set(identity, line);
        if (isCommon) groups.common.push(line);
        else if (classified.gauge === "16GA") groups.gauge16.push(line);
        else if (classified.gauge === "11GA") groups.gauge11.push(line);
        else throw new Error("Unsupported thickness " + classified.gauge + " for " + dxf.originalFilename + ".");
      }

      const line = groupMap.get(identity);
      line.quantity += qtyPerAssembly * fixtureQuantity;
      line.fixtureContributions.push({
        fixtureTag,
        quantity: qtyPerAssembly * fixtureQuantity,
        partNumber: clean(component.partNumber)
      });
    }
  }

  const sectionDefinitions = [
    { key: "common", title: "COMMON PARTS" },
    { key: "gauge16", title: "16GA CRS" },
    { key: "gauge11", title: "11GA CRS" }
  ];
  if (!sectionDefinitions.some(section => groups[section.key].length)) {
    throw new Error("No BOM components with matched DXF files were found.");
  }

  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => a.dxfFilename.localeCompare(b.dxfFilename));
  }

  // Load the company's original workbook and populate its preformatted print layout.
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(LASER_TEMPLATE_PATH);
  const ws = workbook.getWorksheet("Sheet1");
  if (!ws) throw new Error("The Laser Order Request template is missing Sheet1.");

  // The source workbook contains auxiliary worksheets; this export is the LOR form only.
  for (const sheet of [...workbook.worksheets]) {
    if (sheet.id !== ws.id) workbook.removeWorksheet(sheet.id);
  }
  ws.name = "Laser Order Request";

  // Update only input cells. The original merged ranges, fonts, borders, logo,
  // column widths, row heights and print settings remain template-controlled.
  ws.getCell("J2").value = clean(payload.orderNumber);
  ws.getCell("D3").value = clean(payload.customer);
  ws.getCell("I3").value = excelDate(payload.orderDate) || clean(payload.orderDate);
  ws.getCell("D4").value = clean(payload.storeNumber);
  ws.getCell("I4").value = clean(payload.requestedBy);
  ws.getCell("D5").value = clean(payload.poNumber);
  ws.getCell("I5").value = excelDate(payload.shipDate) || clean(payload.shipDate);

  const sectionRows = {
    common: { title: "COMMON PARTS", headingRow: 8, firstRow: 9, lastRow: 21 },
    gauge16: { title: "16GA CRS", headingRow: 22, firstRow: 23, lastRow: 105 },
    gauge11: { title: "11GA CRS", headingRow: 106, firstRow: 107, lastRow: 175 }
  };

  function sectionHeadingText(section, payload) {
    const folderPrefix = section.key === "common"
      ? section.title + " / laser_dxf\\"
      : section.title + " / \\laser_dxf\\";
    const folders = [
      clean(payload.customer),
      clean(payload.projectName),
      clean(payload.mountingComment),
      section.title
    ].filter(Boolean);
    return folderPrefix + folders.join("\\");
  }

  // Reset the template's sample content and row visibility before writing this order.
  for (const section of Object.values(sectionRows)) {
    ws.getRow(section.headingRow).hidden = false;
    ws.getCell(section.headingRow, 2).value = null;
    for (let row = section.firstRow; row <= section.lastRow; row++) {
      ws.getRow(row).hidden = false;
      for (const column of [1, 2, 8, 9, 10, 11]) {
        ws.getCell(row, column).value = null;
      }
    }
  }

  // Populate each material section, then hide unused template rows. Hidden rows
  // consume no printed space, so the next section follows the last populated line.
  for (const section of sectionDefinitions) {
    const layout = sectionRows[section.key];
    const lines = groups[section.key];
    const capacity = layout.lastRow - layout.firstRow + 1;

    if (lines.length > capacity) {
      throw new Error(
        section.title + " contains " + lines.length + " lines, but the original LOR template supports " +
        capacity + ". The template layout must be extended before exporting this order."
      );
    }

    if (lines.length === 0) {
      ws.getRow(layout.headingRow).hidden = true;
      for (let row = layout.firstRow; row <= layout.lastRow; row++) {
        ws.getRow(row).hidden = true;
      }
      continue;
    }

    ws.getCell(layout.headingRow, 2).value = sectionHeadingText({ ...layout, key: section.key }, payload);

    lines.forEach((line, index) => {
      const row = layout.firstRow + index;
      ws.getCell(row, 1).value = index + 1;
      ws.getCell(row, 2).value = line.dxfFilename;
      ws.getCell(row, 8).value = line.material;
      ws.getCell(row, 9).value = line.gauge;
      ws.getCell(row, 10).value = line.quantity;
      ws.getCell(row, 11).value = line.finish;
    });

    for (let row = layout.firstRow + lines.length; row <= layout.lastRow; row++) {
      ws.getRow(row).hidden = true;
    }
  }

  // Retain one-page width while allowing the compacted report to use only the
  // number of pages its populated rows require.
  ws.pageSetup.fitToWidth = 1;
  ws.pageSetup.fitToHeight = 0;

  const filenameOrder = safeFilename(payload.orderNumber) || "TBD";
  const dateRange = formatOrderShipRange(payload.orderDate, payload.shipDate);
  const filename = filenameOrder + (dateRange ? " " + dateRange : "") + ".xlsx";
  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer,
    filename,
    lineCount: Object.values(groups).reduce((sum, lines) => sum + lines.length, 0),
    skippedFixtures: skipped,
    contributingFixtures: fixtures.length
  };
}
