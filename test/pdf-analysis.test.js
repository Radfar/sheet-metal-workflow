import test from "node:test";
import assert from "node:assert/strict";
import { analyzeDrawingPages } from "../public/js/pdf-analysis.js";

test("finds purchased hardware and retains its source page", () => {
  const result = analyzeDrawingPages([
    { pageNumber: 1, text: "T01A FIXTURE QTY: 2\\n#8 RH Tek Screw x 1/2\\"" },
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
