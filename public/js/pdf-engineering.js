
// PDF engineering extraction utilities.
// This module intentionally returns candidate values with provenance/confidence.
// It does not overwrite authoritative BOM or DXF data.

const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

let pdfjsPromise;

async function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import(PDFJS_URL).then(pdfjsLib => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      return pdfjsLib;
    });
  }
  return pdfjsPromise;
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function unique(values) {
  return [...new Set(values.map(clean).filter(Boolean))];
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return clean(match[1]);
  }
  return "";
}

function confidenceFor(patternType) {
  return {
    explicit: 0.96,
    label: 0.91,
    pattern: 0.82,
    weak: 0.65
  }[patternType] || 0.7;
}

function candidate(value, source, page, confidence, type = "candidate") {
  return {
    value: clean(value),
    source,
    page,
    confidence,
    status: type
  };
}

function buildLines(items) {
  const sorted = [...items]
    .filter(item => clean(item.str))
    .sort((a, b) => {
      const ay = Number(a.y ?? 0);
      const by = Number(b.y ?? 0);
      if (Math.abs(ay - by) > 3) return by - ay;
      return Number(a.x ?? 0) - Number(b.x ?? 0);
    });

  const lines = [];
  for (const item of sorted) {
    const last = lines[lines.length - 1];
    if (!last || Math.abs(Number(last.y) - Number(item.y)) > 3) {
      lines.push({ y: item.y, items: [item] });
    } else {
      last.items.push(item);
    }
  }

  return lines.map(line => ({
    y: line.y,
    items: line.items.sort((a, b) => Number(a.x ?? 0) - Number(b.x ?? 0)),
    text: clean(line.items.map(item => item.str).join(" "))
  }));
}

function detectParts(text, page) {
  const values = [
    ...text.matchAll(/\bT\d{2}[A-Z]?(?:[-_ ](?:A|B|C|ANG(?:LE)?[-_ ]?[A-Z0-9]+|SHORT[-_ ]?ANG(?:LE)?|END[-_ ]?CAP|GUS(?:SET)?|SPLICE[-_ ]?PLT|[A-Z0-9]+))?\b/gi)
  ].map(match => match[0].replace(/\s+/g, " ").trim().toUpperCase());

  return unique(values).map(value => candidate(value, "PDF text pattern", page, confidenceFor("pattern")));
}

