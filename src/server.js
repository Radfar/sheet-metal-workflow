import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { parseDxfList } from "./parser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3001;
const BOM_ROWS_PER_SHEET = 25;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "../public")));

app.get("/api/health", (_req, res) =>
  res.json({
    status: "ok",
    application: "Sheet Metal Workflow",
    version: "0.1.0"
  })
);

app.post("/api/parse-dxf-list", (req, res) => {
  const { filenames } = req.body ?? {};

  if (typeof filenames !== "string" || !filenames.trim()) {
    return res.status(400).json({
      error: "Provide one DXF filename per line."
    });
  }

  res.json({ components: parseDxfList(filenames) });
});

app.post("/api/export-bom-xlsx", async (req, res) => {
  try {
    const {
      projectName = "",
      projectNumber = "",
      fixtureTag = "",
      fixtureQuantity = "",
      fixtureDescription = "",
      finish = "",
      components = []
    } = req.body ?? {};

    if (!Array.isArray(components) || components.length === 0) {
      return res.status(400).json({ error: "No BOM components to export." });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sheet Metal Workflow";
    workbook.created = new Date();

    const fixtureQty = Number(fixtureQuantity) || 0;

    for (let pageStart = 0, page = 1; pageStart < components.length; pageStart += BOM_ROWS_PER_SHEET, page++) {
      const worksheet = workbook.addWorksheet(page === 1 ? "BOM" : `BOM ${page}`);

      worksheet.columns = [
        { key: "number", width: 7 },
        { key: "description", width: 62 },
        { key: "c", width: 14 },
        { key: "d", width: 14 },
        { key: "e", width: 14 },
        { key: "f", width: 14 },
        { key: "g", width: 14 },
        { key: "h", width: 14 },
        { key: "i", width: 14 },
        { key: "quantity", width: 12 },
        { key: "total", width: 14 }
      ];

      worksheet.getCell("C8").value = projectName;
      worksheet.getCell("I8").value = new Date();
      worksheet.getCell("I8").numFmt = "mm/dd/yyyy";

      worksheet.getCell("F9").value = projectNumber;
      worksheet.getCell("I9").value = fixtureQty;

      worksheet.getCell("C10").value = fixtureDescription;
      worksheet.getCell("C12").value = finish;

      for (let i = 0; i < BOM_ROWS_PER_SHEET; i++) {
        const component = components[pageStart + i];
        const rowNumber = 12 + i;
        const quantity = Number(component?.quantityPerAssembly) || 0;
        const description =
          component?.description?.trim() ||
          component?.componentLabel?.trim() ||
          component?.originalFilename?.trim() ||
          "";

        worksheet.getCell(`A${rowNumber}`).value = component ? pageStart + i + 1 : "";
        worksheet.getCell(`B${rowNumber}`).value = description;
        worksheet.getCell(`J${rowNumber}`).value = component ? quantity : "";
        worksheet.getCell(`K${rowNumber}`).value = component && fixtureQty && quantity ? fixtureQty * quantity : "";

        worksheet.getCell(`A${rowNumber}`).alignment = { horizontal: "center", vertical: "top" };
        worksheet.getCell(`J${rowNumber}`).alignment = { horizontal: "center", vertical: "top" };
        worksheet.getCell(`K${rowNumber}`).alignment = { horizontal: "center", vertical: "top" };
        worksheet.getCell(`B${rowNumber}`).alignment = { vertical: "top", wrapText: true };

        for (const col of ["A", "B", "J", "K"]) {
          worksheet.getCell(`${col}${rowNumber}`).border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" }
          };
        }
      }

      worksheet.getCell("C8").font = { bold: true };
      worksheet.getCell("F9").font = { bold: true };
      worksheet.getCell("I9").font = { bold: true };
      worksheet.getCell("C10").font = { bold: true };
      worksheet.getCell("C12").font = { bold: true };

      worksheet.getCell("I8").alignment = { horizontal: "center" };
      worksheet.getCell("I9").alignment = { horizontal: "center" };

      worksheet.pageSetup = {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        paperSize: worksheet.PAPERSIZE_LETTER
      };
      worksheet.pageSetup.printArea = "A1:K36";
      worksheet.pageSetup.horizontalCentered = false;
      worksheet.views = [{ state: "normal" }];
    }

    const safeFixture = String(fixtureTag || "BOM").replace(/[^a-z0-9_-]+/gi, "_");
    const safeProject = String(projectNumber || projectName || "project").replace(/[^a-z0-9_-]+/gi, "_");
    const filename = `BOM - ${safeProject} - ${safeFixture}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("BOM XLSX export failed:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Could not generate the Excel BOM." });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Sheet Metal Workflow running at http://localhost:${PORT}`);
});
