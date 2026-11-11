
import ExcelJS from "exceljs";
import fs from "node:fs/promises";
import path from "node:path";

const files = [
  "test-data/Excel/BOM - PO 4400012611(1) - T01 recessed trough millwork linear profile.xlsx",
  "test-data/Excel/RA-5075 Jul 02-26.xlsx"
];

function simplify(value) {
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    if (value.richText) return value.richText.map(x => x.text).join("");
    if (value.text) return value.text;
    return JSON.stringify(value);
  }
  return value ?? null;
}

async function inspect(file) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);

  const report = {
    file,
    worksheets: []
  };

  for (const ws of workbook.worksheets) {
    const sheet = {
      name: ws.name,
      dimensions: ws.dimensions,
      pageSetup: ws.pageSetup,
      pageMargins: ws.pageMargins,
      views: ws.views,
      headerFooter: ws.headerFooter,
      printArea: ws.pageSetup.printArea,
      merges: [...ws.model.merges || []],
      columns: [],
      rows: [],
      images: ws.getImages().map(img => ({
        imageId: img.imageId,
        range: img.range
      }))
    };

    ws.columns.forEach((col, index) => {
      sheet.columns.push({
        number: index + 1,
        width: col.width,
        hidden: col.hidden
      });
    });

    ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const cells = [];

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (
          cell.value !== null ||
          cell.style?.font ||
          cell.style?.border ||
          cell.style?.fill
        ) {
          cells.push({
            address: cell.address,
            value: simplify(cell.value),
            font: cell.font,
            alignment: cell.alignment,
            border: cell.border,
            fill: cell.fill,
            numFmt: cell.numFmt
          });
        }
      });

      if (cells.length) {
        sheet.rows.push({
          number: rowNumber,
          height: row.height,
          cells
        });
      }
    });

    report.worksheets.push(sheet);
  }

  return report;
}

const reports = [];

for (const file of files) {
  reports.push(await inspect(file));
}

await fs.mkdir("test-data/template-inspection", { recursive: true });

await fs.writeFile(
  "test-data/template-inspection/report.json",
  JSON.stringify(reports, null, 2)
);

console.log("Inspection completed.");
console.log("Report: test-data/template-inspection/report.json");
