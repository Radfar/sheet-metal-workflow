import ExcelJS from "exceljs";
import fs from "node:fs/promises";

const files = [
  "test-data/Excel/BOM - PO 4400012611(1) - T01 recessed trough millwork linear profile.xlsx",
  "test-data/Excel/RA-5075 Jul 02-26.xlsx"
];

function toPlain(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map(item => toPlain(item, seen));
  }

  const output = {};
  for (const [key, item] of Object.entries(value)) {
    // ExcelJS model objects can link back to their Worksheet and Workbook.
    if (key.startsWith("_") || key === "worksheet" || key === "workbook") continue;
    if (typeof item === "function") continue;
    output[key] = toPlain(item, seen);
  }
  return output;
}

function simplifyCellValue(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return value;
  if (Array.isArray(value.richText)) {
    return value.richText.map(part => part.text ?? "").join("");
  }
  if (value.formula || value.sharedFormula) {
    return {
      formula: value.formula ?? null,
      sharedFormula: value.sharedFormula ?? null,
      result: simplifyCellValue(value.result)
    };
  }
  if (value.hyperlink) {
    return { text: value.text ?? "", hyperlink: value.hyperlink };
  }
  if (value.error) return { error: value.error };
  if (value.text !== undefined) return value.text;
  return toPlain(value);
}

function simplifyImageRange(range) {
  if (!range) return null;
  const anchor = value => value ? {
    col: value.col,
    row: value.row,
    colOff: value.colOff,
    rowOff: value.rowOff
  } : null;

  return {
    tl: anchor(range.tl),
    br: anchor(range.br),
    editAs: range.editAs ?? null
  };
}

async function inspect(file) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);

  const report = { file, worksheets: [] };

  for (const ws of workbook.worksheets) {
    const sheet = {
      name: ws.name,
      dimensions: ws.dimensions,
      pageSetup: toPlain(ws.pageSetup),
      pageMargins: toPlain(ws.pageMargins),
      views: toPlain(ws.views),
      headerFooter: toPlain(ws.headerFooter),
      printArea: ws.pageSetup?.printArea ?? null,
      merges: toPlain(ws.model?.merges ?? []),
      columns: [],
      rows: [],
      images: ws.getImages().map(img => ({
        imageId: img.imageId,
        range: simplifyImageRange(img.range)
      }))
    };

    const columnCount = Math.max(ws.columnCount || 0, ws.actualColumnCount || 0);
    for (let index = 1; index <= columnCount; index++) {
      const col = ws.getColumn(index);
      sheet.columns.push({
        number: index,
        letter: col.letter,
        width: col.width,
        hidden: col.hidden,
        style: toPlain(col.style)
      });
    }

    ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const cells = [];

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const hasRelevantStyle =
          cell.font || cell.alignment || cell.border || cell.fill;
        if (cell.value !== null || hasRelevantStyle) {
          cells.push({
            address: cell.address,
            column: colNumber,
            value: simplifyCellValue(cell.value),
            font: toPlain(cell.font),
            alignment: toPlain(cell.alignment),
            border: toPlain(cell.border),
            fill: toPlain(cell.fill),
            numFmt: cell.numFmt ?? null
          });
        }
      });

      if (cells.length) {
        sheet.rows.push({
          number: rowNumber,
          height: row.height ?? null,
          cells
        });
      }
    });

    report.worksheets.push(sheet);
  }

  return report;
}

const reports = [];
for (const file of files) reports.push(await inspect(file));

await fs.mkdir("test-data/template-inspection", { recursive: true });
await fs.writeFile(
  "test-data/template-inspection/report.json",
  JSON.stringify(reports, null, 2),
  "utf8"
);

console.log("Inspection completed.");
console.log("Report: test-data/template-inspection/report.json");
