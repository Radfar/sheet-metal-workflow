import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { buildCuttingListWorkbook } from "../src/cutting-list.js";

const part = (partNumber, originalFilename, quantityPerAssembly, materialCode, fixtureTag = "T01A") => ({
  partNumber,
  quantityPerAssembly,
  dxf: { originalFilename, materialCode, fixtureTag }
});

const payload = (count16 = 1) => ({
  orderNumber: "RA-TEST",
  customer: "ARITZIA",
  projectName: "MENLO PARK",
  mountingComment: "RECESSED LIGHT TROUGHS",
  orderDate: "2026-11-17",
  shipDate: "2026-11-27",
  storeNumber: "2605",
  poNumber: "TBD",
  fixtures: [{
    fixtureTag: "T01A",
    fixtureQuantity: 2,
    finish: "M-12EA",
    components: [
      part("ENDCAP", "ARI C16 2605 ENDCAP 7.6875x9", 2, "C16", "COMMON"),
      ...Array.from({ length: count16 }, (_, i) =>
        part("T01A-T" + i, "ARI C16 2605 T01A-" + i + " TROUGH 91.187x24.171", 1, "C16")),
      part("T01A-ANG-1", "ARI C11 2605 T01A-ANG-1 92.625x2.18", 2, "C11")
    ]
  }]
});

async function load(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return wb.getWorksheet("Laser Order Request");
}

// Finds a data row by DXF name, or a section heading row when heading is true.
// Heading rows contain the "laser_dxf" folder path and would otherwise match part names
// such as TROUGH (they contain "RECESSED LIGHT TROUGHS").
function findRow(ws, text, heading = false) {
  for (let r = 1; r <= ws.rowCount; r++) {
    const value = String(ws.getCell(r, 2).value ?? "");
    if (value.includes("laser_dxf") !== heading) continue;
    if (value.includes(text)) return r;
  }
  return 0;
}

test("RA-5075 layout: name in B, material H, thickness I, quantity J, finish K for every section", async () => {
  const { buffer } = await buildCuttingListWorkbook(payload());
  const ws = await load(buffer);
  for (const [name, mat, thk, qty] of [
    ["ENDCAP", "CRS", "16GA", 4],
    ["TROUGH", "CRS", "16GA", 2],
    ["ANG-1", "CRS", "11GA", 4]
  ]) {
    const r = findRow(ws, name);
    assert.ok(r > 0, name + " row missing");
    assert.equal(ws.getCell(r, 8).value, mat);
    assert.equal(ws.getCell(r, 9).value, thk);
    assert.equal(ws.getCell(r, 10).value, qty);
    assert.equal(ws.getCell(r, 11).value, "M-12EA");
  }
});

test("sections with more lines than the template keep their names and merges", async () => {
  const { buffer, lineCount } = await buildCuttingListWorkbook(payload(90));
  const ws = await load(buffer);
  assert.equal(lineCount, 92);
  const heading11 = findRow(ws, "11GA CRS", true);
  const last16 = findRow(ws, "T01A-89 TROUGH");
  assert.ok(last16 > 0 && heading11 > last16, "11GA section must start after the last 16GA line");
  assert.equal(ws.getCell(last16, 10).value, 2);
  assert.ok(ws.getCell(last16, 3).isMerged, "extra rows keep the B:G merge");
});


test("missing-DXF fabricated parts are included in red while purchased hardware is excluded", async () => {
  const input = payload(1);
  input.fixtures[0].components.push(
    { partNumber: "T15-A-TOP", description: '95 3/4" x 4 3/4" 11GA. Component T15-A-TOP "T15-A-TOP"', componentType: "Plate", gauge: "11GA", quantityPerAssembly: 2, dxf: null },
    { partNumber: "SCREW-8", description: "#8 RH Tek Screw x 1/2", componentType: "Purchased hardware", quantityPerAssembly: 4, dxf: null }
  );
  const { buffer, lineCount } = await buildCuttingListWorkbook(input);
  const ws = await load(buffer);
  assert.equal(lineCount, 4);
  const missingRow = findRow(ws, "95 3/4");
  assert.ok(missingRow > 0, "BOM description should appear in the cutting list");
  assert.equal(ws.getCell(missingRow, 10).value, 4);
  assert.equal(ws.getCell(missingRow, 2).font.color.argb, "FF9C0006");
  assert.equal(ws.getCell(missingRow, 2).fill.fgColor.argb, "FFFFE2E2");
  assert.equal(findRow(ws, "Tek Screw"), 0);
});

test("inserted rows retain the standard data-row style after large section expansion", async () => {
  const input = payload(190);
  const { buffer } = await buildCuttingListWorkbook(input);
  const ws = await load(buffer);
  const last16 = findRow(ws, "T01A-189 TROUGH");
  assert.ok(last16 > 208);
  assert.equal(JSON.stringify(ws.getRow(last16).getCell(1).style), JSON.stringify(ws.getRow(104).getCell(1).style));
});
