import express from "express";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { parseDxfList } from "./parser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3001;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const AUTH_USERNAME = process.env.APP_USERNAME;
const AUTH_PASSWORD = process.env.APP_PASSWORD;
const AUTH_SECRET = process.env.AUTH_SECRET;
const AUTH_ENABLED = Boolean(AUTH_USERNAME && AUTH_PASSWORD && AUTH_SECRET);
const SESSION_COOKIE = "smw_session";
const SESSION_DURATION_SECONDS = 12 * 60 * 60;
const BOM_ROWS_PER_SHEET = 25;

if (IS_PRODUCTION && !AUTH_ENABLED) {
  throw new Error("Production requires APP_USERNAME, APP_PASSWORD, and AUTH_SECRET environment variables.");
}
if (AUTH_ENABLED && AUTH_SECRET.length < 32) {
  throw new Error("AUTH_SECRET must contain at least 32 characters.");
}

app.set("trust proxy", 1);
app.use(express.json({ limit: "8mb" }));

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function sign(value) {
  return crypto.createHmac("sha256", AUTH_SECRET).update(value).digest("base64url");
}

function readSession(req) {
  if (!AUTH_ENABLED) return true;
  const cookieHeader = req.headers.cookie || "";
  const cookie = cookieHeader.split(";").map(part => part.trim())
    .find(part => part.startsWith(SESSION_COOKIE + "="));
  if (!cookie) return false;
  const token = decodeURIComponent(cookie.slice(SESSION_COOKIE.length + 1));
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(sign(payload), signature)) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return session.username === AUTH_USERNAME && Number(session.exp) > Date.now();
  } catch {
    return false;
  }
}

function setSessionCookie(res, username) {
  const payload = Buffer.from(JSON.stringify({
    username,
    exp: Date.now() + SESSION_DURATION_SECONDS * 1000
  })).toString("base64url");
  const token = payload + "." + sign(payload);
  res.setHeader("Set-Cookie",
    SESSION_COOKIE + "=" + encodeURIComponent(token) +
    "; HttpOnly; Path=/; SameSite=Strict; Max-Age=" + SESSION_DURATION_SECONDS +
    (IS_PRODUCTION ? "; Secure" : "")
  );
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie",
    SESSION_COOKIE + "=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0" +
    (IS_PRODUCTION ? "; Secure" : "")
  );
}

const loginAttempts = new Map();
app.get("/login", (req, res) => {
  if (!AUTH_ENABLED || readSession(req)) return res.redirect("/");
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "../public/login.html"));
});

app.post("/api/login", (req, res) => {
  if (!AUTH_ENABLED) return res.json({ success: true });
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  if (attempt && now < attempt.resetAt && attempt.count >= 10) {
    return res.status(429).json({ error: "Too many attempts. Please wait 15 minutes and try again." });
  }
  const username = String(req.body?.username || "");
  const password = String(req.body?.password || "");
  if (!safeEqual(username, AUTH_USERNAME) || !safeEqual(password, AUTH_PASSWORD)) {
    const current = attempt && now < attempt.resetAt
      ? attempt : { count: 0, resetAt: now + 15 * 60 * 1000 };
    current.count += 1;
    loginAttempts.set(ip, current);
    return res.status(401).json({ error: "Incorrect username or password." });
  }
  loginAttempts.delete(ip);
  setSessionCookie(res, AUTH_USERNAME);
  res.setHeader("Cache-Control", "no-store");
  res.json({ success: true });
});

