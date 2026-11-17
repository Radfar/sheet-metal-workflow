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

function parseDxfUnits(text) {
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  for (let i = 0; i + 3 < lines.length; i++) {
    if (String(lines[i]).trim() !== "9" || String(lines[i + 1]).trim().toUpperCase() !== "$INSUNITS") continue;
    if (String(lines[i + 2]).trim() !== "70") continue;
    const code = Number(String(lines[i + 3]).trim());
    const units = {
      0: { name: "Unitless", toInches: null },
      1: { name: "Inches", toInches: 1 },
      2: { name: "Feet", toInches: 12 },
      4: { name: "Millimeters", toInches: 1 / 25.4 },
      5: { name: "Centimeters", toInches: 1 / 2.54 },
      6: { name: "Meters", toInches: 39.37007874015748 }
    }[code] || { name: "DXF unit code " + code, toInches: null };
    return { code, ...units };
  }
  return { code: null, name: "Unknown", toInches: null };
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

  const units = parseDxfUnits(text);
  return {
    format: "ASCII DXF",
    entityCount: entities.length,
    geometryEntityCount: geometry.length,
    entityTypes: [...new Set(entities.map(entity => entity.type))].sort(),
    extents,
    units
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
      units: { code: null, name: "Unknown", toInches: null },
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

function parsePdfDimensionToken(raw) {
  const value = String(raw || "").trim().replace(/″/g, '"');
  if (!value) return null;

  const mixed = value.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const denominator = Number(mixed[3]);
    if (!denominator) return null;
    return Number(mixed[1]) + Number(mixed[2]) / denominator;
  }

  const fraction = value.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (!denominator) return null;
    return Number(fraction[1]) / denominator;
  }

  const decimal = Number(value);
  return Number.isFinite(decimal) ? decimal : null;
}

function extractPdfDimensions(text) {
  const source = String(text || "").replace(/\r/g, "").replace(/\u00a0/g, " ");
  const values = [];
  const mixedFractionPattern = /\b\d+\s+\d+\/\d+\b/g;
  const fractionPattern = /\b\d+\/\d+\b/g;
  const decimalPattern = /\b\d+(?:\.\d+)\b/g;

  for (const match of source.matchAll(mixedFractionPattern)) {
    const value = parsePdfDimensionToken(match[0]);
    if (value !== null) values.push({ value, raw: match[0], index: match.index });
  }

  for (const match of source.matchAll(fractionPattern)) {
    if (match.index !== undefined && values.some(item => match.index >= item.index && match.index < item.index + item.raw.length)) continue;
    const value = parsePdfDimensionToken(match[0]);
    if (value !== null) values.push({ value, raw: match[0], index: match.index });
  }

  for (const match of source.matchAll(decimalPattern)) {
    if (match.index !== undefined && values.some(item => match.index >= item.index && match.index < item.index + item.raw.length)) continue;
    const value = parsePdfDimensionToken(match[0]);
    if (value !== null) values.push({ value, raw: match[0], index: match.index });
  }

  return values;
}

function pdfContainsDimension(text, value) {
  const target = Number(value);
  return Number.isFinite(target) && extractPdfDimensions(text).some(item => numbersClose(item.value, target, 0.02));
}

function findPdfComponentContexts(pdfPages, componentLabel) {
  const target = String(componentLabel || "").trim().toUpperCase();
  if (!target) return [];

  const targetPattern = target.split(/\s+/).filter(Boolean).join("[\\s_-]*");
  const labelRegex = new RegExp(targetPattern, "ig");
  const contexts = [];

  for (const page of pdfPages || []) {
    const text = String(page.text || "");
    for (const match of text.matchAll(labelRegex)) {
      const index = match.index ?? 0;
      contexts.push({
        pageNumber: Number(page.pageNumber),
        text: text.slice(Math.max(0, index - 500), Math.min(text.length, index + match[0].length + 700))
      });
    }
  }

  return contexts;
}

function pdfComponentDimensionEvidence(pdfPages, componentLabel, value) {
  const target = Number(value);
  if (!Number.isFinite(target)) return { matched: false, pages: [], contextCount: 0 };

  const contexts = findPdfComponentContexts(pdfPages, componentLabel);
  const matches = contexts.filter(context =>
    extractPdfDimensions(context.text).some(item => numbersClose(item.value, target, 0.02))
  );

  return {
    matched: matches.length > 0,
    pages: [...new Set(matches.map(match => match.pageNumber))],
    contextCount: contexts.length
  };
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
    const sources = [component.partNumber, component.description].map(normalize).filter(Boolean);
    if (!sources.length) continue;
    for (const source of sources) {
      const stripped = normalize(source.replace(normalize(fixtureTag), ""));
      if (source === target || stripped === target || targetTokens.every(token => source.includes(token)) || targetTokens.every(token => stripped.includes(token))) {
        return component;
      }
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

    const componentDimensionEvidence = dimensionValues.map(value =>
      pdfComponentDimensionEvidence(pdfPages, dxf.componentLabel, value)
    );
    const dimensionsInComponentPdf = dimensionValues.length === 2 &&
      componentDimensionEvidence.every(evidence => evidence.matched);
    const componentPdfPages = [...new Set(componentDimensionEvidence.flatMap(evidence => evidence.pages))];
    const pdfDimensionDetail = dimensionValues.length === 2
      ? componentDimensionEvidence.map((evidence, index) =>
          (evidence.matched ? "DXF " + dimensionValues[index] + " matched near " + dxf.componentLabel :
            "DXF " + dimensionValues[index] + " was not found near " + dxf.componentLabel) +
          (evidence.pages.length ? " on PDF page(s) " + evidence.pages.join(", ") : "")
        ).join("; ")
      : "PDF component-dimension comparison skipped because DXF filename dimensions are incomplete.";

    fileChecks.push(makeCheck(
      dimensionsInComponentPdf ? "OK" : "ERROR",
      dimensionValues.length === 2
        ? (dimensionsInComponentPdf
            ? "Both DXF filename dimensions match dimensions found in the PDF context for " + dxf.componentLabel + ". " + pdfDimensionDetail
            : "DXF filename dimensions do not match the dimensions found in the PDF context for " + dxf.componentLabel + ". " + pdfDimensionDetail)
        : pdfDimensionDetail
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
    ? new RegExp("\\b(?:QTY|QUANTITY)\\.?\\s*[:=#-]?\\s*" + String(scheduleItem.qty) + "\\b", "i").test(page1)
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
