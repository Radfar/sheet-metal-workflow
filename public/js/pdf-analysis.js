const PURCHASED_ITEM_PATTERN =
  /(?:#\s*\d+\s*)?(?:RH\s+)?(?:TEK\s+)?(?:SELF[- ]DRILLING\s+)?(?:SELF[- ]TAPPING\s+)?(?:SCREWS?|BOLTS?|NUTS?|WASHERS?|RIVETS?|ANCHORS?|FASTENERS?|DOWELS?|PINS?|CLIPS?|CONNECTORS?|HINGES?|MAGNETS?|GROMMETS?|INSERTS?)\b/i;

const SIZE_PATTERN =
  /#\s*\d+|\b\d+(?:\s+\d+\/\d+|\/\d+|\.\d+)?\s*(?:["″]|\b(?:IN|INCH|MM)\b)/i;

function normalizePageText(value) {
  return String(value ?? "").replace(/\r/g, "").split("\n")
    .map(line => line.replace(/[ \t]+/g, " ").trim()).filter(Boolean).join("\n");
}

function getQuantity(text) {
  const match = text.match(/\b(?:QTY|QUANTITY)\.?\s*[:=#-]?\s*(\d+(?:\.\d+)?)\b/i)
    || text.match(/\b(\d+(?:\.\d+)?)\s*(?:PCS?|EA|EACH)\b/i);
  return match ? match[1] : "";
}

function getFixtureReference(text, fixtureTag) {
  const target = String(fixtureTag || "").trim().toUpperCase();
  if (target && text.toUpperCase().includes(target)) return target;
  const match = text.match(/\bT\d{2}[A-Z]?\b/i);
  return match ? match[0].toUpperCase() : "";
}

function extractCandidateText(line, match) {
  const start = Math.max(0, match.index - 28);
  const end = Math.min(line.length, match.index + Math.max(match[0].length + 72, 88));
  return line.slice(start, end).replace(/^[|,:;\s]+|[|,:;\s]+$/g, "").trim();
}

export function analyzeDrawingPages(pages, fixtureTag = "") {
  const safePages = Array.isArray(pages) ? pages : [];
  const byPage = new Map(safePages.map(page => [Number(page.pageNumber), normalizePageText(page.text)]));

  const pageText = pageNumber => byPage.get(pageNumber) || "";
  const page1 = pageText(1);
  const page2 = pageText(2);
  const page3 = pageText(3);
  const page4 = pageText(4);

  const channelCount = text => (text.match(/\b(?:CHANNELS?|CHN['’]?L|TROUGHS?)\b/gi) || []).length;
  const angleCount = text => (text.match(/\b(?:ANGLES?|ANG)(?=\b|[-\s:#])/gi) || []).length;
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
    const text = normalizePageText(page.text);
    const lines = text.split("\n");
    const seen = new Set();

    for (const line of lines) {
      const match = PURCHASED_ITEM_PATTERN.exec(line);
      if (!match) continue;
      const description = extractCandidateText(line, match);
      const key = description.toUpperCase().replace(/[^A-Z0-9#]+/g, "");
      if (!description || seen.has(key)) continue;
      seen.add(key);

      purchasedItems.push({
        fixtureTag,
        pageNumber,
        description,
        quantity: getQuantity(line),
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
