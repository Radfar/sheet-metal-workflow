const HARDWARE_PATTERNS = [
  {
    type: "10-32 RHMS with HEX NYLOK NUT",
    regex: /\b10\s*[-–]?\s*32\s+RHMS\s*x\s*1\/2\s*(?:["″]|IN\b)?\s*C\/W\s+HEX\s+NYLO?C?K\s+NUTS?\b/i
  },
  {
    type: "#8 RH TEK SCREW",
    regex: /#\s*8\s+RH\s+TEK\s+SCREWS?\s*x\s*1\/2\s*(?:["″]|IN\b)?/i
  }
];

const GENERIC_HARDWARE_PATTERN =
  /(?:#\s*\d+\s*)?(?:\d+\s*[-–]\s*\d+\s*)?(?:RHMS|RH|TEK|SELF[- ]DRILLING|SELF[- ]TAPPING)?\s*(?:SCREWS?|BOLTS?|NUTS?|WASHERS?|RIVETS?|ANCHORS?|FASTENERS?|DOWELS?|PINS?|CLIPS?|CONNECTORS?|HINGES?|MAGNETS?|GROMMETS?|INSERTS?)\b/i;

const SIZE_PATTERN =
  /#\s*\d+|\b\d+(?:\s+\d+\/\d+|\/\d+|\.\d+)?\s*(?:["″]|\b(?:IN|INCH|MM)\b)/i;

function normalizePageText(value) {
  return String(value ?? "").replace(/\r/g, "").split("\n")
    .map(line => line.replace(/[ \t]+/g, " ").trim()).filter(Boolean).join("\n");
}

function getFixtureQuantity(text) {
  const match = text.match(/\b(?:QTY|QUANTITY)\.?\s*[:=#-]?\s*(\d+(?:\.\d+)?)\b/i);
  return match ? match[1] : "";
}

function getPurchasedQuantity(text) {
  const match = text.match(/\b\d+(?:\.\d+)?\s*(?:SETS?|PCS?|EA|EACH)\b/i)
    || text.match(/\b(?:QTY|QUANTITY)\.?\s*[:=#-]?\s*\d+(?:\.\d+)?\b/i);
  return match ? match[0].trim() : "";
}

function getFixtureReference(text, fixtureTag) {
  const target = String(fixtureTag || "").trim().toUpperCase();
  if (target && text.toUpperCase().includes(target)) return target;
  const match = text.match(/\bT\d{2}[A-Z]?\b/i);
  return match ? match[0].toUpperCase() : "";
}

function getDrawingFamily(fixtureTag) {
  const match = String(fixtureTag || "").toUpperCase().match(/^T(\d{2})/);
  const number = match ? Number(match[1]) : 0;
  return number >= 8 && number <= 14 ? "T08-T14" : "T01-T07";
}

function countMatches(text, regex) {
  const flags = regex.flags.includes("g") ? regex.flags : regex.flags + "g";
  return [...String(text || "").matchAll(new RegExp(regex.source, flags))].length;
}

function extractCandidatesFromPage(text, pageNumber, fixtureTag) {
  const lines = normalizePageText(text).split("\n");
  const purchasedItems = [];
  const seen = new Set();

  for (let index = 0; index < lines.length; index++) {
    const start = Math.max(0, index - 1);
    const end = Math.min(lines.length, index + 2);
    const context = lines.slice(start, end).join(" ").replace(/\s+/g, " ").trim();
    if (!context) continue;

    let match = null;
    let matchedType = "";
    for (const pattern of HARDWARE_PATTERNS) {
      match = pattern.regex.exec(context);
      if (match) {
        matchedType = pattern.type;
        break;
      }
    }

    if (!match) {
      match = GENERIC_HARDWARE_PATTERN.exec(context);
      if (match) matchedType = "Other purchased hardware";
    }
    if (!match) continue;

    const description = match[0].replace(/\s+/g, " ").trim();
    const key = description.toUpperCase().replace(/[^A-Z0-9#]+/g, "");
    if (!description || seen.has(key)) continue;
    seen.add(key);

    purchasedItems.push({
      fixtureTag,
      pageNumber,
      description,
      itemType: matchedType,
      quantity: getPurchasedQuantity(context),
      confidence: SIZE_PATTERN.test(description) ? "Higher" : "Possible",
      matchedTerm: match[0].trim(),
      evidence: context.slice(0, 320)
    });
  }

  return purchasedItems;
}

function buildPageChecks(pageText, fixtureTag) {
  const family = getDrawingFamily(fixtureTag);
  const pageNumbers = family === "T08-T14"
    ? [
        { pageNumber: 1, role: "Fixture data & quantity" },
        { pageNumber: 3, role: "Channel data" },
        { pageNumber: 4, role: "Channel data" },
        { pageNumber: 5, role: "Channel data" },
        { pageNumber: 6, role: "End cap data" },
        { pageNumber: 7, role: "Angle data" },
        { pageNumber: 2, role: "Hardware references" },
        { pageNumber: 11, role: "Hardware references" }
      ]
    : [
        { pageNumber: 1, role: "Fixture data & quantity" },
        { pageNumber: 2, role: "Channel data" },
        { pageNumber: 3, role: "Channel data" },
        { pageNumber: 4, role: "Angle data" },
        { pageNumber: 6, role: "Purchased-item reference (observed)" }
      ];

  return pageNumbers.map(({ pageNumber, role }) => {
    const text = pageText(pageNumber);
    let result = "Page not available / no extractable text";

    if (text) {
      if (pageNumber === 1) {
        const fixture = getFixtureReference(text, fixtureTag);
        const quantity = getFixtureQuantity(text);
        result = [
          fixture ? "Fixture " + fixture : "Fixture tag not detected",
          quantity ? "Qty " + quantity : "Quantity not detected"
        ].join(" · ");
      } else if (role === "Channel data") {
        const count = countMatches(text, /\b(?:CHANNELS?|CHN['’]?L|TROUGHS?)\b/i);
        result = count + " channel / trough keyword occurrence(s)";
      } else if (role === "Angle data") {
        const count = countMatches(text, /\b(?:ANGLES?|ANG)(?=\b|[-\s:#])/i);
        result = count + " angle keyword occurrence(s)";
      } else if (role === "End cap data") {
        const count = countMatches(text, /\bEND[\s-]?CAPS?\b/i);
        result = count + " end-cap keyword occurrence(s)";
      } else if (role === "Hardware references") {
        const count = HARDWARE_PATTERNS.reduce((sum, pattern) => sum + countMatches(text, pattern.regex), 0);
        result = count + " target hardware callout(s)";
      } else {
        const count = countMatches(text, GENERIC_HARDWARE_PATTERN);
        result = count + " possible hardware keyword occurrence(s)";
      }
    }

    return { pageNumber, role, result };
  });
}

export function analyzeDrawingPages(pages, fixtureTag = "") {
  const safePages = Array.isArray(pages) ? pages : [];
  const byPage = new Map(safePages.map(page => [Number(page.pageNumber), normalizePageText(page.text)]));
  const pageText = pageNumber => byPage.get(pageNumber) || "";
  const pageChecks = buildPageChecks(pageText, fixtureTag);

  const purchasedItems = [];
  for (const page of safePages) {
    purchasedItems.push(
      ...extractCandidatesFromPage(page.text, Number(page.pageNumber), fixtureTag)
    );
  }

  const uniqueItems = [];
  const seen = new Set();
  for (const item of purchasedItems) {
    const key = item.pageNumber + "|" + item.description.toUpperCase().replace(/[^A-Z0-9#]+/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueItems.push(item);
  }

  return {
    fixtureTag,
    drawingFamily: getDrawingFamily(fixtureTag),
    pageCount: safePages.length,
    pageChecks,
    purchasedItems: uniqueItems
  };
}


export function mapPurchasedItemsToBomRows(purchasedItems, gussetQuantity = 0) {
  const normalizedGussetQuantity = Number(gussetQuantity);
  const screwQuantity = Number.isFinite(normalizedGussetQuantity) && normalizedGussetQuantity >= 0
    ? normalizedGussetQuantity * 3
    : "";
  return (Array.isArray(purchasedItems) ? purchasedItems : []).map((candidate, index) => {
    const sourceDescription = String(candidate.description || "").trim();
    const isNylokNut = /\b10\s*[-–]?\s*32\b.*\bHEX\s+NYLO?C?K\s+NUT\b/i.test(sourceDescription);
    const description = isNylokNut
      ? "10-32 HEX NYLOCK NUT (PAINT TO MATCH)"
      : sourceDescription;
    const quantityText = String(candidate.quantity || "");
    const quantityMatch = quantityText.match(/(?:^|\bQTY\.?\s*[:=#-]?\s*)(\d+(?:\.\d+)?)/i);
    const isEightRhTekScrew = /^#\s*8\s+RH\s+TEK\s+SCREWS?\s*x\s*1\s*\/\s*2\b/i.test(sourceDescription);
    return {
      itemNo: "P" + (index + 1),
      purchasedItem: true,
      description,
      quantityPerAssembly: isEightRhTekScrew ? screwQuantity : (quantityMatch ? Number(quantityMatch[1]) : ""),
      pageNumber: candidate.pageNumber,
      confidence: candidate.confidence,
      evidence: candidate.evidence
    };
  }).filter(item => item.description);
}


export function calculateGussetQuantity(components) {
  return (Array.isArray(components) ? components : []).reduce((total, component) => {
    const identity = [component.partNumber, component.description, component.componentType]
      .filter(Boolean).join(" ");
    if (!/GUSSET|\bGUS\b/i.test(identity)) return total;
    const quantity = Number(component.quantityPerAssembly);
    return Number.isFinite(quantity) && quantity >= 0 ? total + quantity : total;
  }, 0);
}
