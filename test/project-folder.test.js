import test from "node:test";
import assert from "node:assert/strict";
import { discoverProjectFixtureEntries } from "../public/js/project-folder.js";

const entry = path => ({ path, file: { name: path.split("/").pop() } });

test("discovers several schedule-matched fixture folders and keeps nested relative paths", () => {
  const entries = [
    entry("Menlo Park/T01A/SolidWorks BOM/T01A.xlsx"),
    entry("Menlo Park/T01A/Drawing PDF/T01A.pdf"),
    entry("Menlo Park/T01A/DXF/part-a.dxf"),
    entry("Menlo Park/T01B/Excel/old-export.xlsx"),
    entry("Menlo Park/T01B/Solid Work BOM/T01B.xls"),
    entry("Menlo Park/T01B/DXF/part-b.dxf"),
    entry("Menlo Park/Unrelated/notes.txt")
  ];
  const found = discoverProjectFixtureEntries(entries, "Menlo Park", ["T01A", "T01B", "T01C"]);
  assert.deepEqual([...found.keys()], ["T01A", "T01B"]);
  assert.equal(found.get("T01A")[0].path, "T01A/SolidWorks BOM/T01A.xlsx");
  assert.equal(found.get("T01B")[0].path, "T01B/Excel/old-export.xlsx");
});

test("matches folder names case-insensitively but returns schedule tag casing", () => {
  const found = discoverProjectFixtureEntries([
    entry("Project/t01a/DXF/part.dxf")
  ], "Project", ["T01A"]);
  assert.equal(found.has("T01A"), true);
  assert.equal(found.get("T01A")[0].path, "T01A/DXF/part.dxf");
});

test("ignores files outside the selected root and non-schedule folders", () => {
  const found = discoverProjectFixtureEntries([
    entry("Other/T01A/DXF/part.dxf"),
    entry("Project/COMMON/DXF/common.dxf"),
    entry("Project/T01A/readme.txt")
  ], "Project", ["T01A"]);
  assert.equal(found.size, 1);
  assert.equal(found.get("T01A").length, 1);
});
