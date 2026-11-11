import ExcelJS from "exceljs";

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
      const isCommon = Boolean(dxf.consolidationKey) || clean(dxf.fixtureTag).toUpperCase() === "COMMON" || hashCommon;
      const dxfIdentity = dxf.consolidationKey
        ? "approved:" + clean(dxf.consolidationKey).toLowerCase()
        : hashCommon ? "sha256:" + clean(dxf.sha256) : clean(dxf.originalFilename).toLowerCase();
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

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sheet Metal Workflow";
  workbook.created = new Date();
  const ws = workbook.addWorksheet("Laser Order Request");

  ws.columns = [
    { width: 5 }, { width: 8.5 }, { width: 8.5 }, { width: 8.5 },
    { width: 8.5 }, { width: 8.5 }, { width: 8.5 },
    { width: 10 }, { width: 8 }, { width: 10 }, { width: 12 }
  ];

  // Company logo: A1:B5, using the same saved logo asset as the fixture BOM.
  const logo = payload.logoAsset;
  if (logo?.dataUrl && logo?.extension) {
    const base64 = logo.dataUrl.split(",")[1];
    const imageId = workbook.addImage({ base64, extension: logo.extension });
    ws.addImage(imageId, {
      tl: { col: 0, row: 0 },
      br: { col: 2, row: 5 },
      editAs: "oneCell"
    });
  }

  // Header fields follow the fixture BOM's customer form positions.
  ws.mergeCells("D3:F3");
  ws.mergeCells("I3:K3");
  ws.mergeCells("D4:F4");
  ws.mergeCells("I4:K4");
  ws.mergeCells("D5:F5");
  ws.mergeCells("I5:K5");
  ws.mergeCells("J2:K2");

  const headerValues = {
    "C3": "CUSTOMER:", "D3": clean(payload.customer),
    "H3": "DATE:",
    "I2": "ORDER #:",
    "C4": "STORE #:", "D4": clean(payload.storeNumber),
    "H4": "REQUESTED BY:", "I4": clean(payload.requestedBy),
    "C5": "PO #:", "D5": clean(payload.poNumber),
    "H5": "SHIP DATE:"
  };
  for (const [address, value] of Object.entries(headerValues)) ws.getCell(address).value = value;
  ws.getCell("I3").value = excelDate(payload.orderDate) || clean(payload.orderDate);
  ws.getCell("I3").numFmt = "mmmm d, yyyy";
  ws.getCell("I5").value = excelDate(payload.shipDate) || clean(payload.shipDate);
  ws.getCell("I5").numFmt = "mmmm d, yyyy";
  ws.getCell("J2").value = clean(payload.orderNumber);

  for (const address of ["I2","C3","H3","C4","H4","C5","H5"]) {
    ws.getCell(address).font = { name: "Arial", size: 9, bold: true };
  }
  for (const address of ["D3","I3","D4","I4","D5","I5","J2"]) {
    ws.getCell(address).font = { name: "Arial", size: 9, bold: address === "J2" };
    ws.getCell(address).alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  }

  for (let row = 1; row <= 5; row++) ws.getRow(row).height = 20;
  ws.getRow(1).height = 22;
  ws.getRow(6).height = 8;

  // Header row, section comments and data are repeated in the same order for each material group.
  applyTableHeader(ws, 7);
  let row = 8;
  let itemNumber = 1;
  for (const section of sectionDefinitions) {
    addSectionComment(ws, row, section.title, payload);
    row++;
    if (section.key !== "common") {
      applyTableHeader(ws, row);
      row++;
    }
    for (const line of groups[section.key]) {
      ws.getCell(row, 1).value = itemNumber++;
      ws.mergeCells(row, 2, row, 7);
      ws.getCell(row, 2).value = line.dxfFilename;
      ws.getCell(row, 8).value = line.material;
      ws.getCell(row, 9).value = line.gauge;
      ws.getCell(row, 10).value = line.quantity;
      ws.getCell(row, 11).value = line.finish;

      for (let col = 1; col <= 11; col++) {
        const cell = ws.getCell(row, col);
        cell.font = { name: "Arial", size: 8 };
        cell.alignment = {
          horizontal: col === 1 || col >= 8 ? "center" : "left",
          vertical: "middle",
          wrapText: col === 2
        };
        cell.border = {
          left: { style: "thin" }, right: { style: "thin" },
          bottom: { style: "hair" }
        };
      }
      ws.getRow(row).height = 20;
      row++;
    }
    row++;
  }

  // Print-ready portrait layout; allow additional pages vertically while fitting all columns to one page width.
  ws.pageSetup = {
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: ws.PAPERSIZE_LETTER,
    margins: { left: 0.2, right: 0.2, top: 0.25, bottom: 0.25, header: 0.1, footer: 0.1 },
    horizontalDpi: 300,
    verticalDpi: 300
  };
  ws.pageSetup.printArea = "A1:K" + (row - 1);
  ws.pageSetup.horizontalCentered = false;
  ws.views = [{ state: "normal", showGridLines: false }];

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
