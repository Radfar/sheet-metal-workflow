import express from "express";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { parseDxfList } from "./parser.js";
import { buildCuttingListWorkbook } from "./cutting-list.js";

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
const BOM_TEMPLATE_PATH = path.join(__dirname, "../test-data/Excel/BOM - PO 4400012611(1) - T01 recessed trough millwork linear profile.xlsx");

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

function cloneTemplateWorksheet(source, workbook, name) {
  const target = workbook.addWorksheet(name);
  target.properties = structuredClone(source.properties);
  target.pageSetup = structuredClone(source.pageSetup);
  target.views = structuredClone(source.views);
  target.headerFooter = structuredClone(source.headerFooter);

  const columnCount = Math.max(source.columnCount || 0, source.actualColumnCount || 0);
  for (let index = 1; index <= columnCount; index++) {
    const sourceColumn = source.getColumn(index);
    const targetColumn = target.getColumn(index);
    targetColumn.width = sourceColumn.width;
    targetColumn.hidden = sourceColumn.hidden;
    targetColumn.outlineLevel = sourceColumn.outlineLevel;
    targetColumn.style = structuredClone(sourceColumn.style);
  }

  const rowCount = Math.max(source.rowCount || 0, source.actualRowCount || 0);
  for (let rowNumber = 1; rowNumber <= rowCount; rowNumber++) {
    const sourceRow = source.getRow(rowNumber);
    const targetRow = target.getRow(rowNumber);
    targetRow.height = sourceRow.height;
    targetRow.hidden = sourceRow.hidden;
    targetRow.outlineLevel = sourceRow.outlineLevel;
    for (let columnNumber = 1; columnNumber <= columnCount; columnNumber++) {
      const sourceCell = sourceRow.getCell(columnNumber);
      const targetCell = targetRow.getCell(columnNumber);
      targetCell.value = structuredClone(sourceCell.value);
      targetCell.style = structuredClone(sourceCell.style);
      targetCell.protection = structuredClone(sourceCell.protection);
      if (sourceCell.note) targetCell.note = structuredClone(sourceCell.note);
    }
  }

  for (const mergeRange of source.model?.merges || []) {
    target.mergeCells(mergeRange);
  }
  for (const image of source.getImages()) {
    target.addImage(image.imageId, structuredClone(image.range));
  }
  target.pageSetup.printArea = source.pageSetup.printArea;
  return target;
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
      shopFormat = false,
      shipDate = "",
      note = "",
      components = [],
      purchasedItems = []
    } = req.body ?? {};

    if (!Array.isArray(components) || components.length === 0) {
      return res.status(400).json({ error: "No BOM components to export." });
    }
    if (!Array.isArray(purchasedItems)) {
      return res.status(400).json({ error: "Purchased items must be supplied as a list." });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(BOM_TEMPLATE_PATH);
    const templateAssets = await readTemplateAssets();
    const templateWorksheet = workbook.getWorksheet("Sheet1");
    if (!templateWorksheet) {
      throw new Error("The original BOM template is missing its Sheet1 worksheet.");
    }

    // Keep the original BOM form only; auxiliary sheets in the source workbook are not part of this export.
    for (const sheet of [...workbook.worksheets]) {
      if (sheet.id !== templateWorksheet.id) workbook.removeWorksheet(sheet.id);
    }
    templateWorksheet.name = "BOM";

    // The radio-button graphic is a separate saved branding asset, positioned beside the Stellar logo.
    if (!templateAssets.radioButton?.dataUrl) {
      throw new Error("Upload the Radio-button graphic in Project & fixture selection before exporting the BOM.");
    }
    const radioImage = validateImageDataUrl(templateAssets.radioButton.dataUrl);
    const radioImageId = workbook.addImage({
      buffer: Buffer.from(radioImage.dataUrl.split(",")[1], "base64"),
      extension: radioImage.extension
    });
    // ExcelJS anchors are zero-based: G1:K6 corresponds to columns 6–11 and rows 0–6.
    templateWorksheet.addImage(radioImageId, {
      tl: { col: 6, row: 0 },
      br: { col: 11, row: 6 },
      editAs: "oneCell"
    });

    // Arrange BOM items into shop-floor groups while preserving the
    // SolidWorks order within each group:
    // Channels, Angles, Splices, End Caps, Common Parts, then Gussets.
    // Gusset detection has highest priority because its standardized description
    // contains "Chn'l" but Gussets must never be classified as Channels.
    // A null entry represents the intentionally blank separator row.
    const classifyBomGroup = component => {
      const source = [component.partNumber, component.description, component.componentType]
        .filter(Boolean).join(" ").toUpperCase();
      if (/GUSSET|\bGUS\b/i.test(source)) return "gussets";
      if (/SPLICE|SPLICE-PLT/i.test(source)) return "splices";
      if (/END[\s_-]*CAP|\bENDCAP\b/i.test(source)) return "endCaps";
      if (/\bCHANNEL\b|\bCHN['’]?L\b|\bTROUGH\b/i.test(source)) return "channels";
      if (/SHORT[\s_-]*ANG|\bANGLE\b|\bANG\b|[-_]ANG(?:[-_\d]|$)/i.test(source)) return "angles";
      return "common";
    };
    const groupOrder = ["channels", "angles", "splices", "endCaps", "common", "gussets"];
    const groupedComponents = Object.fromEntries(
      groupOrder.map(group => [
        group,
        components.filter(component => classifyBomGroup(component) === group)
      ])
    );
    const bomRows = [];
    groupOrder.forEach(group => {
      if (!groupedComponents[group].length) return;
      if (bomRows.length) bomRows.push(null);
      bomRows.push(...groupedComponents[group]);
    });

    // Append valid PDF-derived purchased items after the fabricated BOM groups.
    // Exactly one blank row separates the purchased section from the last BOM group.
    const purchasedBomRows = purchasedItems.flatMap((item, index) => {
      const description = String(item.description || "").trim();
      if (!description) return [];
      const rawQuantity = item.quantityPerAssembly;
      const hasQuantity = rawQuantity !== "" && rawQuantity !== null && rawQuantity !== undefined;
      const quantity = hasQuantity ? Number(rawQuantity) : "";
      if (hasQuantity && (!Number.isFinite(quantity) || quantity < 0)) {
        throw new Error("Invalid detected quantity for purchased item: " + description);
      }
      return [{
        itemNo: item.itemNo || "P" + (index + 1),
        partNumber: "",
        description,
        quantityPerAssembly: quantity,
        purchasedItem: true
      }];
    });
    if (purchasedBomRows.length) {
      if (bomRows.length) bomRows.push(null);
      bomRows.push(...purchasedBomRows);
    }

    // Preserve as many group separators as the minimum required page count can hold.
    // This uses otherwise-empty rows at the bottom of a page (for example, T08)
    // instead of dropping every separator when the full set would overflow.
    // Actual BOM items always take priority; excess separators are omitted only
    // when necessary to prevent an avoidable additional page.
    const actualBomItemCount = bomRows.filter(Boolean).length;
    const minimumPageCount = Math.max(1, Math.ceil(actualBomItemCount / BOM_ROWS_PER_SHEET));
    const availableSeparatorRows = Math.max(
      0,
      minimumPageCount * BOM_ROWS_PER_SHEET - actualBomItemCount
    );
    let retainedSeparatorRows = 0;
    const printableBomRows = bomRows.filter(row => {
      if (row) return true;
      if (retainedSeparatorRows >= availableSeparatorRows) return false;
      retainedSeparatorRows += 1;
      return true;
    });
    const pageCount = Math.max(1, Math.ceil(printableBomRows.length / BOM_ROWS_PER_SHEET));
    const worksheets = [templateWorksheet];
    for (let page = 2; page <= pageCount; page++) {
      worksheets.push(cloneTemplateWorksheet(templateWorksheet, workbook, "BOM " + page));
    }

    const fixtureQty = Number(fixtureQuantity) || 0;
    const customerProject = [customer.trim(), projectName.trim()].filter(Boolean).join(" - ");
    const exportDate = new Date();
    const normalizedShipDate = /^\d{4}-\d{2}-\d{2}$/.test(String(shipDate))
      ? new Date(String(shipDate) + "T12:00:00")
      : null;

    worksheets.forEach((worksheet, pageIndex) => {
      worksheet.getCell("C8").value = customerProject;
      worksheet.getCell("F8").value = poNumber;
      worksheet.getCell("I8").value = exportDate;
      worksheet.getCell("C9").value = fixtureTag;
      worksheet.getCell("F9").value = projectNumber;
      worksheet.getCell("I9").value = fixtureQty || "";
      worksheet.getCell("C10").value = fixtureDescription;
      worksheet.getCell("C11").value = finish;

      // Clear the sample order's data without touching the template's styles or borders.
      for (let index = 0; index < BOM_ROWS_PER_SHEET; index++) {
        const rowNumber = 12 + index;
        for (const column of [1, 2, 10, 11]) {
          worksheet.getCell(rowNumber, column).value = null;
        }

        // The item-number column is a fixed 1–25 index on every worksheet.
        // It is independent of whether this row contains an item or a blank separator.
        const itemNumberCell = worksheet.getCell(rowNumber, 1);
        itemNumberCell.value = String(index + 1);
        itemNumberCell.font = { ...(itemNumberCell.font || {}), size: 10, bold: true };

        const component = printableBomRows[pageIndex * BOM_ROWS_PER_SHEET + index];
        if (!component) {
          // Preserve the intentional blank row between classified groups.
          // Only the fixed item number remains visible in column A.
          for (const column of [2, 10, 11]) {
            worksheet.getCell(rowNumber, column).value = null;
          }
          continue;
        }

        const hasQuantity = component.quantityPerAssembly !== "" &&
          component.quantityPerAssembly !== null && component.quantityPerAssembly !== undefined;
        const quantity = hasQuantity ? Number(component.quantityPerAssembly) : "";
        if ((!component.purchasedItem && !hasQuantity) ||
            (hasQuantity && (!Number.isFinite(quantity) || quantity < 0))) {
          throw new Error("Invalid BOM quantity for " + (component.partNumber || component.description || "an unnamed component") + ".");
        }

        const descriptionCell = worksheet.getCell(rowNumber, 2);
        // Normalize the data-row font size so the first item matches all
        // subsequent BOM items, without changing bold/italic/font family.
        for (const column of [1, 2, 10, 11]) {
          const cell = worksheet.getCell(rowNumber, column);
          cell.font = { ...(cell.font || {}), size: 10 };
        }
        const description = String(component.description || "").trim();
        const partNumber = String(component.partNumber || "").trim().replace(/^"+|"+$/g, "");

        if (shopFormat && !partNumber && !component.purchasedItem) {
          throw new Error("Missing SolidWorks part number for BOM item " + (component.itemNo || rowNumber - 11) + ".");
        }

        // The SolidWorks BOM may identify this purchased hardware simply as "NUT".
        // Standardize that exact item identity in the exported BOM description.
        const isGenericNut =
          partNumber.toUpperCase() === "NUT" || description.toUpperCase() === "NUT";
        if (isGenericNut) {
          descriptionCell.value = "10-32 HEX NYLOCK NUT (PAINT TO MATCH)";
        } else if (component.purchasedItem) {
          descriptionCell.value = description;
        } else if (shopFormat && partNumber) {
          const baseFont = { ...(descriptionCell.font || {}) };
          const richText = [];
          // Manufacturing suffixes belong after the quoted SolidWorks part number.
          // Keep the suffix as a separate trailing segment so the export order is:
          // description + process + quoted part number + manufacturing suffix.
          const suffixMatch = description.match(/\s*(\(Made in \d+pcs\.\)\s*\([^)]*\))\s*$/i);
          // The project uses one standard channel cross-section:
          // 7 11/16" + 9" + 7 11/16", represented by a flat-pattern width
          // of approximately 24 3/16". Match by channel description and width,
          // not by fixture-specific part-number format.
          const channelDimensionsMatch = description.match(
            /(?:flat\s*pattern\s*)?(\d+(?:\s+\d+\/\d+|\.\d+)?)"\s*[xX]\s*(\d+(?:\s+\d+\/\d+|\.\d+)?)"/i
          );
          const isChannelDescription = /\bCHANNEL\b|\bCHN['’]?L\b/i.test(description);
          const parseDimensionInches = value => {
            const match = String(value || "").trim().match(/^(\d+)(?:\s+(\d+)\/(\d+)|(\.\d+))?$/);
            if (!match) return null;
            if (match[4]) return Number(match[1] + match[4]);
            if (match[2]) return Number(match[1]) + Number(match[2]) / Number(match[3]);
            return Number(match[1]);
          };
          const channelFlatWidth = channelDimensionsMatch
            ? parseDimensionInches(channelDimensionsMatch[2])
            : null;
          const isStandardProfileChannel = Boolean(
            isChannelDescription &&
            channelFlatWidth !== null &&
            Math.abs(channelFlatWidth - 24.1875) <= 0.03 &&
            channelDimensionsMatch &&
            description.match(/\b\d+GA\./i)
          );
          const channelGauge = description.match(/\b\d+GA\./i)?.[0]?.toUpperCase() || "";
          const manufacturingSuffix = isStandardProfileChannel
            ? (suffixMatch ? suffixMatch[1] : "(Made in 1pcs.) (0/0)")
            : suffixMatch ? suffixMatch[1] : "";
          // These named exceptions remain part-number-specific. The channel
          // profile rule above is intentionally applied to every matching channel.
          const descriptionOverrides = {
            "SPLICE-PLT-T": '10 1/4" x 8" 16GA. Plt. (Laser)',
            "MILLWORK-ENDCAP": '7 11/16" x 9" 16GA. Plt. (Laser)',
            "ANGLE-CONNECTION": '1 3/8" x 1 3/8" 16GA. Angle x 5 3/4" (Laser/SM)'
          };
          const standardChannelDescription = isStandardProfileChannel
            ? '7 11/16" X 9" x 7 11/16" ' + channelGauge +
              " Chn'l x " + channelDimensionsMatch[1] + '" (Laser/SM)'
            : null;
          const descriptionBody = standardChannelDescription ??
            descriptionOverrides[partNumber] ??
            (suffixMatch ? description.slice(0, suffixMatch.index).trimEnd() : description);
          const isSplicePlate = partNumber === "SPLICE-PLT-2" ||
            partNumber === "SPLICE-PLT-3" ||
            partNumber === "SPLICE-PLT-T";
          const isGusset = /GUSSET|\bGUS\b/i.test(partNumber) || /\bReturn Gusset\b/i.test(descriptionBody);
          if (descriptionBody && (isSplicePlate || descriptionBody.includes("(Laser/SM)") || descriptionBody.includes("(Laser)"))) {
            const laserMarker = descriptionBody.includes("(Laser/SM)") ? "(Laser/SM)" : "(Laser)";
            const laserIndex = descriptionBody.lastIndexOf(laserMarker);
            if (laserIndex >= 0) {
              const beforeLaser = descriptionBody.slice(0, laserIndex).trimEnd();
              const afterLaser = descriptionBody.slice(laserIndex + laserMarker.length).trim();
              if (beforeLaser) richText.push({ text: beforeLaser + " ", font: baseFont });
              richText.push({ text: laserMarker, font: { ...baseFont, bold: true } });
              if (afterLaser) richText.push({ text: " " + afterLaser + " ", font: baseFont });
            } else {
              richText.push({ text: descriptionBody + " ", font: baseFont });
            }
          } else if (descriptionBody) {
            richText.push({ text: descriptionBody + " ", font: baseFont });
          }
          // Gusset is a standardized common part: its approved description
          // intentionally replaces the SolidWorks part number in the Shop BOM.
          if (!isGusset) {
            richText.push({
              text: (partNumber === "ANGLE-CONNECTION" ? " " : "") + '"' + partNumber + '"',
              font: { ...baseFont, bold: true }
            });
          }
          if (manufacturingSuffix) richText.push({ text: " " + manufacturingSuffix, font: baseFont });
          descriptionCell.value = { richText };
        } else {
          descriptionCell.value = description || String(component.partNumber || "").trim();
        }

        worksheet.getCell(rowNumber, 10).value = hasQuantity ? quantity : null;

        if (fixtureQty > 0 && hasQuantity) {
          worksheet.getCell(rowNumber, 11).value = {
            formula: "J" + rowNumber + "*I9",
            result: quantity * fixtureQty
          };
        }
      }

      // The template's footer labels and ruled areas are retained; populate only supplied data.
      worksheet.getCell("H38").value = normalizedShipDate;
      worksheet.getCell("B39").value = note;
    });

    const safeSegment = value => String(value || "")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .replace(/\s+/g, " ")
      .trim();
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
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || "Could not generate the Excel BOM." });
    }
  }
});

app.post("/api/export-cutting-list-xlsx", async (req, res) => {
  try {
    const templateAssets = await readTemplateAssets();
    const result = await buildCuttingListWorkbook({
      ...(req.body || {}),
      logoAsset: templateAssets.stellarLogo || null
    });
    const filename = result.filename || "Laser Order Request.xlsx";
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');
    res.setHeader("X-Cutting-List-Lines", String(result.lineCount));
    await res.send(result.buffer);
  } catch (error) {
    console.error("Cutting list export failed:", error);
    res.status(400).json({ error: error.message || "Could not generate the Laser Order Request." });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Sheet Metal Workflow listening on port " + PORT);
});
