import test from "node:test";
import assert from "node:assert/strict";
import { analyzeDrawingPages, mapPurchasedItemsToBomRows, calculateGussetQuantity } from "../public/js/pdf-analysis.js";

test("finds purchased hardware and retains its source page", () => {
  const result = analyzeDrawingPages([
    { pageNumber: 1, text: "T01A FIXTURE QTY: 2\n#8 RH Tek Screw x 1/2\"" },
    { pageNumber: 2, text: "Channel profile 7 11/16 x 9" },
    { pageNumber: 3, text: "Channel section" },
    { pageNumber: 4, text: "Angle 1 x 1 3/8" },
    { pageNumber: 6, text: "Washer 1/4 inch" }
  ], "T01A");

  assert.equal(result.pageChecks[0].result, "Fixture T01A · Qty 2");
  assert.equal(result.purchasedItems.length, 2);
  assert.equal(result.purchasedItems[0].pageNumber, 1);
  assert.match(result.purchasedItems[0].description, /#8 RH Tek Screw x 1\/2/i);
  assert.equal(result.purchasedItems[0].confidence, "Higher");
  assert.equal(result.purchasedItems[1].pageNumber, 6);
});

test("extracts the 10-32 RHMS and HEX NYLOK NUT callout with a nearby SETS quantity", () => {
  const result = analyzeDrawingPages([
    { pageNumber: 2, text: "40 SETS\n10-32 RHMSx 1/2\" C/W HEX NYLOK NUT" }
  ], "T08");

  assert.equal(result.purchasedItems.length, 1);
  assert.match(result.purchasedItems[0].description, /10-32 RHMSx 1\/2.*C\/W HEX NYLOK NUT/i);
  assert.equal(result.purchasedItems[0].quantity, "40 SETS");
  assert.equal(result.purchasedItems[0].pageNumber, 2);
  assert.equal(result.purchasedItems[0].confidence, "Higher");
});

test("recognizes the #8 RH TEK SCREWS callout with tight spacing", () => {
  const result = analyzeDrawingPages([
    { pageNumber: 11, text: "#8 RH TEK SCREWS x1/2\"" }
  ], "T14");

  assert.equal(result.purchasedItems.length, 1);
  assert.match(result.purchasedItems[0].description, /#8 RH TEK SCREWS x1\/2/i);
  assert.equal(result.purchasedItems[0].pageNumber, 11);
});

test("uses the observed T08-T14 page layout", () => {
  const result = analyzeDrawingPages([
    { pageNumber: 1, text: "T08 FIXTURE QTY: 1" },
    { pageNumber: 2, text: "10-32 RHMS x 1/2\" C/W HEX NYLOK NUT" },
    { pageNumber: 3, text: "CHANNEL A" },
    { pageNumber: 4, text: "CHANNEL B" },
    { pageNumber: 5, text: "CHANNEL C" },
    { pageNumber: 6, text: "END CAP" },
    { pageNumber: 7, text: "ANGLE" },
    { pageNumber: 11, text: "#8 RH TEK SCREWS x 1/2\"" }
  ], "T08");

  assert.equal(result.drawingFamily, "T08-T14");
  assert.deepEqual(result.pageChecks.map(check => check.pageNumber), [1, 3, 4, 5, 6, 7, 2, 11]);
  assert.match(result.pageChecks.find(check => check.pageNumber === 6).result, /1 end-cap/);
  assert.match(result.pageChecks.find(check => check.pageNumber === 2).result, /1 target hardware/);
});

test("retains the T01-T07 page layout and searches purchased items on all pages", () => {
  const result = analyzeDrawingPages([
    { pageNumber: 1, text: "T01A FIXTURE QTY: 2" },
    { pageNumber: 2, text: "CHANNEL" },
    { pageNumber: 3, text: "TROUGH" },
    { pageNumber: 4, text: "ANGLE" },
    { pageNumber: 6, text: "#8 RH TEK SCREWS x 1/2\"" }
  ], "T01A");

  assert.equal(result.drawingFamily, "T01-T07");
  assert.deepEqual(result.pageChecks.map(check => check.pageNumber), [1, 2, 3, 4, 6]);
  assert.equal(result.purchasedItems.length, 1);
  assert.equal(result.purchasedItems[0].pageNumber, 6);
});

test("does not invent purchase items when no recognized hardware terms exist", () => {
  const result = analyzeDrawingPages([
    { pageNumber: 1, text: "T02 fixture quantity 1" },
    { pageNumber: 2, text: "Channel 24 x 7" },
    { pageNumber: 4, text: "Angle profile" }
  ], "T02");

  assert.deepEqual(result.purchasedItems, []);
  assert.match(result.pageChecks[1].result, /channel/i);
  assert.match(result.pageChecks[3].result, /angle/i);
});

test("keeps a hardware candidate as possible when no size is stated", () => {
  const result = analyzeDrawingPages([
    { pageNumber: 6, text: "Tek Screw" }
  ], "T03");

  assert.equal(result.purchasedItems[0].confidence, "Possible");
  assert.equal(result.purchasedItems[0].quantity, "");
});


test("standardizes the Nylok nut description and maps SETS as a plain numeric quantity", () => {
  const rows = mapPurchasedItemsToBomRows([
    { description: "10-32 RHMS x 1/2 inch C/W HEX NYLOK NUT", quantity: "40 SETS", pageNumber: 2 },
    { description: "#8 RH TEK SCREWS x 1/2 inch", quantity: "QTY: 12", pageNumber: 11 },
    { description: "Tek Screw", quantity: "", pageNumber: 6 }
  ]);

  assert.deepEqual(rows.map(row => row.itemNo), ["P1", "P2", "P3"]);
  // The #8 tek screw quantity is derived (3 x gusset quantity), so with no gussets supplied it is 0.
  assert.deepEqual(rows.map(row => row.quantityPerAssembly), [40, 0, ""]);
  assert.equal(rows[0].description, "10-32 HEX NYLOCK NUT (PAINT TO MATCH)");
  assert.equal(rows[1].description, '#8 RH Tek Screw x 1/2"');
  assert.ok(rows.every(row => row.purchasedItem));
  assert.equal(rows[2].description, "Tek Screw");
  assert.ok(rows.every(row => !Object.hasOwn(row, "quantityUnit")));
});

test("omits empty purchased-item descriptions rather than creating blank BOM items", () => {
  const rows = mapPurchasedItemsToBomRows([
    { description: "", quantity: "5 PCS" },
    { description: "Washer", quantity: "5 PCS" }
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].itemNo, "P2");
  assert.equal(rows[0].quantityPerAssembly, 5);
});


test("sets #8 RH TEK SCREW quantity to three times the fixture gusset quantity", () => {
  const rows = mapPurchasedItemsToBomRows([
    { description: '#8 RH TEK SCREWS x1/2"', quantity: "", pageNumber: 2 },
    { description: '10-32 RHMS x 1/2" C/W HEX NYLOK NUT', quantity: "40 SETS", pageNumber: 2 }
  ], 4);

  assert.equal(rows[0].quantityPerAssembly, 12);
  assert.equal(rows[1].quantityPerAssembly, 40);
  assert.equal(rows[1].description, "10-32 HEX NYLOCK NUT (PAINT TO MATCH)");
  assert.ok(!Object.hasOwn(rows[1], "quantityUnit"));
});

test("uses zero screw quantity when no gussets are listed in the fixture BOM", () => {
  const rows = mapPurchasedItemsToBomRows([
    { description: '#8 RH TEK SCREWS x1/2"', quantity: "", pageNumber: 2 }
  ], 0);

  assert.equal(rows[0].quantityPerAssembly, 0);
});


test("sums only SolidWorks BOM quantities for Gusset components", () => {
  const quantity = calculateGussetQuantity([
    { partNumber: "T01A-GUS-1", quantityPerAssembly: 2 },
    { description: "Return Gusset", quantityPerAssembly: "3" },
    { partNumber: "T01A-ANG-1", description: "Angle", quantityPerAssembly: 5 },
    { partNumber: "T01A-GUS-2", quantityPerAssembly: "" }
  ]);

  assert.equal(quantity, 5);
});
