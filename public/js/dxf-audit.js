const NUMBER_PATTERN = /\d+(?:\.\d+)?/g;

function normalize(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numbersClose(a, b, tolerance = 0.02) {
  const x = Number(a);
  const y = Number(b);
  return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) <= tolerance;
}

function parseAsciiDxf(text) {
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  const entities = [];
  let section = "";
  let current = null;

  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number(String(lines[i]).trim());
    const value = String(lines[i + 1] ?? "").trim();
    if (!Number.isFinite(code)) continue;

    if (code === 0 && value === "SECTION") {
      const nextCode = Number(String(lines[i + 2] || "").trim());
      const nextValue = String(lines[i + 3] || "").trim();
      if (nextCode === 2) section = nextValue.toUpperCase();
      i += 2;
      continue;
    }
    if (code === 0 && value === "ENDSEC") {
      section = "";
      current = null;
      continue;
    }
    if (section !== "ENTITIES") continue;

    if (code === 0) {
      if (current) entities.push(current);
      current = { type: value.toUpperCase(), points: [] };
      continue;
    }
    if (!current) continue;

    const numeric = Number(value);
    if ([10, 11, 12, 13].includes(code) && Number.isFinite(numeric)) {
      current.points.push({ x: numeric });
    } else if ([20, 21, 22, 23].includes(code) && Number.isFinite(numeric)) {
      const point = current.points[current.points.length - 1];
      if (point) point.y = numeric;
    }
  }
  if (current) entities.push(current);

  const geometry = entities.filter(entity =>
    ["LINE", "LWPOLYLINE", "POLYLINE", "ARC", "CIRCLE", "POINT", "SPLINE", "ELLIPSE"].includes(entity.type)
  );
  const points = geometry.flatMap(entity => entity.points || []).filter(point =>
    Number.isFinite(point.x) && Number.isFinite(point.y)
  );

  const extents = points.length
    ? {
        minX: Math.min(...points.map(point => point.x)),
        maxX: Math.max(...points.map(point => point.x)),
        minY: Math.min(...points.map(point => point.y)),
        maxY: Math.max(...points.map(point => point.y))
      }
    : null;

  return {
    format: "ASCII DXF",
    entityCount: entities.length,
    geometryEntityCount: geometry.length,
    entityTypes: [...new Set(entities.map(entity => entity.type))].sort(),
    extents
  };
}

async function readDxfAudit(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const nulCount = bytes.reduce((count, byte) => count + (byte === 0 ? 1 : 0), 0);
  if (nulCount > 0) {
    return {
      format: "Binary / non-text DXF",
      entityCount: "",
      geometryEntityCount: "",
      entityTypes: [],
      extents: null,
      geometryStatus: "Not parsed",
      warning: "DXF contains binary/null bytes; filename metadata was checked, but geometry was not parsed."
    };
  }

  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const parsed = parseAsciiDxf(text);
  return {
    ...parsed,
    geometryStatus: parsed.geometryEntityCount ? "Parsed" : "No geometry entities detected",
    warning: parsed.geometryEntityCount ? "" : "No supported geometry entities were detected."
  };
}

function extractFilenameDimensions(dxf) {
  return [Number(dxf.flatWidth), Number(dxf.flatHeight)].filter(Number.isFinite);
}

function extractPdfNumbers(text) {
  return String(text || "").match(NUMBER_PATTERN)?.map(Number) || [];
}

function pdfContainsDimension(text, value) {
  const target = Number(value);
  return Number.isFinite(target) && extractPdfNumbers(text).some(number => numbersClose(number, target, 0.02));
}

function pdfContainsLabel(text, label) {
  const source = normalize(text);
  const tokens = normalize(label).split(" ").filter(token => token.length > 1);
  return tokens.length > 0 && tokens.every(token => source.includes(token));
}

function findBomMatch(dxf, bomComponents, fixtureTag) {
  const target = normalize(dxf.componentLabel);
  if (!target) return null;
  const targetTokens = target.split(" ").filter(Boolean);

  for (const component of bomComponents || []) {
    const part = normalize(component.partNumber);
    if (!part) continue;
    const stripped = normalize(part.replace(normalize(fixtureTag), ""));
    if (part === target || stripped === target || targetTokens.every(token => part.includes(token))) {
      return component;
    }
  }
  return null;
}

function makeCheck(status, message) {
  return { status, message };
}