function detectDimensions(text, page) {
  const values = [];
  const patterns = [
    /\b\d+(?:\.\d+)?\s*(?:x|×)\s*\d+(?:\.\d+)?(?:\s*(?:x|×)\s*\d+(?:\.\d+)?)?\s*(?:in\.?|")?/gi,
    /\b\d+\s+\d+\/\d+\s*(?:x|×)\s*\d+\s+\d+\/\d+\s*(?:x|×)\s*\d+\s+\d+\/\d+\s*(?:in\.?|")?/gi
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) values.push(clean(match[0]));
  }
  return unique(values).map(value => candidate(value, "PDF dimension pattern", page, confidenceFor("pattern")));
}

function detectBomRows(lines, page) {
  const rows = [];
  for (const line of lines) {
    const text = line.text;
    const match = text.match(/^\s*(\d{1,3})\s+([A-Z0-9][A-Z0-9._/-]{1,})\s+(.+?)\s+(\d+(?:\.\d+)?)\s*$/i);
    if (!match) continue;
    rows.push({
      item: match[1],
      partNumber: match[2],
      description: clean(match[3]),
      quantity: match[4],
      source: "PDF BOM-like row",
      page,
      confidence: 0.72,
      status: "candidate"
    });
  }
  return rows;
}

function detectPageData(pageNumber, lines, items) {
  const text = lines.map(line => line.text).join("\n");
  const fields = [];

  const fieldPatterns = [
    ["projectOrStore", [
      [/(?:project|store)\s*(?:number|#|no\.?)\s*[:=]?\s*([A-Z0-9_-]+)/i, "label"],
      [/\bMenlo\s+Park\s*#?\s*(\d{3,5})\b/i, "pattern"]
    ]],
    ["fixtureTag", [
      [/(?:fixture|type|tag)\s*(?:number|#|no\.?|tag)?\s*[:=]?\s*(T\d{2}[A-Z]?)/i, "label"],
      [/\b(T\d{2}[A-Z]?)\b/i, "pattern"]
    ]],
    ["drawingNumber", [
      [/(?:drawing|dwg(?:\.?|\s+no\.?)|drawing\s+number)\s*[:#=]?\s*([A-Z0-9._/-]+)/i, "label"]
    ]],
    ["revision", [
      [/(?:revision|rev\.?|rev\s*level)\s*[:#=]?\s*([A-Z0-9.-]+)/i, "label"]
    ]],
    ["sheetNumber", [
      [/(?:sheet)\s*(?:number|no\.?)?\s*[:#]?\s*(\d+(?:\s*of\s*\d+)?)/i, "label"]
    ]],
    ["material", [
      [/(?:material|mat' l|matl\.)\s*[:=]\s*([^\n]+)/i, "label"]
    ]],
    ["thickness", [
      [/(?:thickness|thk\.?|gauge|ga\.)\s*[:=]?\s*([^\n]+)/i, "label"]
    ]],
    ["finish", [
      [/(?:finish|surface finish)\s*[:=]\s*([^\n]+)/i, "label"]
    ]],
    ["drawingQuantity", [
      [/(?:drawing\s*)?(?:quantity|qty\.)\s*[:=]?\s*(\d+(?:\.\d+)?)/i, "label"]
    ]]
  ];

  for (const [key, patterns] of fieldPatterns) {
    for (const [pattern, kind] of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        fields.push({
          key,
          ...candidate(match[1], "PDF text / " + key, pageNumber, confidenceFor(kind))
        });
        break;
      }
    }
  }

  const notes = lines
    .filter(line => /^(?:note|notes|general notes?)\b/i.test(line.text) || /\bNOTE\s*:/i.test(line.text))
    .map(line => line.text);

  return {
    pageNumber,
    text,
    items,
    lines,
    fields,
    parts: detectParts(text, pageNumber),
    dimensions: detectDimensions(text, pageNumber),
    bomRows: detectBomRows(lines, pageNumber),
    notes
  };
}

export async function extractPdfEngineeringData(file) {
  if (!file) throw new Error("No PDF file was supplied.");

  const pdfjsLib = await loadPdfJs();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;

  const pages = [];
  const allFields = [];
  const allParts = [];
  const allDimensions = [];
  const allBomRows = [];
  const allNotes = [];
  let fullText = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    const items = content.items
      .map(item => {
        const transform = item.transform || [1, 0, 0, 1, 0, 0];
        return {
          str: item.str || "",
          x: Number(transform[4] || 0),
          y: Number(transform[5] || 0),
          width: Number(item.width || 0),
          height: Number(item.height || Math.abs(transform[3] || 0)),
          fontName: item.fontName || "",
          transform
        };
      })
      .filter(item => clean(item.str));

    const lines = buildLines(items);
    const pageData = detectPageData(pageNumber, lines, items);
    pages.push(pageData);
    fullText += "\n\n--- PAGE " + pageNumber + " ---\n" + pageData.text;
    allFields.push(...pageData.fields);
    allParts.push(...pageData.parts);
    allDimensions.push(...pageData.dimensions);
    allBomRows.push(...pageData.bomRows);
    allNotes.push(...pageData.notes);
  }

  const fieldMap = {};
  for (const field of allFields) {
    if (!fieldMap[field.key]) fieldMap[field.key] = [];
    fieldMap[field.key].push(field);
  }

  return {
    pageCount: pdf.numPages,
    text: fullText.trim(),
    pages,
    fields: fieldMap,
    parts: unique(allParts.map(item => item.value)).map(value => allParts.find(item => item.value === value)),
    dimensions: unique(allDimensions.map(item => item.value)).map(value => allDimensions.find(item => item.value === value)),
    bomRows: allBomRows,
    notes: unique(allNotes),
    extraction: {
      method: "PDF.js text layer with page, line and item coordinates",
      sourceFileName: file.name,
      textItems: pages.reduce((sum, page) => sum + page.items.length, 0),
      lines: pages.reduce((sum, page) => sum + page.lines.length, 0)
    }
  };
}

export function engineeringSummary(data) {
  const first = key => data.fields?.[key]?.[0]?.value || "";
  return [
    ["Fixture tag", first("fixtureTag")],
    ["Project / store", first("projectOrStore")],
    ["Drawing number", first("drawingNumber")],
    ["Revision", first("revision")],
    ["Sheet", first("sheetNumber")],
    ["Material", first("material")],
    ["Thickness / gauge", first("thickness")],
    ["Finish", first("finish")],
    ["Drawing quantity", first("drawingQuantity")],
    ["Parts detected", String(data.parts?.length || 0)],
    ["Dimensions detected", String(data.dimensions?.length || 0)],
    ["BOM-like rows", String(data.bomRows?.length || 0)],
    ["Notes detected", String(data.notes?.length || 0)]
  ];
}
