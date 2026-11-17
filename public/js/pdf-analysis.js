const PURCHASED_ITEM_PATTERN =
  /(?:#\\s*\\d+\\s*)?(?:RH\\s+)?(?:TEK\\s+)?(?:SELF[- ]DRILLING\\s+)?(?:SELF[- ]TAPPING\\s+)?(?:SCREW|BOLT|NUT|WASHER|RIVET|ANCHOR|FASTENER|DOWEL|PIN|CLIP|CONNECTOR|HINGE|MAGNET|GROMMET|INSERT)\\b/i;

const SIZE_PATTERN =
  /#\\s*\\d+|\\b\\d+(?:\\s+\\d+\\/\\d+|\\/\\d+|\\.\\d+)?\\s*(?:["″]|\\b(?:IN|INCH|MM)\\b)/i;

function cleanText(value) {
  return String(value ?? "").replace(/\\s+/g, " ").trim();
}

function getQuantity(text) {
  const match = text.match(/\\b(?:QTY|QUANTITY)\\.?\\s*[:=#-]?\\s*(\\d+(?:\\.\\d+)?)\\b/i)
    || text.match(/\\b(\\d+(?:\\.\\d+)?)\\s*(?:PCS?|EA|EACH)\\b/i);
  return match ? match[1] : "";
}

function getFixtureReference(text, fixtureTag) {
  const escapedTag = String(fixtureTag || "").replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&");
  if (escapedTag) {
    const match = text.match(new RegExp("\\b" + escapedTag + "\\b", "i"));
    if (match) return match[0].toUpperCase();
  }
  const match = text.match(/\\bT\\d{2}[A-Z]?\\b/i);
  return match ? match[0].toUpperCase() : "";
}

function extractCandidateText(line, match) {
  const start = Math.max(0, match.index - 28);
  const end = Math.min(line.length, match.index + Math.max(match[0].length + 72, 88));
  return cleanText(line.slice(start, end)).replace(/^[|,:;\\s]+|[|,:;\\s]+$/g, "");
}

export function analyzeDrawingPages(pages, fixtureTag = "") {
  const safePages = Array.isArray(pages) ? pages : [];
  const byPage = new Map(safePages.map(page => [Number(page.pageNumber), cleanText(page.text)]));

  const pageText = pageNumber => byPage.get(pageNumber) || "";
  const page1 = pageText(1);
  const page2 = pageText(2);
  const page3 = pageText(3);
  const page4 = pageText(4);

  const channelCount = text => (text.match(/\\b(?:CHANNELS?|CHN['’]?L|TROUGHS?)\\b/gi) || []).length;
  const angleCount = text => (text.match(/\\b(?:ANGLES?|ANG)(?=\\b|[-\\s:#])/gi) || []).length;
  const fixtureReference = getFixtureReference(page1, fixtureTag);
  const quantity = getQuantity(page1);

  const pageChecks = [
    {
      pageNumber: 1,
      role: "Fixture data & quantity",
      result: page1
        ? [fixtureReference ? "Fixture " + fixtureReference : "Fixture tag not detected",
           quantity ? "Qty " + quantity : "Quantity not detected"].join(" · ")
        : "Page not available / no extractable text"
    },
    {
      pageNumber: 2,
      role: "Channel data",
      result: page2
        ? channelCount(page2) + " channel / trough keyword occurrence(s)"
        : "Page not available / no extractable text"
    },
    {
      pageNumber: 3,
      role: "Channel data",
      result: page3
        ? channelCount(page3) + " channel / trough keyword occurrence(s)"
        : "Page not available / no extractable text"
    },
    {
      pageNumber: 4,
      role: "Angle data",
      result: page4
        ? angleCount(page4) + " angle keyword occurrence(s)"
        : "Page not available / no extractable text"
    }
  ];

  const purchasedItems = [];
  for (const page of safePages) {
    const pageNumber = Number(page.pageNumber);
    const text = String(page.text || "");
    const lines = text.split(/\\r?\\n/).map(cleanText).filter(Boolean);
    const candidates = lines.length ? lines : [cleanText(text)];
    const seen = new Set();

    for (const line of candidates) {
      const match = PURCHASED_ITEM_PATTERN.exec(line);
      if (!match) continue;
      const description = extractCandidateText(line, match);
      const key = description.toUpperCase().replace(/[^A-Z0-9#]+/g, "");
      if (!description || seen.has(key)) continue;
      seen.add(key);

      const quantityFound = getQuantity(line);
      purchasedItems.push({
        fixtureTag,
        pageNumber,
        description,
        quantity: quantityFound,
        confidence: SIZE_PATTERN.test(description) ? "Higher" : "Possible",
        matchedTerm: match[0].trim(),
        evidence: line.slice(0, 240)
      });
    }
  }

  return {
    fixtureTag,
    pageCount: safePages.length,
    pageChecks,
    purchasedItems
  };
}