app.post("/api/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

app.get("/api/health", (_req, res) => res.json({
  status: "ok",
  application: "Sheet Metal Workflow",
  version: "0.5.0"
}));

if (AUTH_ENABLED) {
  app.use((req, res, next) => {
    if (readSession(req)) return next();
    if (req.path.startsWith("/api/")) return res.status(401).json({ error: "Authentication required." });
    return res.redirect("/login");
  });
}


const DATA_DIR = path.join(__dirname, "../data");
const TEMPLATE_ASSETS_FILE = path.join(DATA_DIR, "template-assets.json");
const TEMPLATE_ASSET_KEYS = new Set(["stellarLogo", "radioButton"]);

async function readTemplateAssets() {
  try {
    return JSON.parse(await fs.readFile(TEMPLATE_ASSETS_FILE, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

function validateImageDataUrl(dataUrl) {
  const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ""));
  if (!match) throw new Error("Image must be a PNG or JPEG file.");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > 2 * 1024 * 1024) {
    throw new Error("Each branding image must be no larger than 2 MB.");
  }
  return { dataUrl: String(dataUrl), extension: match[1] === "jpeg" ? "jpeg" : "png" };
}

app.get("/api/template-assets", async (_req, res) => {
  try {
    const assets = await readTemplateAssets();
    res.setHeader("Cache-Control", "no-store");
    res.json({
      stellarLogo: assets.stellarLogo?.dataUrl || "",
      radioButton: assets.radioButton?.dataUrl || ""
    });
  } catch (error) {
    console.error("Template asset read failed:", error);
    res.status(500).json({ error: "Could not load saved BOM branding images." });
  }
});

app.put("/api/template-assets/:assetName", async (req, res) => {
  try {
    const assetName = req.params.assetName;
    if (!TEMPLATE_ASSET_KEYS.has(assetName)) {
      return res.status(404).json({ error: "Unknown template image." });
    }
    const validated = validateImageDataUrl(req.body?.dataUrl);
    const assets = await readTemplateAssets();
    assets[assetName] = validated;
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(TEMPLATE_ASSETS_FILE, JSON.stringify(assets, null, 2), "utf8");
    res.json({ success: true, assetName });
  } catch (error) {
    res.status(400).json({ error: error.message || "Could not save this image." });
  }
});

app.use(express.static(path.join(__dirname, "../public")));

app.post("/api/parse-dxf-list", (req, res) => {
  const { filenames } = req.body ?? {};
  if (typeof filenames !== "string" || !filenames.trim()) {
    return res.status(400).json({ error: "Provide one DXF filename per line." });
  }
  res.json({ components: parseDxfList(filenames) });
});

function normalizeHeader(value) {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function cellText(value) {
  if (value == null) return "";
  if (typeof value === "object" && value.text != null) return String(value.text).trim();
  if (typeof value === "object" && value.richText) return value.richText.map(part => part.text).join("").trim();
  return String(value).trim();
}

app.post(
  "/api/import-solidworks-bom",
  express.raw({
    type: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream"],
    limit: "10mb"
  }),
  async (req, res) => {
    try {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: "Select a SolidWorks BOM .xls or .xlsx file." });
      }

      // SheetJS reads both legacy BIFF .xls files and modern .xlsx workbooks.
      const workbook = XLSX.read(req.body, { type: "buffer", cellDates: false });
      let headerInfo = null;

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: true });
        for (let rowIndex = 0; rowIndex < Math.min(rows.length, 40); rowIndex++) {
          const headers = {};
          rows[rowIndex].forEach((value, columnIndex) => {
            const key = normalizeHeader(cellText(value));
            if (key) headers[key] = columnIndex;
          });

          const partColumn = headers.PARTNUMBER ?? headers.PARTNO ?? headers.PART;
          const qtyColumn = headers.QTY ?? headers.QUANTITY;
          if (partColumn !== undefined && qtyColumn !== undefined) {
            headerInfo = {
              sheetName,
              rows,
              headerRow: rowIndex,
              partColumn,
              qtyColumn,
              itemColumn: headers.ITEMNO ?? headers.ITEM,
              descriptionColumn: headers.DESCRIPTION ?? headers.DESC
            };
            break;
          }
        }
        if (headerInfo) break;
      }

      if (!headerInfo) {
        return res.status(422).json({
          error: "Could not find the required SolidWorks columns: PART NUMBER and QTY."
        });
      }

      const { sheetName, rows, headerRow, partColumn, qtyColumn, itemColumn, descriptionColumn } = headerInfo;
      const lines = [];
      for (let rowIndex = headerRow + 1; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const partNumber = cellText(row[partColumn]);
        const quantityText = cellText(row[qtyColumn]).replace(/,/g, "");
        if (!partNumber && !quantityText) continue;
        if (!partNumber) continue;
        const quantity = Number(quantityText);
        lines.push({
          itemNo: itemColumn !== undefined ? cellText(row[itemColumn]) : String(lines.length + 1),
          partNumber,
          description: descriptionColumn !== undefined ? cellText(row[descriptionColumn]) : "",
          quantityPerAssembly: Number.isFinite(quantity) ? quantity : ""
        });
      }

      if (!lines.length) {
        return res.status(422).json({ error: "The SolidWorks worksheet contains no component rows." });
      }
      const invalid = lines.filter(line => line.quantityPerAssembly === "" || line.quantityPerAssembly < 0);
      if (invalid.length) {
        return res.status(422).json({
          error: "Some BOM rows have missing or invalid quantities: " +
            invalid.map(line => line.partNumber).join(", ")
        });
      }
      res.json({ components: lines, count: lines.length, worksheet: sheetName });
    } catch (error) {
      console.error("SolidWorks BOM import failed:", error);
      res.status(400).json({ error: "Could not read this Excel file. Please check that it is a valid, unprotected .xls or .xlsx workbook." });
    }
  }
);

