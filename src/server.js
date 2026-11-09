import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDxfList } from "./parser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3001;

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

app.listen(PORT, () => {
  console.log(`Sheet Metal Workflow running at http://localhost:${PORT}`);
});
