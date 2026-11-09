import express from "express";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
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
app.use(express.json({ limit: "1mb" }));

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
      ? attempt
      : { count: 0, resetAt: now + 15 * 60 * 1000 };
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

app.get("/api/health", (_req, res) =>
  res.json({
    status: "ok",
    application: "Sheet Metal Workflow",
    version: "0.1.0"
  })
);

if (AUTH_ENABLED) {
  app.use((req, res, next) => {
    if (readSession(req)) return next();
    if (req.path.startsWith("/api/")) {
      return res.status(401).json({ error: "Authentication required." });
    }
    return res.redirect("/login");
  });
}

app.use(express.static(path.join(__dirname, "../public")));

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
      customer = "",
      projectName = "",
      poNumber = "",
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
    const exportDate = new Date();
    const customerProject = [customer.trim(), projectName.trim()]
      .filter(Boolean)
      .join(" - ");

    for (
      let pageStart = 0, page = 1;
      pageStart < components.length;
      pageStart += BOM_ROWS_PER_SHEET, page++
    ) {
      const worksheet = workbook.addWorksheet(page === 1 ? "BOM" : "BOM " + page);

      worksheet.columns = [
        { key: "item", width: 7 },
        { key: "description", width: 14 },
        { key: "c", width: 12 },
        { key: "d", width: 12 },
        { key: "e", width: 12 },
        { key: "f", width: 12 },
        { key: "g", width: 12 },
        { key: "h", width: 12 },
        { key: "i", width: 12 },
        { key: "quantity", width: 12 },
        { key: "total", width: 14 }
      ];

      worksheet.getCell("B8").value = "CUSTOMER:";
      worksheet.getCell("C8").value = customerProject;
      worksheet.getCell("E8").value = "PO #:";
      worksheet.getCell("F8").value = poNumber;
      worksheet.getCell("H8").value = "DATE:";
      worksheet.getCell("I8").value = exportDate;
      worksheet.getCell("I8").numFmt = "mm/dd/yyyy";

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

      for (let i = 0; i < BOM_ROWS_PER_SHEET; i++) {
        const component = components[pageStart + i];
        const rowNumber = 12 + i;
        const quantity = Number(component?.quantityPerAssembly);
        const validQuantity = Number.isFinite(quantity) && quantity >= 0;
        const description =
          component?.description?.trim() ||
          component?.componentLabel?.trim() ||
          component?.originalFilename?.trim() ||
          "";

        worksheet.mergeCells("B" + rowNumber + ":I" + rowNumber);
        worksheet.getCell("A" + rowNumber).value = component ? pageStart + i + 1 : "";
        worksheet.getCell("B" + rowNumber).value = component ? description : "";
        worksheet.getCell("J" + rowNumber).value =
          component && validQuantity && component.quantityPerAssembly !== "" ? quantity : "";

        if (component && fixtureQty > 0 && validQuantity && component.quantityPerAssembly !== "") {
          worksheet.getCell("K" + rowNumber).value = {
            formula: 'IF(OR(J' + rowNumber + '="", $I$9=""), "", J' + rowNumber + '*$I$9)',
            result: quantity * fixtureQty
          };
        } else {
          worksheet.getCell("K" + rowNumber).value = "";
        }

        worksheet.getCell("A" + rowNumber).alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getCell("B" + rowNumber).alignment = { vertical: "top", wrapText: true };
        worksheet.getCell("J" + rowNumber).alignment = { horizontal: "center", vertical: "middle" };
        worksheet.getCell("K" + rowNumber).alignment = { horizontal: "center", vertical: "middle" };

        for (const col of ["A", "B", "J", "K"]) {
          worksheet.getCell(col + rowNumber).border = {
            top: { style: "thin" }, left: { style: "thin" },
            bottom: { style: "thin" }, right: { style: "thin" }
          };
        }
        worksheet.getRow(rowNumber).height = 24;
      }

      for (const cellAddress of ["B8", "E8", "H8", "B9", "E9", "H9", "B10", "B11"]) {
        worksheet.getCell(cellAddress).font = { bold: true };
        worksheet.getCell(cellAddress).alignment = { vertical: "middle", horizontal: "left" };
      }

      for (const cellAddress of ["C8", "F8", "I8", "C9", "F9", "I9", "C10", "C11"]) {
        worksheet.getCell(cellAddress).alignment = {
          vertical: "middle", horizontal: "left", wrapText: true
        };
      }

      for (const rowNumber of [8, 9, 10, 11]) {
        worksheet.getRow(rowNumber).height = rowNumber >= 10 ? 30 : 22;
      }

      worksheet.pageSetup = {
        orientation: "landscape", fitToPage: true,
        fitToWidth: 1, fitToHeight: 1,
        paperSize: worksheet.PAPERSIZE_LETTER
      };
      worksheet.pageSetup.printArea = "A1:K36";
      worksheet.pageSetup.horizontalCentered = false;
      worksheet.views = [{ state: "normal" }];
    }

    const safeFixture = String(fixtureTag || "BOM").replace(/[^a-z0-9_-]+/gi, "_");
    const safeProject = String(projectNumber || projectName || "project").replace(/[^a-z0-9_-]+/gi, "_");
    const filename = "BOM - " + safeProject + " - " + safeFixture + ".xlsx";

    res.setHeader("Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("BOM XLSX export failed:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Could not generate the Excel BOM." });
    }
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Sheet Metal Workflow listening on port " + PORT);
});