app.post("/api/export-bom-xlsx", async (req, res) => {
  try {
    const {
      customer = "",
      projectName = "",
      poNumber = "",
      projectNumber = "",
      fixtureTag = "",
      scheduleRowNumber = "",
      fixtureQuantity = "",
      fixtureDescription = "",
      finish = "",
      bomFilenameDescription = "",
      components = []
    } = req.body ?? {};

    if (!Array.isArray(components) || components.length === 0) {
      return res.status(400).json({ error: "No BOM components to export." });
    }

    const templateAssets = await readTemplateAssets();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sheet Metal Workflow";
    workbook.created = new Date();

    const fixtureQty = Number(fixtureQuantity) || 0;
    const customerProject = [customer.trim(), projectName.trim()].filter(Boolean).join(" - ");

    for (let pageStart = 0, page = 1; pageStart < components.length; pageStart += BOM_ROWS_PER_SHEET, page++) {
      const worksheet = workbook.addWorksheet(page === 1 ? "BOM" : "BOM " + page);
      for (const [assetName, position] of [
        ["stellarLogo", { tl: { col: 0, row: 0 }, br: { col: 4, row: 7 }, editAs: "oneCell" }],
        ["radioButton", { tl: { col: 6, row: 0 }, br: { col: 11, row: 7 }, editAs: "oneCell" }]
      ]) {
        const asset = templateAssets[assetName];
        if (!asset?.dataUrl || !asset?.extension) continue;
        const base64 = asset.dataUrl.split(",")[1];
        const imageId = workbook.addImage({ base64, extension: asset.extension });
        worksheet.addImage(imageId, position);
      }
      // Customer reference layout: Letter portrait, A1:K42, fixed 25-line BOM table.
      worksheet.columns = [
        { key: "item", width: 5.5 },
        { key: "description", width: 10 },
        { key: "c", width: 9 }, { key: "d", width: 9 }, { key: "e", width: 9 },
        { key: "f", width: 9 }, { key: "g", width: 9 }, { key: "h", width: 9 },
        { key: "i", width: 9 }, { key: "quantity", width: 10 }, { key: "total", width: 10 }
      ];

      worksheet.getCell("B8").value = "CUSTOMER:";
      worksheet.getCell("C8").value = customerProject;
      worksheet.getCell("E8").value = "PO #:";
      worksheet.getCell("F8").value = poNumber;
      worksheet.getCell("H8").value = "DATE:";
      worksheet.getCell("I8").value = new Date();
      worksheet.getCell("I8").numFmt = "mmmm d, yyyy";

      worksheet.getCell("B9").value = "UNIT:";
      worksheet.getCell("C9").value = fixtureTag;
      worksheet.getCell("E9").value = "STORE #:";
      worksheet.getCell("F9").value = projectNumber;
      worksheet.getCell("H9").value = "QUANTITY:";
      worksheet.getCell("I9").value = fixtureQty || "";

      worksheet.getCell("B10").value = "FIXTURE:";
      worksheet.mergeCells("C10:K10");
      worksheet.getCell("C10").value = fixtureDescription;
      worksheet.getCell("B11").value = "FINISH:";
      worksheet.mergeCells("C11:K11");
      worksheet.getCell("C11").value = finish;

      const thinBorder = {
        top: { style: "thin" }, left: { style: "thin" },
        bottom: { style: "thin" }, right: { style: "thin" }
      };

      // Fixed 25-row BOM body, matching the customer's form.
      for (let i = 0; i < BOM_ROWS_PER_SHEET; i++) {
        const component = components[pageStart + i];
        const rowNumber = 12 + i;
        const quantity = Number(component?.quantityPerAssembly);
        const validQuantity = Number.isFinite(quantity) && quantity >= 0 &&
          component?.quantityPerAssembly !== "";
        const description = component?.description?.trim() || "";

        for (let colNumber = 1; colNumber <= 11; colNumber++) {
          worksheet.getCell(rowNumber, colNumber).border = thinBorder;
          worksheet.getCell(rowNumber, colNumber).alignment = {
            vertical: "middle", wrapText: true
          };
        }

        worksheet.getCell("A" + rowNumber).value = component
          ? (component.itemNo || String(pageStart + i + 1)) : "";

        worksheet.mergeCells("B" + rowNumber + ":I" + rowNumber);
        worksheet.getCell("B" + rowNumber).value = component ? description : "";

        worksheet.getCell("J" + rowNumber).value =
          component && validQuantity ? quantity : "";

        if (component && fixtureQty > 0 && validQuantity) {
          worksheet.getCell("K" + rowNumber).value = {
            formula: 'IF(OR(J' + rowNumber + '="", $I$9=""), "", J' +
              rowNumber + '*$I$9)',
            result: quantity * fixtureQty
          };
        } else {
          worksheet.getCell("K" + rowNumber).value = "";
        }

        worksheet.getCell("A" + rowNumber).alignment = {
          horizontal: "center", vertical: "middle"
        };
        worksheet.getCell("J" + rowNumber).alignment = {
          horizontal: "center", vertical: "middle"
        };
        worksheet.getCell("K" + rowNumber).alignment = {
          horizontal: "center", vertical: "middle"
        };
        worksheet.getRow(rowNumber).height = 20;
      }

      for (const address of [
        "B8", "E8", "H8", "B9", "E9", "H9", "B10", "B11"
      ]) {
        worksheet.getCell(address).font = { bold: true };
        worksheet.getCell(address).alignment = {
          vertical: "middle", horizontal: "left"
        };
      }

      for (const address of [
        "C8", "F8", "I8", "C9", "F9", "I9", "C10", "C11"
      ]) {
        worksheet.getCell(address).alignment = {
          vertical: "middle", horizontal: "left", wrapText: true
        };
      }

      worksheet.getCell("A38").value = "Finish Date";
      worksheet.getCell("G38").value = "Shift Date";
      worksheet.getCell("K38").value = "Track Number #1";
      worksheet.getCell("A39").value = "Note";
      worksheet.getCell("A42").value = "Cut By";
      worksheet.getCell("H42").value = "Cut Date";

      for (const address of [
        "A38", "G38", "K38", "A39", "A42", "H42"
      ]) {
        worksheet.getCell(address).font = { bold: true };
        worksheet.getCell(address).alignment = {
          vertical: "middle", horizontal: "left"
        };
      }

      for (let rowNumber = 1; rowNumber <= 7; rowNumber++) worksheet.getRow(rowNumber).height = 20;
      for (let rowNumber = 8; rowNumber <= 11; rowNumber++) worksheet.getRow(rowNumber).height = 20;
      worksheet.getRow(37).height = 8;
      for (const rowNumber of [38, 39, 40, 41, 42]) worksheet.getRow(rowNumber).height = 20;

      // Arial 10 throughout the printable form, preserving bold and other font attributes.
      for (let rowNumber = 1; rowNumber <= 42; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        for (let colNumber = 1; colNumber <= 11; colNumber++) {
          const cell = row.getCell(colNumber);
          cell.font = { ...cell.font, name: "Arial", size: 10 };
        }
      }

      worksheet.pageSetup = {
        orientation: "portrait",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        paperSize: worksheet.PAPERSIZE_LETTER,
        margins: {
          left: 0.20, right: 0.16, top: 0.20, bottom: 0.20,
          header: 0.10, footer: 0.10
        },
        horizontalDpi: 300,
        verticalDpi: 300
      };
      worksheet.pageSetup.printArea = "A1:K42";
      worksheet.pageSetup.horizontalCentered = false;
      worksheet.views = [{ state: "normal" }];
    }

    const safeSegment = value => String(value || "").replace(/[<>:"/\\|?*\x00-\x1F]/g, "").replace(/\s+/g, " ").trim();
    const safePo = safeSegment(poNumber) || "TBD";
    const safeRow = safeSegment(scheduleRowNumber);
    const safeTag = safeSegment(fixtureTag) || "Fixture";
    const safeDescription = safeSegment(bomFilenameDescription);
    const filename = "BOM - PO " + safePo + (safeRow ? "(" + safeRow + ")" : "") +
      " - " + safeTag + (safeDescription ? " " + safeDescription : "") + ".xlsx";
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("BOM XLSX export failed:", error);
    if (!res.headersSent) res.status(500).json({ error: "Could not generate the Excel BOM." });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Sheet Metal Workflow listening on port " + PORT);
});