export async function auditDxfFiles(dxfEntries, dxfMetadata, pdfPages, fixtureTag, scheduleItem, bomComponents) {
  const pdfText = (pdfPages || []).map(page => String(page.text || "")).join("\n");
  const page1 = (pdfPages || []).find(page => Number(page.pageNumber) === 1)?.text || "";
  const checks = [];
  const files = [];

  for (let index = 0; index < dxfEntries.length; index++) {
    const entry = dxfEntries[index];
    const dxf = dxfMetadata[index] || {};
    const geometry = await readDxfAudit(entry.file);
    const fileChecks = [];

    const fixtureOk = !dxf.fixtureTag || dxf.fixtureTag === "COMMON" || dxf.fixtureTag === String(fixtureTag).toUpperCase();
    fileChecks.push(makeCheck(
      fixtureOk ? "OK" : "ERROR",
      fixtureOk ? "Fixture tag is consistent with the selected fixture." :
        "DXF filename fixture tag is " + dxf.fixtureTag + ", but the folder fixture is " + fixtureTag + "."
    ));

    fileChecks.push(makeCheck(
      dxf.materialCode ? "OK" : "WARNING",
      dxf.materialCode ? "Material code " + dxf.materialCode + " detected." :
        "Material code C11/C16 was not detected in the DXF filename."
    ));

    const dimensionValues = extractFilenameDimensions(dxf);
    fileChecks.push(makeCheck(
      dimensionValues.length === 2 ? "OK" : "WARNING",
      dimensionValues.length === 2
        ? "Filename flat-pattern size: " + dxf.flatWidth + " × " + dxf.flatHeight
        : "Two filename flat-pattern dimensions were not detected."
    ));

    const labelOk = pdfContainsLabel(pdfText, dxf.componentLabel);
    fileChecks.push(makeCheck(
      labelOk ? "OK" : "WARNING",
      labelOk ? "DXF component identity is represented in the extracted PDF text." :
        "DXF component identity was not clearly found in the extracted PDF text."
    ));

    const pdfDimensionMatches = dimensionValues.map(value => pdfContainsDimension(pdfText, value));
    const dimensionsInPdf = pdfDimensionMatches.length === 2 && pdfDimensionMatches.every(Boolean);
    fileChecks.push(makeCheck(
      dimensionsInPdf ? "OK" : "WARNING",
      dimensionValues.length === 2
        ? (dimensionsInPdf ? "Both DXF filename dimensions were found in the PDF text." :
          "One or both DXF filename dimensions were not found in the PDF text.")
        : "PDF dimension comparison skipped because DXF filename dimensions are incomplete."
    ));

    const bomMatch = findBomMatch(dxf, bomComponents, fixtureTag);
    fileChecks.push(makeCheck(
      bomMatch ? "OK" : "WARNING",
      bomMatch ? "DXF identity can be associated with SolidWorks BOM part " + bomMatch.partNumber + "." :
        "No clear SolidWorks BOM part-number association was found for this DXF."
    ));

    if (geometry.warning) {
      fileChecks.push(makeCheck("WARNING", geometry.warning));
    } else {
      fileChecks.push(makeCheck(
        "OK",
        geometry.geometryEntityCount + " geometry entity/entities parsed; extents " +
        geometry.extents.minX.toFixed(3) + "–" + geometry.extents.maxX.toFixed(3) +
        " × " + geometry.extents.minY.toFixed(3) + "–" + geometry.extents.maxY.toFixed(3) + "."
      ));
    }

    const errors = fileChecks.filter(check => check.status === "ERROR").length;
    const warnings = fileChecks.filter(check => check.status === "WARNING").length;
    files.push({
      filename: dxf.originalFilename,
      componentLabel: dxf.componentLabel,
      materialCode: dxf.materialCode,
      flatWidth: dxf.flatWidth,
      flatHeight: dxf.flatHeight,
      format: geometry.format,
      entityCount: geometry.entityCount,
      geometryEntityCount: geometry.geometryEntityCount,
      overall: errors ? "ERROR" : warnings ? "REVIEW" : "OK",
      checks: fileChecks
    });
  }

  const pdfFixtureMatch = normalize(page1).includes(normalize(fixtureTag));
  const pdfQuantityMatch = scheduleItem
    ? new RegExp("\b(?:QTY|QUANTITY)\.?\s*[:=#-]?\s*" + String(scheduleItem.qty) + "\b", "i").test(page1)
    : false;

  checks.push({
    filename: "PDF ↔ schedule",
    componentLabel: fixtureTag,
    overall: pdfFixtureMatch && pdfQuantityMatch ? "OK" : "REVIEW",
    checks: [
      makeCheck(pdfFixtureMatch ? "OK" : "ERROR",
        pdfFixtureMatch ? "PDF page 1 identifies " + fixtureTag + "." :
        "PDF page 1 does not clearly identify " + fixtureTag + "."),
      makeCheck(pdfQuantityMatch ? "OK" : "ERROR",
        pdfQuantityMatch ? "PDF page 1 quantity matches schedule quantity " + scheduleItem.qty + "." :
        "PDF page 1 quantity does not clearly match schedule quantity " + (scheduleItem?.qty ?? "—") + ".")
    ]
  });

  return {
    fixtureTag,
    dxfCount: dxfEntries.length,
    overall: files.some(file => file.overall === "ERROR") || checks.some(check => check.overall === "ERROR")
      ? "ERROR"
      : files.some(file => file.overall === "REVIEW") || checks.some(check => check.overall === "REVIEW")
        ? "REVIEW"
        : "OK",
    files,
    checks
  };
}
