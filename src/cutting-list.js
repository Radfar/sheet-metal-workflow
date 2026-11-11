import ExcelJS from "exceljs";

function clean(value) {
  return String(value ?? "").trim();
}

export async function buildCuttingListWorkbook(payload = {}) {
  const fixtures = Array.isArray(payload.fixtures) ? payload.fixtures : [];
  if (!fixtures.length) throw new Error("No fixture BOM data was supplied.");

  const grouped = new Map();
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
      const material = clean(component.materialGrade);
      const thickness = clean(component.gauge);
      const finish = clean(component.cuttingListFinish);
      // Exact DXF filename is the default identity. An explicit approved common identity may override it.
      const identity = [clean(dxf.consolidationKey || dxf.originalFilename).toLowerCase(), clean(component.materialCode).toUpperCase(), material.toUpperCase(), thickness.toUpperCase(), finish.toUpperCase()].join("|");
      const key = identity;
      if (!grouped.has(key)) {
        grouped.set(key, {
          dxfFilename: clean(dxf.outputFilename || dxf.originalFilename),
          material: material || clean(component.materialCode) || "",
          thickness,
          finish,
          sourceFixtureTag: clean(dxf.fixtureTag),
          quantity: 0,
          unit: "PC",
          fixtureContributions: []
        });
      }
      const line = grouped.get(key);
      const required = qtyPerAssembly * fixtureQuantity;
      line.quantity += required;
      line.fixtureContributions.push({ fixtureTag, quantity: required, partNumber: clean(component.partNumber) });
      if (!line.material && clean(component.materialCode)) line.material = clean(component.materialCode);
    }
  }

  const lines = [...grouped.values()].sort((a,b) =>
    a.material.localeCompare(b.material) || a.thickness.localeCompare(b.thickness) ||
    a.dxfFilename.localeCompare(b.dxfFilename)
  );
  if (!lines.length) throw new Error("No BOM components with matched DXF files were found. Match DXFs before generating the cutting list.");

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sheet Metal Workflow";
  workbook.created = new Date();
  const ws = workbook.addWorksheet("Laser Order Request");
  ws.columns = [
    { width: 7 }, { width: 62 }, { width: 14 }, { width: 12 }, { width: 14 }, { width: 16 }
  ];
  ws.mergeCells("A1:F1");
  ws.getCell("A1").value = "LASER ORDER REQUEST";
  ws.getCell("A1").font = { name: "Arial", size: 16, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 28;
  const header = [
    ["A2","ORDER #:"], ["B2",safeFilename(payload.orderNumber)],
    ["A3","CUSTOMER:"], ["B3",clean(payload.customer)],
    ["D3","DATE:"], ["E3",clean(payload.orderDate) || new Date().toLocaleDateString("en-CA")],
    ["A4","STORE#:"], ["B4",clean(payload.storeNumber)],
    ["D4","REQUESTED BY:"], ["E4",clean(payload.requestedBy)],
    ["A5","PO#:"], ["B5",clean(payload.poNumber)],
    ["D5","SHIP DATE:"], ["E5",clean(payload.shipDate)]
  ];
  for (const [cell,value] of header) ws.getCell(cell).value = value;
  for (const cell of ["A2","A3","D3","A4","D4","A5","D5"]) ws.getCell(cell).font = { bold: true };

  let row = 7;
  const groups = new Map();
  for (const line of lines) {
    const key = line.sourceFixtureTag.toUpperCase() === "COMMON"
      ? "COMMON PARTS"
      : (line.material || "MATERIAL NOT SPECIFIED") + " / " + (line.thickness || "THICKNESS NOT SPECIFIED");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(line);
  }
  let itemNumber = 1;
  for (const [groupName, groupLines] of groups) {
    ws.mergeCells(row,1,row,6);
    const section = ws.getCell(row,1);
    section.value = groupName;
    section.font = { bold: true, color: { argb: "FFFFFFFF" } };
    section.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF40576B" } };
    row++;
    const headers = ["", "DXF FILE NAME", "MATERIAL", "THK", "Q. REQ'D", "FINISH"];
    headers.forEach((value,index) => {
      const cell = ws.getCell(row,index+1);
      cell.value = value;
      cell.font = { bold: true };
      cell.border = { bottom: { style: "thin" } };
      cell.alignment = { vertical: "middle" };
    });
    row++;
    for (const line of groupLines) {
      const values = [itemNumber++, line.dxfFilename, line.material, line.thickness, line.quantity, line.finish];
      values.forEach((value,index) => {
        const cell = ws.getCell(row,index+1);
        cell.value = value;
        cell.alignment = { vertical: "middle", wrapText: index === 1 };
        cell.border = { bottom: { style: "hair" } };
      });
      row++;
    }
    row++;
  }
  ws.getColumn(1).width = 7;
  ws.getColumn(2).width = 68;
  ws.getColumn(3).width = 15;
  ws.getColumn(4).width = 12;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 16;
  ws.views = [{ state: "frozen", ySplit: 7 }];
  ws.pageSetup = {
    orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    paperSize: ws.PAPERSIZE_LETTER,
    margins: { left: 0.2, right: 0.2, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.15 }
  };
  ws.pageSetup.printArea = "A1:F" + (row - 1);
  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer, lineCount: lines.length, skippedFixtures: skipped, contributingFixtures: fixtures.length };
}
