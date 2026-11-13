import { discoverProjectFixtureEntries } from "./project-folder.js";
const $ = id => document.getElementById(id);

let components = [];
let bomLines = [];
let dxfFiles = [];
let currentFixtureTag = "";
let drawingText = "";
const fixtureData = {};
let templateAssets = { stellarLogo: "", radioButton: "" };
let selectedFixtureFolderEntries = null;
let selectedFixtureFolderName = "";
let selectedProjectRootName = "";
let importedProjectTags = [];


function makeBomFilename() {
  const clean = value => String(value || "").replace(/[<>:"/\\|?*\x00-\x1F]/g, "").replace(/\s+/g, " ").trim();
  const selected = schedule.find(item => item.tag === $("fixtureTag").value);
  const po = clean($("poNumber").value) || "TBD";
  const scheduleRow = selected ? selected.no : "";
  const tag = clean($("fixtureTag").value) || "Fixture";
  const description = clean($("bomFilenameDescription").value);
  return "BOM - PO " + po + (scheduleRow ? "(" + scheduleRow + ")" : "") + " - " +
    tag + (description ? " " + description : "") + ".xlsx";
}

const schedule = [
  {no:1,tag:"T01A",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'365"',finish:"M-12 EA",qty:2},
  {no:2,tag:"T01B",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'365"',finish:"M-12 EA",qty:3},
  {no:3,tag:"T01C",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'365"',finish:"M-12 EA",qty:2},
  {no:4,tag:"T02A",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'238"',finish:"M-12 EA",qty:4},
  {no:5,tag:"T02B",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'238"',finish:"M-12 EA",qty:3},
  {no:6,tag:"T03A",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'240"',finish:"M-12 EA",qty:4},
  {no:7,tag:"T03B",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'240"',finish:"M-12 EA",qty:2},
  {no:8,tag:"T03C",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'240"',finish:"M-12 EA",qty:1},
  {no:9,tag:"T04A",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'297"',finish:"M-12 EA",qty:4},
  {no:10,tag:"T04B",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'297"',finish:"M-12 EA",qty:3},
  {no:11,tag:"T05A",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'481"',finish:"M-12 EA",qty:1},
  {no:12,tag:"T05B",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'481"',finish:"M-12 EA",qty:2},
  {no:13,tag:"T06",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'110"',finish:"M-12 EA",qty:1},
  {no:14,tag:"T07",mounting:"Recessed in GWB ceiling",height:"N/A",profile:"Linear",width:'9"',length:'307"',finish:"M-12 EA",qty:1},
  {no:15,tag:"T08",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'191"',length:'221"',finish:"M-12 EA",qty:1},
  {no:16,tag:"T09A",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'180"',length:'221"',finish:"M-12 EA",qty:1},
  {no:17,tag:"T09B",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'180"',length:'221"',finish:"M-12 EA",qty:1},
  {no:18,tag:"T10",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'221"',length:'136"',finish:"M-12 EA",qty:1},
  {no:19,tag:"T11",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'177"',length:'221"',finish:"M-12 EA",qty:1},
  {no:20,tag:"T12",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'158"',length:'206"',finish:"M-12 EA",qty:1},
  {no:21,tag:"T13A",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'149"',length:'206"',finish:"M-12 EA",qty:1},
  {no:22,tag:"T13B",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'149"',length:'206"',finish:"M-12 EA",qty:1},
  {no:23,tag:"T13C",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'149"',length:'206"',finish:"M-12 EA",qty:1},
  {no:24,tag:"T14",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"8",width:'154"',length:'206"',finish:"M-12 EA",qty:1},
  {no:25,tag:"T15",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"Linear",width:'5"',length:'479"',finish:"M-12 EA",qty:1},
  {no:26,tag:"T16",mounting:"Recessed in millwork ceiling",height:"N/A",profile:"Linear",width:'5"',length:'203"',finish:"M-12 EA",qty:2},
  {no:27,tag:"T17",mounting:"Recessed in brick wall",height:"N/A",profile:"Linear",width:'4"',length:'48"',finish:"M-12 EK",qty:10}
];

const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[char]));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizePart(value, fixtureTag) {
  let text = String(value || "").toUpperCase().trim();
  if (fixtureTag && text.startsWith(fixtureTag.toUpperCase())) {
    text = text.slice(fixtureTag.length);
  }
  text = text.replace(/REMOVABLE[\s_-]*GUSSET/g, "GUS");
  text = text.replace(/\bTROUGH\b/g, "");
  return text.replace(/[^A-Z0-9]/g, "");
}

function normalizePartTokens(value, fixtureTag) {
  let text = String(value || "").toUpperCase().trim();
  if (fixtureTag && text.startsWith(fixtureTag.toUpperCase())) {
    text = text.slice(fixtureTag.length);
  }
  text = text.replace(/REMOVABLE[\s_-]*GUSSET/g, "GUS");
  text = text.replace(/\bTROUGH\b/g, "");
  return text
    .split(/[^A-Z0-9]+/)
    .map(token => token.trim())
    .filter(Boolean);
}

function matchDxfIndex(partNumber, files, fixtureTag) {
  const target = normalizePart(partNumber, fixtureTag);
  const targetTokens = normalizePartTokens(partNumber, fixtureTag);
  if (!target || !targetTokens.length) return "";

  let bestIndex = -1;
  let bestScore = 0;

  files.forEach((file, index) => {
    const candidate = normalizePart(file.componentLabel, fixtureTag);
    const candidateTokens = normalizePartTokens(file.componentLabel, fixtureTag);
    if (!candidate || !candidateTokens.length) return;

    let score = 0;

    // Exact normalized identity remains the strongest match.
    if (candidate === target) {
      score = 100;
    // A BOM part such as T01A-A must match the first meaningful DXF suffix
    // token A, not a different token such as ANG from "ANG 1".
    } else if (
      candidateTokens.length >= targetTokens.length &&
      targetTokens.every((token, tokenIndex) => candidateTokens[tokenIndex] === token)
    ) {
      score = 95;
    // Preserve useful legacy matching for multi-token names, but only after
    // token-prefix matching has been considered.
    } else if (candidate.startsWith(target) || target.startsWith(candidate)) {
      score = 70;
    } else if (candidate.includes(target) || target.includes(candidate)) {
      score = 50;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestScore >= 70 ? bestIndex : "";
}
function inferredComponentType(component, matchedDxf = null) {
  const source = [component.partNumber, component.description, matchedDxf?.componentLabel].filter(Boolean).join(" ").toUpperCase();
  if (/SHORT[\\s_-]*ANG/.test(source)) return "Angle";
  if (/\\bANG(?:LE)?\\b|[-_]ANG[-_\\d]/.test(source)) return "Angle";
  if (/CHN|CHANNEL|TROUGH/.test(source)) return "Channel";
  if (/END[\\s_-]*CAP|ENDCAP|SPLICE[\\s_-]*PLT|\\bPLT\\b|PLATE/.test(source)) return "Plate";
  if (/GUSSET|\\bGUS\\b/.test(source)) return "Gusset";
  return component.componentType || "";
}

function inferredComponentName(component, matchedDxf = null) {
  const source = [component.partNumber, component.description, matchedDxf?.componentLabel].filter(Boolean).join(" ").toUpperCase();
  if (/SHORT[\\s_-]*ANG/.test(source)) return "Short angle";
  if (/END[\\s_-]*CAP|ENDCAP/.test(source)) return "End cap";
  if (/SPLICE[\\s_-]*PLT|SPLICE[\\s_-]*PLATE/.test(source)) return "Splice plate";
  if (/GUSSET|\\bGUS\\b/.test(source)) return "Return gusset";
  if (/CHN|CHANNEL|TROUGH/.test(source)) return "Channel";
  if (/[-_]ANG(?:[-_\\d]|$)|\\bANGLE\\b/.test(source)) return "Angle";
  if (/PLT|PLATE/.test(source)) return "Plate";
  return "Component";
}

function appendDxfDetails(description, component, matchedDxf) {
  const width = String(component.flatPatternWidth || matchedDxf?.flatWidth || "").trim();
  const height = String(component.flatPatternHeight || matchedDxf?.flatHeight || "").trim();
  const materialCode = String(component.materialCode || matchedDxf?.materialCode || "").trim();
  const details = [];
  if (width && height) details.push("Flat pattern " + width + " × " + height + " in");
  if (materialCode) details.push("Material code " + materialCode);
  return details.length ? description + " — " + details.join(" — ") : description;
}

function buildShopBomDescription(component, matchedDxf = null) {
  const value = key => String(component[key] ?? "").trim();
  const type = value("componentType") || inferredComponentType(component, matchedDxf);
  const gauge = value("gauge");
  const process = value("manufacturingProcess");
  const partId = value("partIdentification") || value("partNumber");
  const partToken = partId ? '"' + partId + '"' : "";
  let base = "";

  if (type === "Angle" || type === "Channel") {
    const dimensions = value("crossSectionDimensions");
    const profile = type === "Channel" ? "Chn'l" : "Angle";
    if (dimensions || gauge || value("overallLength")) {
      base = [dimensions, gauge, profile,
        value("overallLength") ? "x " + value("overallLength") : "",
        process ? "(" + process + ")" : "", partToken].filter(Boolean).join(" ");
    }
  } else if (type === "Plate") {
    const dimensions = [value("plateLength"), value("plateWidth")].filter(Boolean).join(" x ");
    if (dimensions || gauge) {
      base = [dimensions, gauge, "Plt.", process ? "(" + process + ")" : "", partToken]
        .filter(Boolean).join(" ");
    }
  } else if (type === "Gusset") {
    if (value("geometryDimensions") || gauge || value("additionalDimensions")) {
      base = [value("geometryDimensions"), gauge, value("profileType"),
        value("additionalDimensions") ? "x " + value("additionalDimensions") : "",
        "Return Gusset", process ? "(" + process + ")" : "", partToken]
        .filter(Boolean).join(" ");
    }
  } else if (type === "Purchased hardware") {
    base = [value("hardwareSize"), value("hardwareType"),
      value("hardwareLength") ? "x " + value("hardwareLength") : ""].filter(Boolean).join(" ");
  } else if (type) {
    const dimensions = value("geometryDimensions");
    if (dimensions || gauge || value("overallLength")) {
      base = [dimensions, gauge, type,
        value("overallLength") ? "x " + value("overallLength") : "",
        process ? "(" + process + ")" : "", partToken].filter(Boolean).join(" ");
    }
  }

  if (!base) {
    const partNumber = value("partNumber") || value("partIdentification");
    base = inferredComponentName(component, matchedDxf) + (partNumber ? " " + partNumber : "") +
      (process ? " (" + process + ")" : "");
  }
  return { description: appendDxfDetails(base, component, matchedDxf), missing: [] };
}

function makeDraftDescription(component, matchedDxf) {
  return buildShopBomDescription(component, matchedDxf).description;
}

// Format verified engineering dimensions for the historical shop description.
// This is presentation-only: it never reads DXF flat-pattern dimensions.
function formatShopDimension(value) {
  let raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/["″]$/.test(raw)) raw = raw.slice(0, -1).trim();

  // Convert decimal inch values only when exactly representable to 1/16 in.
  // Otherwise preserve the entered precision.
  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const number = Number(raw);
    if (Number.isFinite(number)) {
      let whole = Math.floor(number);
      const fraction = number - whole;
      const sixteenths = Math.round(fraction * 16);
      if (Math.abs(fraction - sixteenths / 16) < 1e-7) {
        if (sixteenths === 16) whole += 1;
        const numerator = sixteenths === 16 ? 0 : sixteenths;
        const gcd = (a, b) => b ? gcd(b, a % b) : a;
        const divisor = numerator ? gcd(numerator, 16) : 16;
        const fractionText = numerator ? (numerator / divisor) + "/" + (16 / divisor) : "";
        raw = [whole || "", fractionText].filter(Boolean).join(" ");
        if (!raw) raw = "0";
      }
    }
  }
  return raw + '"';
}

function formatShopDimensionSequence(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw.split(/(\s*[xX&]\s*)/).map(part => {
    if (/^[\s]*[xX][\s]*$/.test(part)) return " x ";
    if (/^[\s]*&[\s]*$/.test(part)) return " & ";
    return formatShopDimension(part);
  }).join("").trim();
}

function quoteShopPartId(value) {
  const partId = String(value ?? "").trim().replace(/^"+|"+$/g, "");
  return partId ? '"' + partId + '"' : "";
}

// Shop-format export is a presentation-only rearrangement of the existing
// DXF-based BOM description. Keep every existing text segment unchanged;
// move the DXF-derived details (flat-pattern dimensions/material code) before
// the component identity. Do not derive or add manufacturing information.
function formatShopInchDimension(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return value;
  const sixteenths = Math.round(numericValue * 16);
  const whole = Math.floor(sixteenths / 16);
  let numerator = sixteenths % 16;
  if (numerator === 0) return String(whole);
  let denominator = 16;
  while (numerator % 2 === 0) {
    numerator /= 2;
    denominator /= 2;
  }
  const fraction = numerator + "/" + denominator;
  return whole > 0 ? whole + " " + fraction : fraction;
}
function convertShopInchDimensions(description) {
  let result = description.replace(
    /(\d+(?:\.\d+)?)\s*([×x])\s*(\d+(?:\.\d+)?)\s*in\b/gi,
    (_match, first, separator, second) =>
      formatShopInchDimension(first) + '"' + " x " +
      formatShopInchDimension(second) + '"'
  );
  result = result.replace(/(\d+\.\d+)\s*in\b/gi,
    (_match, value) => formatShopInchDimension(value) + '"');
  return result;
}
function buildShopStandardExportDescription(component) {
  const existingDescription = String(component.description ?? "").trim();
  const segments = existingDescription.split(/\s+—\s+/).map(segment => segment.trim()).filter(Boolean);
  const identity = segments.length > 1 ? segments.shift() : "";
  let description = segments.join(" ")
    .replace(/Material code\s+C16\b/gi, "16GA.")
    .replace(/Material code\s+C11\b/gi, "11GA.")
    .replace(/\bchannel\b/gi, "Chn'l")
    .replace(/\s+/g, " ").trim();

  const partNumber = String(component.partNumber ?? "").trim().replace(/^"+|"+$/g, "");
  description = convertShopInchDimensions(description);

  if (partNumber === "SPLICE-PLT-2" || partNumber === "SPLICE-PLT-3") {
    description = description.replace(/\bFlat pattern\b/gi, "")
      .replace(/\bPlate\b/gi, "").replace(/\bSplice\b/gi, "")
      .replace(/\s+/g, " ").trim();
    description = description.replace(partNumber, "").replace(/\s+/g, " ").trim();
    const gauge = description.match(/\b(?:16|11)GA\./i)?.[0] || "";
    const dimensions = gauge ? description.replace(gauge, "").trim() : description;
    description = [dimensions, gauge, "Plt.", "(Laser)", "Splice"].filter(Boolean).join(" ");
  } else {
    const identitySource = identity + " " + partNumber;
    const isEndcap = /END[\s_-]*CAP|ENDCAP/i.test(identitySource);
    const isGusset = /GUSSET|\bGUS\b/i.test(identitySource);
    const isShortAngle = /SHORT[\s_-]*ANG/i.test(partNumber) || /SHORT[\s_-]*ANGLE/i.test(identity);
    // Apply the trough-section shop format across fixture tags, not only T01A.
    // Require a fixture-style part ID and a source channel/trough descriptor
    // so ordinary channel components keep their existing generic format.
    const troughSource = identitySource + " " + description;
    const isFixtureTroughPart = /^T\d+[A-Z]?-[A-Z]$/i.test(partNumber) &&
      /\bTROUGH\b|\bCHANNEL\b|\bCHN'L\b/i.test(troughSource);
    const isTroughSection = isFixtureTroughPart || /\bTROUGH\s+SECTION\b/i.test(troughSource);

    if (isEndcap || isGusset || isShortAngle || isTroughSection) {
      let name = identity;
      if (isEndcap) {
        name = name.replace(/\s+ENDCAP\s*$/i, "").replace(/\s+/g, " ").trim();
      } else if (isGusset) {
        name = name.replace(/\s+REMOVABLE[-_ ]GUSSET\s*$/i, "")
          .replace(/\bReturn\s+gusset\b/gi, "Gusset").replace(/\s+/g, " ").trim();
      } else if (isShortAngle) {
        // The shop name is only "Short Angle"; the SolidWorks part number is
        // appended separately in bold by the Excel exporter.
        name = "Short Angle";
      } else if (isTroughSection) {
        // The approved shop identity is always "Trough section".
        // The SolidWorks part number is appended separately in bold by the
        // Excel exporter, so it must not be repeated in the description.
        name = "Trough section";
      }

      description = description.replace(/\bFlat pattern\b/gi, "")
        .replace(/\b(?:Chn'l|Channel)\b/gi, "")
        .replace(/\s*\(Laser(?:\/SM)?\)\s*/gi, " ")
        .replace(/\s+/g, " ").trim();
      const gauge = description.match(/\b(?:16|11)GA\./i)?.[0] || "";
      const dimensions = gauge ? description.replace(gauge, "").trim() : description;

      if (isEndcap) {
        description = [dimensions, gauge, "Plt.", "(Laser)", name].filter(Boolean).join(" ");
      } else if (isGusset) {
        description = [dimensions, gauge, "Chn'l", "(Laser/SM)", name].filter(Boolean).join(" ");
      } else if (isShortAngle) {
        description = [dimensions, gauge, "(Laser/SM)", name].filter(Boolean).join(" ");
      } else {
        description = [dimensions, gauge, "(Laser/SM)", name].filter(Boolean).join(" ");
      }
    } else {
      const sourceIdentity = description + " " + identity + " " + partNumber;
      const isAngle = /\bAngle\b|\bANG\b|[-_]ANG(?:[-_\d]|$)/i.test(sourceIdentity);
      const isChannel = /\bChn'l\b/i.test(sourceIdentity);
      const isT01AAngle = /^T01A-ANG-[123]$/i.test(partNumber);
      if (isAngle) {
        description = description.replace(/\bFlat pattern\b/gi, "")
          .replace(/\bAngle\b/gi, "").replace(/\bANG\b(?![-_]\d)/gi, "")
          .replace(/\s+/g, " ").trim();
        const gaugeMatch = description.match(/\b\d+GA\./i);
        if (gaugeMatch) {
          const gauge = gaugeMatch[0];
          description = description.replace(gauge, gauge + " Angle");
        }
        if (isT01AAngle) {
          description = description + " (Laser/SM)";
        } else {
          const angleIdentity = identity.replace(/^\s*Angle\s*/i, "").trim();
          if (angleIdentity) description = [description, angleIdentity].filter(Boolean).join(" ");
        }
      } else if (isChannel) {
        description = description.replace(/\bFlat pattern\b/gi, "");
        if (identity) description = [description, identity].filter(Boolean).join(" ");
      } else if (identity) {
        description = [description, identity].filter(Boolean).join(" ");
      }
    }
  }
  return description.replace(/\s+/g, " ").trim();
}
const MANUFACTURING_FIELDS = [["componentType","Component type","select"],["materialCode","Material code","text"],["cuttingListIdentity","Approved common DXF identity / filename","text"],["materialGrade","Material / grade","text"],["gauge","Thickness / gauge","text"],["cuttingListFinish","Laser order finish (optional)","text"],["crossSectionDimensions","Cross-section dimensions","text"],["geometryDimensions","Geometry dimensions","text"],["profileType","Profile type","text"],["additionalDimensions","Additional dimensions","text"],["overallLength","Overall finished length","text"],["plateLength","Plate length","text"],["plateWidth","Plate width","text"],["flatPatternWidth","Flat-pattern width","text"],["flatPatternHeight","Flat-pattern height","text"],["manufacturingProcess","Manufacturing process","text"],["partIdentification","Part identification on drawing","text"],["pieceCount","Number of fabricated pieces","text"],["pieceLengths","Individual piece lengths (comma or / separated)","text"],["hardwareSize","Hardware size","text"],["hardwareType","Hardware type / specification","text"],["hardwareLength","Hardware length","text"],["drawingReference","Drawing / detail reference","text"],["manufacturingNotes","Manufacturing notes","text"]];

function engineeringExample(key, component) {
  const part = String(component.partNumber || "").toUpperCase();
  const matchedDxf = component.dxfIndex === "" || component.dxfIndex == null
    ? null : dxfFiles[Number(component.dxfIndex)];
  const identity = part + " " + String(matchedDxf?.componentLabel || "").toUpperCase();
  const isChannel = /TROUGH|CHANNEL|CHN/.test(identity);
  const isAngle = /ANG/.test(identity);
  const isPlate = /ENDCAP|SPLICE|PLT/.test(identity);
  const isGusset = /GUS/.test(identity);
  const examples = {
    cuttingListIdentity: "Use the same approved common DXF filename/key only when source DXFs are confirmed identical.",
    componentType: isChannel ? "Suggested type: Channel — verify" : isAngle ? "Suggested type: Angle — verify" : isPlate ? "Suggested type: Plate — verify" : isGusset ? "Suggested type: Gusset — verify" : "Select the type shown on the drawing",
    materialCode: "e.g. C11 or C16 (DXF token only)",
    cuttingListIdentity: "Optional: enter the same approved common DXF filename/key only when different fixture DXFs are confirmed identical.",
    materialGrade: "Enter the full material callout from the drawing",
    gauge: "e.g. 16GA. or 11GA. — verify on drawing",
    cuttingListFinish: "Leave blank unless the laser order line has a specific finish.",
    crossSectionDimensions: isAngle ? 'e.g. 1" x 1 3/8"' : 'e.g. 7 11/16" x 9" x 7 11/16"',
    geometryDimensions: 'e.g. 1 3/4" x 8 13/16" x 1 3/4"',
    profileType: "e.g. Chn'l",
    additionalDimensions: 'e.g. 6 1/16" & 1 3/4"',
    overallLength: isAngle ? 'e.g. 78 7/8" or 11 3/4"' : 'e.g. 77 7/16" or 141 7/8"',
    plateLength: isPlate ? 'e.g. 7 11/16"' : 'e.g. 2"',
    plateWidth: isPlate ? 'e.g. 9"' : 'e.g. 8"',
    flatPatternWidth: "Copied from matched DXF when available",
    flatPatternHeight: "Copied from matched DXF when available",
    manufacturingProcess: isPlate ? "e.g. Laser" : "e.g. Laser/SM — confirm process",
    partIdentification: "e.g. T02-A, T02-ANG-L/H or ENDCAP",
    pieceCount: "e.g. 2 (only if made in multiple pieces)",
    pieceLengths: "e.g. 99.9375 / 41.9375 (inches)",
    hardwareSize: "e.g. #8",
    hardwareType: "e.g. RH Tek Screw",
    hardwareLength: 'e.g. 1/2"',
    drawingReference: "e.g. sheet / detail / drawing number",
    manufacturingNotes: "e.g. return, orientation, weld or assembly note"
  };
  return examples[key] || "Enter verified drawing value";
}

function renderManufacturingFields(component, index) {
  const typeOptions = ["", "Channel", "Angle", "Plate", "Gusset", "Purchased hardware", "Other"];
  return '<tr class="engineering-row" data-component-index="' + index + '"><td colspan="8"><details class="engineering-details"><summary>Manufacturing data — enter or verify engineering values</summary>' +
    '<p class="engineering-guidance">Examples are prompts only, based on the earlier BOM format. Enter values from the current fixture drawing; do not copy an example unless it applies.</p>' +
    '<div class="engineering-grid">' + MANUFACTURING_FIELDS.map(([key, label, kind]) => {
      const value = component[key] ?? "";
      if (key === "componentType") return '<label>' + label + '<select class="engineering-input" data-component-field="' + key + '">' + typeOptions.map(option => '<option value="' + esc(option) + '"' + (value === option ? ' selected' : '') + '>' + esc(option || 'Select type') + '</option>').join("") + '</select><small class="field-example">' + esc(engineeringExample(key, component)) + '</small></label>';
      return '<label>' + label + '<input class="engineering-input" type="text" data-component-field="' + key + '" value="' + esc(value) + '" placeholder="' + esc(engineeringExample(key, component)) + '"><small class="field-example">' + esc(engineeringExample(key, component)) + '</small></label>';
    }).join("") + '</div>' +
    '<div class="engineering-actions"><button type="button" class="secondary" data-generate-description="' + index + '">Build shop-format BOM description</button><span>Only entered values are used; confirm the description before release.</span></div>' +
    '</details></td></tr>';
}

function rebuildComponents() {
  components = bomLines.map(line => {
    const dxfIndex = matchDxfIndex(line.partNumber, dxfFiles, currentFixtureTag);
    const matchedDxf = dxfIndex === "" ? null : dxfFiles[Number(dxfIndex)];
    const component = {
      ...clone(line),
      materialCode: line.materialCode || matchedDxf?.materialCode || "",
      flatPatternWidth: line.flatPatternWidth || matchedDxf?.flatWidth || "",
      flatPatternHeight: line.flatPatternHeight || matchedDxf?.flatHeight || ""
    };
    let description = String(line.description || "").trim();
    let descriptionDraft = Boolean(line.descriptionDraft);
    const origin = line.descriptionOrigin || (description && description === String(line.partNumber || "").trim() ? "solidworks" : "");

    // SolidWorks descriptions are source labels, not the final manufacturing
    // description. Replace source labels and prior generated drafts with the
    // enriched shop format. Preserve descriptions explicitly edited by users.
    if (!line.manual && origin !== "manual" && (origin === "solidworks" || origin === "generated" || descriptionDraft || !description)) {
      description = makeDraftDescription(component, matchedDxf);
      descriptionDraft = Boolean(description);
      component.descriptionOrigin = "generated";
      line.description = description;
      line.descriptionDraft = descriptionDraft;
      line.descriptionOrigin = "generated";
    }
    return {
      ...component,
      itemNo: line.itemNo,
      partNumber: line.partNumber,
      quantityPerAssembly: line.quantityPerAssembly,
      description,
      descriptionDraft,
      dxfIndex,
      manual: Boolean(line.manual)
    };
  });
  render();
}

function saveCurrentFixture() {
  if (!currentFixtureTag) return;
  fixtureData[currentFixtureTag] = {
    bomLines: clone(bomLines),
    dxfFiles: clone(dxfFiles),
    components: clone(components),
    dxfText: $("dxfInput").value,
    finishDescription: $("finishDescription").value,
    bomFilenameDescription: $("bomFilenameDescription").value,
    sourceFiles: clone(fixtureData[currentFixtureTag]?.sourceFiles || {}),
    drawingText: drawingText || fixtureData[currentFixtureTag]?.drawingText || "",
    bomGenerated: Boolean(fixtureData[currentFixtureTag]?.bomGenerated),
    shopBomGenerated: Boolean(fixtureData[currentFixtureTag]?.shopBomGenerated),
    dxfBomGenerated: Boolean(fixtureData[currentFixtureTag]?.dxfBomGenerated),
    generatedAt: fixtureData[currentFixtureTag]?.generatedAt || "",
    includeInLaser: fixtureData[currentFixtureTag]?.includeInLaser !== false
  };
}

function fixtureDescriptionFromSchedule(item) {
  if (!item) return "";
  return item.mounting + ' "' + item.profile + '" profile ' + item.width + " x " + item.length;
}

function renderScheduleEditor() {
  $("scheduleRows").innerHTML = schedule.map((item, index) =>
    '<tr data-schedule-index="' + index + '">' +
      '<td>' + esc(item.no) + '</td>' +
      '<td><input class="schedule-cell tag-cell" data-schedule-field="tag" value="' + esc(item.tag) + '"></td>' +
      '<td><input class="schedule-cell" data-schedule-field="mounting" value="' + esc(item.mounting) + '"></td>' +
      '<td><input class="schedule-cell" data-schedule-field="height" value="' + esc(item.height) + '"></td>' +
      '<td><input class="schedule-cell" data-schedule-field="profile" value="' + esc(item.profile) + '"></td>' +
      '<td><input class="schedule-cell" data-schedule-field="width" value="' + esc(item.width) + '"></td>' +
      '<td><input class="schedule-cell" data-schedule-field="length" value="' + esc(item.length) + '"></td>' +
      '<td><input class="schedule-cell" data-schedule-field="finish" value="' + esc(item.finish) + '"></td>' +
      '<td><input class="schedule-cell qty-cell" type="number" min="0" step="any" data-schedule-field="qty" value="' + esc(item.qty) + '"></td>' +
    '</tr>'
  ).join("");
}

function renderFixtureOptions() {
  const previous = $("fixtureSelect").value;
  $("fixtureSelect").innerHTML = schedule.map(item =>
    '<option value="' + esc(item.tag) + '">' + esc(item.tag) + '</option>'
  ).join("");
  if (schedule.some(item => item.tag === previous)) $("fixtureSelect").value = previous;
}

function renderSelectedSchedule() {
  const item = schedule.find(entry => entry.tag === currentFixtureTag);
  $("selectedScheduleRow").innerHTML = item
    ? '<tr><td><strong>' + esc(item.tag) + '</strong></td><td>' + esc(item.mounting) +
      '</td><td>' + esc(item.height) + '</td><td>' + esc(item.profile) +
      '</td><td>' + esc(item.width) + '</td><td>' + esc(item.length) +
      '</td><td>' + esc(item.finish) + '</td><td><strong>' + esc(item.qty) + '</strong></td></tr>'
    : '<tr><td colspan="8" class="empty">No matching fixture tag in the schedule.</td></tr>';
}

function renderSummary() {
  $("summaryRows").innerHTML = schedule.map(item => {
    const saved = fixtureData[item.tag] || {};
    const imported = importedProjectTags.includes(item.tag);
    const count = imported ? (saved.components?.length || 0) : 0;
    const include = saved.includeInLaser !== false;
    return '<tr><td>' + esc(item.no) + '</td><td><strong>' + esc(item.tag) + '</strong></td><td>' +
      esc(item.mounting) + '</td><td>' + esc(item.profile) + '</td><td>' +
      esc(item.width) + '</td><td>' + esc(item.length) + '</td><td>' +
      esc(item.finish) + '</td><td>' + esc(item.qty) + '</td><td>' +
      esc(count || "—") + '</td><td>' + (imported ? "Imported" : "Not imported") + '</td><td>' +
      (imported && saved.shopBomGenerated ? "✓" : "—") + '</td><td>' +
      (imported && saved.dxfBomGenerated ? "✓" : "—") + '</td><td><input type="checkbox" data-laser-include="' +
      esc(item.tag) + '"' + (imported && saved.bomGenerated && include ? " checked" : "") +
      (!imported || !saved.bomGenerated ? " disabled" : "") + ' aria-label="Include ' + esc(item.tag) +
      ' in Laser Order Request"></td></tr>';
  }).join("");
  updateLaserOrderButtonState();
}
function updateLaserOrderButtonState() {
  const hasSelectedGeneratedBom = schedule.some(item => {
    const saved = fixtureData[item.tag];
    return saved?.bomGenerated && saved.includeInLaser !== false && Array.isArray(saved.components) && saved.components.length > 0;
  });
  $("exportCuttingListBtn").disabled = !hasSelectedGeneratedBom;
}

function renderComponents() {
  $("rowCount").textContent = components.length + " BOM item" + (components.length === 1 ? "" : "s");
  $("exportBtn").disabled = components.length === 0;
  $("exportShopBtn").disabled = components.length === 0;
  const body = $("componentRows");

  if (!components.length) {
    body.innerHTML = '<tr><td colspan="8" class="empty">Read a fixture folder and build the BOM Component Tree View to begin.</td></tr>';
    renderSummary();
    return;
  }

  const options = '<option value="">No DXF (purchased / not supplied)</option>' +
    dxfFiles.map((file, index) =>
      '<option value="' + index + '">' + esc(file.originalFilename) + '</option>'
    ).join("");

  body.innerHTML = components.map((component, index) => {
    const dxf = component.dxfIndex === "" || component.dxfIndex == null
      ? null : dxfFiles[Number(component.dxfIndex)];
    const matchWarning = !dxf ? '<span class="match-note">No DXF matched. This may be a purchased item.</span>' : "";
    const flatSize = dxf ? esc(dxf.flatWidth) + " × " + esc(dxf.flatHeight) : "—";
    const material = dxf ? esc(dxf.materialCode || "Not detected") : "—";
    return '<tr data-component-index="' + index + '">' +
      '<td>' + esc(component.itemNo || index + 1) + '</td>' +
      '<td><input class="cell part-cell" data-component-field="partNumber" value="' + esc(component.partNumber) + '" ' + (component.manual ? "" : "readonly") + '></td>' +
      '<td><input class="cell qty-cell" type="number" min="0" step="any" data-component-field="quantityPerAssembly" value="' + esc(component.quantityPerAssembly) + '" ' + (component.manual ? "" : "readonly") + '></td>' +
      '<td><select class="match-select" data-dxf-select>' + options + '</select>' + matchWarning + '</td>' +
      '<td>' + material + '</td><td>' + flatSize + '</td>' +
      '<td><input class="cell description-cell" data-component-field="description" value="' + esc(component.description) + '" placeholder="Enter / confirm manufacturing description">' +
        (component.descriptionDraft ? '<span class="match-note">Auto-draft from DXF filename — verify and edit before release.</span>' : '') + '</td>' +
      '<td><button class="remove" data-remove-component="' + index + '" type="button">×</button></td>' +
      '</tr>' + renderManufacturingFields(component, index);
  }).join("");

  body.querySelectorAll("[data-dxf-select]").forEach(select => {
    const row = select.closest("tr");
    const component = components[Number(row.dataset.componentIndex)];
    select.value = component.dxfIndex === "" || component.dxfIndex == null ? "" : String(component.dxfIndex);
  });
  renderSummary();
}

function render() {
  renderComponents();
  renderSelectedSchedule();
}

function loadFixture(tag) {
  const item = schedule.find(entry => entry.tag === tag);
  if (!item) {
    $("scheduleStatus").textContent = "The selected tag was not found in the schedule.";
    $("scheduleStatus").className = "error";
    return;
  }

  saveCurrentFixture();
  currentFixtureTag = item.tag;
  $("fixtureTag").value = item.tag;
  $("fixtureQuantity").value = item.qty;
  $("fixtureDescription").value = fixtureDescriptionFromSchedule(item);
  $("finish").value = item.finish;
  $("finishDescription").value = fixtureData[item.tag]?.finishDescription || "";
  $("bomFilenameDescription").value = fixtureData[item.tag]?.bomFilenameDescription || item.mounting || "";
  $("currentFixtureLabel").textContent = item.tag + " · " + item.qty + " fixture(s)";

  const saved = fixtureData[item.tag];
  const source = saved?.sourceFiles;
  $("fixtureSourcePaths").textContent = source
    ? "Sources: PDF " + source.drawingPdf + " · BOM " + source.solidworksBom + " · DXF " + source.dxfFolder + " (" + (source.dxfFilenames?.length || 0) + " filenames)."
    : "Source references: drawing PDF —; SolidWorks BOM —; DXF folder —.";
  if ($("fixtureFolderStatus")) {
    $("fixtureFolderStatus").textContent = source ? "Previously imported source folder: " + source.fixtureFolder : "Select the current fixture folder.";
    $("fixtureFolderStatus").className = source ? "ok" : "status-text";
  }
  if ($("folderBomDxfCheck") && $("folderPdfCheck")) {
    if (source && source.solidworksBom && source.dxfFilenames?.length) {
      setFolderValidation({
        bomDxf: true,
        pdf: Boolean(source.drawingPdf),
        pdfText: Boolean(saved?.drawingText)
      });
    } else {
      resetFolderValidation();
    }
  }
  bomLines = saved ? clone(saved.bomLines) : [];
  dxfFiles = saved ? clone(saved.dxfFiles) : [];
  components = saved ? clone(saved.components) : [];
  drawingText = saved?.drawingText || "";
  $("dxfInput").value = saved?.dxfText || "";
  if ($("drawingTextPreview")) $("drawingTextPreview").value = drawingText;
  if ($("drawingTextDetails")) $("drawingTextDetails").hidden = !drawingText;
  if ($("dxfFilenamePreview")) $("dxfFilenamePreview").value = saved?.sourceFiles?.dxfFilenames?.map(path => path.split("/").pop()).join("\n") || "";
  if ($("dxfFilenameDetails")) $("dxfFilenameDetails").hidden = !saved?.sourceFiles?.dxfFilenames?.length;
  if ($("componentTreePanel")) $("componentTreePanel").hidden = true;
  if ($("buildComponentTreeBtn")) $("buildComponentTreeBtn").disabled = !(bomLines.length && dxfFiles.length);
  $("bomStatus").textContent = bomLines.length
    ? bomLines.length + " SolidWorks BOM item(s) loaded for " + item.tag + "."
    : "No SolidWorks BOM imported for " + item.tag + ".";
  $("parseStatus").textContent = dxfFiles.length
    ? dxfFiles.length + " DXF filename(s) available for " + item.tag + "."
    : "Read the " + item.tag + " fixture folder to discover DXF filenames.";
  $("scheduleStatus").textContent = item.tag + " loaded. Its BOM data is kept separately from other fixtures.";
  $("scheduleStatus").className = "ok";
  render();
}


$("bomFilenameDescription").addEventListener("input", saveCurrentFixture);

async function loadTemplateAssets() {
  try {
    const response = await fetch("/api/template-assets");
    if (!response.ok) throw new Error("Could not load saved images.");
    templateAssets = await response.json();
    updateBrandingStatus("stellarLogo", "Stellar logo");
    updateBrandingStatus("radioButton", "Radio-button graphic");
  } catch (error) {
    ["stellarLogo", "radioButton"].forEach(key => {
      const status = $(key + "Status");
      status.textContent = "Could not load saved image settings from the server.";
      status.className = "error";
    });
  }
}

function updateBrandingStatus(assetName, label) {
  const status = $(assetName + "Status");
  if (templateAssets[assetName]) {
    status.textContent = label + " is saved on the application server and will be included in every BOM.";
    status.className = "ok";
  } else {
    status.textContent = "No " + label.toLowerCase() + " saved yet. Upload it once for all BOM exports.";
    status.className = "status-text";
  }
}

function bindBrandingUpload(assetName, label) {
  const input = $(assetName + "File");
  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    const status = $(assetName + "Status");
    if (!/^image\/(png|jpeg)$/.test(file.type)) {
      status.textContent = "Unsupported image. Please choose a PNG or JPEG file.";
      status.className = "error";
      input.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      status.textContent = label + " is too large. Maximum size is 2 MB.";
      status.className = "error";
      input.value = "";
      return;
    }
    status.textContent = "Saving " + label.toLowerCase() + " on the application server…";
    status.className = "status-text";
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read this image file."));
        reader.readAsDataURL(file);
      });
      const response = await fetch("/api/template-assets/" + assetName, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save this image.");
      templateAssets[assetName] = dataUrl;
      updateBrandingStatus(assetName, label);
    } catch (error) {
      status.textContent = error.message;
      status.className = "error";
    } finally {
      input.value = "";
    }
  });
}

bindBrandingUpload("stellarLogo", "Stellar logo");
bindBrandingUpload("radioButton", "Radio-button graphic");
loadTemplateAssets();

$("fixtureSelect").addEventListener("change", () => {
  $("scheduleStatus").textContent = "Click Load fixture to switch to " + $("fixtureSelect").value + ".";
  $("scheduleStatus").className = "status-text";
});

$("useFixtureBtn").addEventListener("click", () => loadFixture($("fixtureSelect").value));

$("fixtureQuantity").addEventListener("input", event => {
  if (!currentFixtureTag) return;
  const item = schedule.find(entry => entry.tag === currentFixtureTag);
  if (!item) return;
  const value = Number(event.target.value);
  if (!Number.isFinite(value) || value < 0) return;
  item.qty = value;
  $("currentFixtureLabel").textContent = item.tag + " · " + item.qty + " fixture(s)";
  renderSelectedSchedule();
});

$("scheduleRows").addEventListener("input", event => {
  const input = event.target.closest("[data-schedule-field]");
  if (!input) return;
  const row = schedule[Number(input.closest("tr").dataset.scheduleIndex)];
  const field = input.dataset.scheduleField;
  row[field] = field === "qty" ? Number(input.value) : input.value;
  renderFixtureOptions();
  if (row.tag === currentFixtureTag) {
    $("fixtureQuantity").value = row.qty;
    $("fixtureDescription").value = fixtureDescriptionFromSchedule(row);
    $("finish").value = row.finish;
    if (!fixtureData[row.tag]?.bomFilenameDescription) $("bomFilenameDescription").value = row.mounting || "";
    renderSelectedSchedule();
  }
});

$("addScheduleRowBtn").addEventListener("click", () => {
  schedule.push({
    no:schedule.length + 1, tag:"", mounting:"", height:"", profile:"",
    width:"", length:"", finish:"", qty:""
  });
  renderScheduleEditor();
  renderFixtureOptions();
  $("scheduleStatus").textContent = "New schedule row added. Enter its values, then select and load it.";
  $("scheduleStatus").className = "ok";
});

$("importBomBtn").addEventListener("click", async () => {
  const file = $("solidworksFile").files[0];
  if (!file) {
    $("bomStatus").textContent = "Choose the original SolidWorks .xls or .xlsx file first.";
    $("bomStatus").className = "error";
    return;
  }
  const extension = file.name.split(".").pop().toLowerCase();
  if (!["xls", "xlsx"].includes(extension)) {
    $("bomStatus").textContent = "Unsupported file type. Choose an .xls or .xlsx workbook.";
    $("bomStatus").className = "error";
    return;
  }

  const button = $("importBomBtn");
  button.disabled = true;
  $("bomStatus").textContent = "Reading SolidWorks BOM (" + extension.toUpperCase() + ")…";
  $("bomStatus").className = "status-text";

  try {
    const response = await fetch("/api/import-solidworks-bom", {
      method:"POST",
      headers:{"Content-Type":"application/octet-stream"},
      body:file
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "SolidWorks BOM import failed.");
    bomLines = data.components.map(line => ({...line, manual:false}));
    rebuildComponents();
    saveCurrentFixture();
    $("bomStatus").textContent = data.count + " items imported from '" + data.worksheet +
      "' (" + extension.toUpperCase() + ").";
    $("bomStatus").className = "ok";
  } catch (error) {
    $("bomStatus").textContent = error.message;
    $("bomStatus").className = "error";
  } finally {
    button.disabled = false;
  }
});

$("parseBtn").addEventListener("click", async () => {
  const button = $("parseBtn");
  button.disabled = true;
  $("parseStatus").textContent = "Parsing DXF filenames…";
  $("parseStatus").className = "status-text";
  try {
    const response = await fetch("/api/parse-dxf-list", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({filenames:$("dxfInput").value})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "DXF parsing failed.");
    dxfFiles = data.components;
    rebuildComponents();
    saveCurrentFixture();
    const unmatched = components.filter(component => component.dxfIndex === "").length;
    $("parseStatus").textContent = dxfFiles.length + " DXF file(s) parsed. " +
      unmatched + " BOM item(s) have no automatic DXF match; review the list.";
    $("parseStatus").className = unmatched ? "status-text" : "ok";
  } catch (error) {
    $("parseStatus").textContent = error.message;
    $("parseStatus").className = "error";
  } finally {
    button.disabled = false;
  }
});

async function extractDrawingPdfText(pdfFile) {
  const pdfjsLib = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
  const bytes = new Uint8Array(await pdfFile.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  let text = "";
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str || "").join(" ");
    text += "\n\n--- PAGE " + pageNo + " ---\n" + pageText;
  }
  return { text: text.trim(), pageCount: pdf.numPages };
}

async function readSelectedDirectory(handle) {
  const rootName = handle.name;
  const entries = [];
  async function walk(directory, prefix) {
    for await (const [name, child] of directory.entries()) {
      const path = prefix + "/" + name;
      if (child.kind === "file") entries.push({ file: await child.getFile(), path });
      else if (child.kind === "directory") await walk(child, path);
    }
  }
  await walk(handle, rootName);
  return entries;
}

function resetFolderValidation(message = "Select the current fixture folder.") {
  $("folderBomDxfCheck").className = "folder-check pending";
  $("folderPdfCheck").className = "folder-check pending";
  $("folderBomDxfCheck").querySelector("span").textContent = "SolidWorks BOM and DXF files discovered from the selected folder";
  $("folderPdfCheck").querySelector("span").textContent = "Drawing PDF loaded — extracted text is reference only";
  $("folderImportReview").textContent = message;
  $("folderImportReview").className = "status-text";
  $("buildComponentTreeBtn").disabled = true;
}

function setFolderValidation({ bomDxf = false, pdf = false, pdfText = false } = {}) {
  $("folderBomDxfCheck").className = "folder-check " + (bomDxf ? "ok" : "pending");
  $("folderPdfCheck").className = "folder-check " + (pdf ? "ok" : "pending");
  $("folderBomDxfCheck").querySelector("span").textContent = bomDxf
    ? "SolidWorks BOM and DXF files discovered from the selected folder"
    : "SolidWorks BOM and DXF files not yet validated";
  $("folderPdfCheck").querySelector("span").textContent = pdf
    ? (pdfText ? "Drawing PDF loaded and text extracted — reference only" : "Drawing PDF loaded — text extraction unavailable; reference only")
    : "Drawing PDF not yet validated";
}

async function importFixtureFolder(folderTag, providedEntries) {
  const tag = folderTag;
  const entries = (providedEntries || []).filter(entry => entry && entry.file && entry.path);
  if (!entries.length) throw new Error("No files were found in fixture folder " + tag + ".");
  const isExcelOutput = path => path.split("/").some(part => /^excel$/i.test(part));
  const workbooks = entries.filter(entry => /\.(xls|xlsx)$/i.test(entry.path) && !isExcelOutput(entry.path));
  const preferredWorkbooks = workbooks.filter(entry => entry.path.split("/").some(part => /solid[\s_-]*works?|bom/i.test(part)));
  let bomCandidates = preferredWorkbooks.length ? preferredWorkbooks : workbooks;
  if (bomCandidates.length !== 1) {
    const exact = workbooks.filter(entry => new RegExp("^" + tag + "\\.(xls|xlsx)$", "i").test(entry.path.split("/").pop()));
    if (exact.length === 1) bomCandidates = exact;
  }
  if (bomCandidates.length !== 1) throw new Error(bomCandidates.length
    ? "More than one possible SolidWorks BOM workbook was found outside the Excel output folder."
    : "No SolidWorks BOM .xls/.xlsx workbook was found outside the Excel output folder.");
  const pdfs = entries.filter(entry => /\.pdf$/i.test(entry.path));
  const exactPdfs = pdfs.filter(entry => entry.path.split("/").pop().toLowerCase() === (tag + ".pdf").toLowerCase());
  const pdfCandidates = exactPdfs.length ? exactPdfs : pdfs;
  if (pdfCandidates.length !== 1) throw new Error(pdfCandidates.length
    ? "More than one drawing PDF was found; name the intended file " + tag + ".pdf."
    : "No drawing PDF was found.");
  const dxfEntries = entries.filter(entry => {
    const parts = entry.path.split("/");
    return parts.some((part,index) => index > 0 && /^dxf$/i.test(part)) && /\.dxf$/i.test(entry.path);
  }).sort((a,b) => a.path.localeCompare(b.path));
  if (!dxfEntries.length) throw new Error("No DXF files were found inside a DXF subfolder.");
  const bomResponse = await fetch("/api/import-solidworks-bom", {
    method:"POST",headers:{"Content-Type":"application/octet-stream"},body:bomCandidates[0].file
  });
  const bomResult = await bomResponse.json();
  if (!bomResponse.ok) throw new Error(bomResult.error || "SolidWorks BOM import failed.");
  const dxfNames = dxfEntries.map(entry => entry.path.split("/").pop());
  let dxfHashes = [];
  if (window.crypto && window.crypto.subtle) {
    try {
      dxfHashes = await Promise.all(dxfEntries.map(async entry => {
        const digest = await window.crypto.subtle.digest("SHA-256", await entry.file.arrayBuffer());
        return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,"0")).join("");
      }));
    } catch (error) { console.warn("DXF fingerprinting unavailable for " + tag, error); }
  }
  const dxfResponse = await fetch("/api/parse-dxf-list", {
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({filenames:dxfNames.join("\n")})
  });
  const dxfResult = await dxfResponse.json();
  if (!dxfResponse.ok) throw new Error(dxfResult.error || "DXF filename parsing failed.");
  let pdfResult = {text:"",pageCount:0};
  try { pdfResult = await extractDrawingPdfText(pdfCandidates[0].file); }
  catch (error) { console.warn("PDF text extraction unavailable for " + tag, error); }
  loadFixture(tag);
  // loadFixture creates the fixture state only when a prior state exists.
  // A first-time project-root import must initialize it before writing import flags.
  if (!fixtureData[tag]) fixtureData[tag] = {};
  bomLines = bomResult.components.map(line => ({...line,descriptionOrigin:"solidworks",descriptionDraft:true,manual:false}));
  dxfFiles = dxfResult.components.map((component,index) => ({...component,sha256:dxfHashes[index] || ""}));
  drawingText = pdfResult.text;
  $("dxfInput").value = dxfNames.join("\n");
  rebuildComponents();
  fixtureData[tag].bomGenerated = false;
  fixtureData[tag].shopBomGenerated = false;
  fixtureData[tag].dxfBomGenerated = false;
  fixtureData[tag].generatedAt = "";
  fixtureData[tag].includeInLaser = true;
  fixtureData[tag].sourceFiles = {
    fixtureFolder:(selectedProjectRootName ? selectedProjectRootName + "/" : "") + tag,
    drawingPdf:pdfCandidates[0].path,
    solidworksBom:bomCandidates[0].path,
    dxfFolder:dxfEntries[0].path.split("/").slice(0,-1).join("/") + "/",
    dxfFilenames:dxfEntries.map(entry => entry.path)
  };
  fixtureData[tag].drawingText = drawingText;
  saveCurrentFixture();
  $("bomStatus").textContent = bomResult.count + " BOM item(s) read from " + bomCandidates[0].path + ".";
  $("bomStatus").className = "ok";
  $("parseStatus").textContent = dxfFiles.length + " DXF filename(s) read from " + tag + ". DXF contents were not uploaded.";
  $("parseStatus").className = "ok";
  $("fixtureSourcePaths").textContent = "Sources for " + tag + ": PDF " + pdfCandidates[0].path +
    " · BOM " + bomCandidates[0].path + " · DXF " + dxfEntries.length + " file(s).";
  $("dxfFilenamePreview").value = dxfNames.join("\n");
  $("dxfFilenameDetails").hidden = false;
  $("drawingTextPreview").value = drawingText || "No extractable text layer was found; the PDF remains identified as a source reference.";
  $("drawingTextDetails").hidden = false;
  setFolderValidation({bomDxf:true,pdf:true,pdfText:Boolean(drawingText)});
  $("buildComponentTreeBtn").disabled = false;
  $("componentTreePanel").hidden = true;
  renderSummary();
  return {tag,bomCount:bomResult.count,dxfCount:dxfEntries.length,pdfPages:pdfResult.pageCount};
}

async function importProjectRoot(entries, rootName) {
  importedProjectTags = [];
  $("projectBatchActions").hidden = true;
  $("projectBatchStatus").textContent = "Discovering fixture folders…";
  renderSummary();
  const tags = schedule.map(item => item.tag);
  const discovered = discoverProjectFixtureEntries(entries, rootName, tags);
  if (!discovered.size) throw new Error("No fixture folders matching the project schedule were found inside " + rootName + ".");
  selectedProjectRootName = rootName;
  const failures = [];
  for (const tag of tags) {
    if (!discovered.has(tag)) continue;
    try {
      await importFixtureFolder(tag, discovered.get(tag));
      importedProjectTags.push(tag);
    } catch (error) {
      failures.push(tag + ": " + error.message);
    }
  }
  renderSummary();
  $("fixtureFolderStatus").textContent = "Project folder " + rootName + ": " + importedProjectTags.length +
    " fixture folder(s) imported; " + failures.length + " require attention.";
  $("fixtureFolderStatus").className = failures.length ? "status-text" : "ok";
  $("folderImportReview").textContent = importedProjectTags.length + " fixture folder(s) imported: " +
    importedProjectTags.join(", ") + (failures.length ? ". Attention: " + failures.join(" | ") : "") +
    ". Generate one Excel BOM per imported fixture.";
  $("folderImportReview").className = failures.length ? "status-text" : "ok";
  $("projectBatchActions").hidden = importedProjectTags.length === 0;
  $("projectBatchStatus").textContent = importedProjectTags.length + " fixture unit(s) ready for batch export.";
  if (failures.length) console.warn("Project folder import issues:", failures);
}

$("chooseFixtureFolderBtn").addEventListener("click", async () => {
  if (!("showDirectoryPicker" in window)) {
    $("fixtureFolderInput").click();
    return;
  }
  resetFolderValidation("Select the project root folder containing all fixture-unit folders…");
  try {
    const handle = await window.showDirectoryPicker({ mode: "read" });
    $("fixtureFolderStatus").textContent = "Reading project folder " + handle.name + "…";
    $("fixtureFolderStatus").className = "status-text";
    await importProjectRoot(await readSelectedDirectory(handle), handle.name);
  } catch (error) {
    if (error.name !== "AbortError") {
      $("fixtureFolderStatus").textContent = error.message;
      $("fixtureFolderStatus").className = "error";
      resetFolderValidation("Project folder import failed. Check the folder structure.");
    }
  }
});

$("fixtureFolderInput").addEventListener("change", async () => {
  const files = Array.from($("fixtureFolderInput").files || []);
  if (!files.length) return;
  const firstPath = String(files[0].webkitRelativePath || files[0].name).replace(/\\\\/g, "/");
  const rootName = firstPath.split("/")[0];
  const entries = files.map(file => ({
    file,
    path: String(file.webkitRelativePath || file.name).replace(/\\\\/g, "/")
  }));
  $("fixtureFolderStatus").textContent = "Reading project folder " + rootName + "…";
  $("fixtureFolderStatus").className = "status-text";
  try {
    await importProjectRoot(entries, rootName);
  } catch (error) {
    $("fixtureFolderStatus").textContent = error.message;
    $("fixtureFolderStatus").className = "error";
    resetFolderValidation("Project folder import failed. Check the folder structure.");
  } finally {
    $("fixtureFolderInput").value = "";
  }
});

async function generateProjectBatch(mode) {
  const button = mode === "shop" ? $("projectShopBtn") : $("projectDxfBtn");
  const other = mode === "shop" ? $("projectDxfBtn") : $("projectShopBtn");
  const tags = schedule.map(item => item.tag).filter(tag =>
    importedProjectTags.includes(tag) && fixtureData[tag]?.components?.length
  );
  if (!tags.length) {
    $("projectBatchStatus").textContent = "No valid fixture BOMs are available. Import the project folder first.";
    $("projectBatchStatus").className = "error";
    return;
  }

  button.disabled = true;
  other.disabled = true;
  $("projectBatchStatus").textContent = "Generating " + (mode === "shop" ? "Shop-format" : "DXF-based") + " BOM workbooks…";

  try {
    // Generate each workbook in memory, then package all successful files into
    // one ZIP. This avoids one browser download prompt per fixture.
    const files = [];
    const failed = [];

    for (const tag of tags) {
      try {
        loadFixture(tag);
        const payload = {
          customer:$("customer").value,
          projectName:$("projectName").value,
          poNumber:$("poNumber").value,
          projectNumber:$("projectNumber").value,
          fixtureTag:$("fixtureTag").value,
          scheduleRowNumber:(schedule.find(item => item.tag === $("fixtureTag").value) || {}).no || "",
          fixtureQuantity:$("fixtureQuantity").value,
          fixtureDescription:$("fixtureDescription").value,
          finish:[$("finish").value, $("finishDescription").value].filter(Boolean).join(" = "),
          bomFilenameDescription:$("bomFilenameDescription").value,
          shopFormat:mode === "shop",
          components:components.map(component => ({
            itemNo:component.itemNo,
            partNumber:component.partNumber,
            quantityPerAssembly:component.quantityPerAssembly,
            description:mode === "shop"
              ? buildShopStandardExportDescription(component)
              : component.description
          }))
        };

        const response = await fetch("/api/export-bom-xlsx", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify(payload)
        });
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || "Excel export failed.");
        }

        const blob = await response.blob();
        const disposition = response.headers.get("Content-Disposition") || "";
        const filenameMatch = disposition.match(/filename="([^"]+)"/i);
        const filename = filenameMatch
          ? filenameMatch[1]
          : makeBomFilename().replace(/\.xlsx$/i, "") +
            (mode === "shop" ? " - Shop Standard.xlsx" : " - DXF-Based.xlsx");

        files.push({ filename, blob });

        fixtureData[tag] = fixtureData[tag] || {};
        fixtureData[tag].bomGenerated = true;
        fixtureData[tag][mode === "shop" ? "shopBomGenerated" : "dxfBomGenerated"] = true;
        fixtureData[tag].generatedAt = new Date().toISOString();
        fixtureData[tag].includeInLaser = fixtureData[tag].includeInLaser !== false;
        saveCurrentFixture();
      } catch (error) {
        failed.push(tag + ": " + error.message);
      }
    }

    if (!files.length) {
      throw new Error("No BOM workbooks were generated.");
    }

    // JSZip is loaded only for batch export, so normal single-BOM operation
    // does not need an additional application dependency.
    const JSZip = (await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm")).default;
    const zip = new JSZip();
    for (const file of files) zip.file(file.filename, file.blob);
    const zipBlob = await zip.generateAsync({type:"blob", compression:"DEFLATE", compressionOptions:{level:6}});

    const zipName = [
      $("projectNumber").value || "Project",
      mode === "shop" ? "Shop-Format-BOMs" : "DXF-Based-BOMs"
    ].join(" - ") + ".zip";

    if ("showSaveFilePicker" in window) {
      const handle = await window.showSaveFilePicker({
        suggestedName: zipName,
        types: [{
          description:"ZIP archive",
          accept:{"application/zip":[".zip"]}
        }]
      });
      const writable = await handle.createWritable();
      await writable.write(zipBlob);
      await writable.close();
    } else {
      const url = URL.createObjectURL(zipBlob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = zipName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    }

    renderSummary();
    $("projectBatchStatus").textContent =
      (mode === "shop" ? "Shop-format" : "DXF-based") +
      " batch export: " + files.length + " workbook(s) packaged into " + zipName +
      (failed.length ? ". Failed: " + failed.join(" | ") : ". Choose the ZIP save location once.");
    $("projectBatchStatus").className = failed.length ? "status-text" : "ok";
  } catch (error) {
    $("projectBatchStatus").textContent = error.name === "AbortError"
      ? "ZIP save cancelled. The generated workbooks remain available to generate again."
      : error.message;
    $("projectBatchStatus").className = error.name === "AbortError" ? "status-text" : "error";
  } finally {
    button.disabled = false;
    other.disabled = false;
  }
}
$("projectDxfBtn").addEventListener("click", () => generateProjectBatch("dxf"));
$("projectShopBtn").addEventListener("click", () => generateProjectBatch("shop"));

$("buildComponentTreeBtn").addEventListener("click", () => {
  if (!components.length || $("buildComponentTreeBtn").disabled) return;
  $("componentTreePanel").hidden = false;
  renderComponents();
  $("folderImportReview").textContent = "BOM Component Tree View is ready. Verify all matches and engineering data before generating the Excel BOM.";
  $("folderImportReview").className = "ok";
  $("componentTreePanel").scrollIntoView({ behavior: "smooth", block: "start" });
});

$("summaryRows").addEventListener("change", event => {
  const checkbox = event.target.closest("[data-laser-include]");
  if (!checkbox) return;
  const tag = checkbox.dataset.laserInclude;
  if (!fixtureData[tag]) return;
  fixtureData[tag].includeInLaser = checkbox.checked;
  $("summaryStatus").textContent = tag + (checkbox.checked ? " included in" : " excluded from") + " the next Laser Order Request preview.";
  $("summaryStatus").className = "ok";
  if (cuttingListPreview.length) {
    try { renderCuttingListPreview(); }
    catch (error) {
      $("cuttingListStatus").textContent = error.message;
      $("cuttingListStatus").className = "error";
      $("exportCuttingListBtn").disabled = true;
    }
  } else {
    updateLaserOrderButtonState();
  }
});

$("componentRows").addEventListener("change", event => {
  const select = event.target.closest("[data-dxf-select]");
  if (!select) return;
  const index = Number(select.closest("tr").dataset.componentIndex);
  components[index].dxfIndex = select.value === "" ? "" : Number(select.value);
  if (components[index].dxfIndex !== "") {
    const selectedDxf = dxfFiles[components[index].dxfIndex];
    if (!components[index].flatPatternWidth) components[index].flatPatternWidth = selectedDxf.flatWidth || "";
    if (!components[index].flatPatternHeight) components[index].flatPatternHeight = selectedDxf.flatHeight || "";
    if (!components[index].materialCode) components[index].materialCode = selectedDxf.materialCode || "";
  }
  if (components[index].dxfIndex !== "" && (
    !String(components[index].description || "").trim() ||
    components[index].descriptionDraft
  )) {
    const draft = makeDraftDescription(components[index], dxfFiles[components[index].dxfIndex]);
    if (draft) {
      components[index].description = draft;
      components[index].descriptionDraft = true;
      const line = bomLines.find(entry => entry.itemNo === components[index].itemNo && entry.partNumber === components[index].partNumber);
      if (line) {
        line.description = draft;
        line.descriptionDraft = true;
      }
    }
  }
  saveCurrentFixture();
  renderComponents();
});

$("componentRows").addEventListener("input", event => {
  const input = event.target.closest("[data-component-field]");
  if (!input) return;
  const index = Number(input.closest("tr").dataset.componentIndex);
  components[index][input.dataset.componentField] = input.value;
  if (input.dataset.componentField === "description") {
    components[index].descriptionDraft = false;
    components[index].descriptionOrigin = "manual";
  } else if (components[index].descriptionDraft) {
    // Keep the automatic BOM description synchronized as engineering values
    // are entered. A manually edited description is never overwritten.
    const matchedDxf = components[index].dxfIndex === "" || components[index].dxfIndex == null
      ? null : dxfFiles[Number(components[index].dxfIndex)];
    components[index].description = buildShopBomDescription(components[index], matchedDxf).description;
    const componentRow = input.closest("tr").previousElementSibling;
    const descriptionInput = componentRow?.querySelector('[data-component-field="description"]');
    if (descriptionInput) descriptionInput.value = components[index].description;
  }
  const line = bomLines.find(entry =>
    entry.itemNo === components[index].itemNo && entry.partNumber === components[index].partNumber
  );
  if (line) {
    line[input.dataset.componentField] = input.value;
    if (input.dataset.componentField === "description") {
      line.descriptionDraft = false;
      line.descriptionOrigin = "manual";
    } else if (components[index].descriptionDraft) {
      line.description = components[index].description;
      line.descriptionDraft = true;
      line.descriptionOrigin = "generated";
    }
  }
  saveCurrentFixture();
});

$("componentRows").addEventListener("click", event => {
  const buildButton = event.target.closest("[data-generate-description]");
  if (buildButton) {
    const index = Number(buildButton.dataset.generateDescription);
    const component = components[index];
    const matchedDxf = component.dxfIndex === "" || component.dxfIndex == null
      ? null : dxfFiles[Number(component.dxfIndex)];
    const result = buildShopBomDescription(component, matchedDxf);
    const description = result.description;
    component.description = description;
    component.descriptionDraft = true;
    component.descriptionOrigin = "generated";
    const line = bomLines.find(entry => entry.itemNo === component.itemNo && entry.partNumber === component.partNumber);
    if (line) {
      line.description = description;
      line.descriptionDraft = true;
      line.descriptionOrigin = "generated";
    }
    saveCurrentFixture();
    renderComponents();
    $("parseStatus").textContent = "Shop-format description refreshed for " + (component.partNumber || "component") + ". Review it before export.";
    $("parseStatus").className = "ok";
    return;
  }
  const button = event.target.closest("[data-remove-component]");
  if (!button) return;
  const index = Number(button.dataset.removeComponent);
  const removed = components[index];
  components.splice(index, 1);
  bomLines = bomLines.filter(line => line.itemNo !== removed.itemNo || line.partNumber !== removed.partNumber);
  saveCurrentFixture();
  renderComponents();
});

$("addRowBtn").addEventListener("click", () => {
  const line = {
    itemNo:String(bomLines.length + 1),
    partNumber:"",
    description:"",
    quantityPerAssembly:"",
    manual:true
  };
  bomLines.push(line);
  components.push({...line, dxfIndex:""});
  saveCurrentFixture();
  renderComponents();
});

$("generateSummaryBtn").addEventListener("click", () => {
  saveCurrentFixture();
  renderSummary();
  const count = schedule.filter(item => fixtureData[item.tag]?.bomGenerated).length;
  $("summaryStatus").textContent = count + " generated fixture BOM(s) listed. Use the checkboxes to choose which ones feed the Laser Order Request.";
  $("summaryStatus").className = "ok";
});

async function exportBomWorkbook(descriptionMode) {
  const button = descriptionMode === "shop" ? $("exportShopBtn") : $("exportBtn");
  const otherButton = descriptionMode === "shop" ? $("exportBtn") : $("exportShopBtn");
  button.disabled = true;
  otherButton.disabled = true;
  const isShop = descriptionMode === "shop";
  const status = $("bomExportStatus");
  status.textContent = isShop ? "Generating shop-format BOM Excel…" : "Generating DXF-based BOM Excel…";
  status.className = "status-text";
  $("parseStatus").textContent = isShop ? "Generating shop-format Excel BOM…" : "Generating DXF-based Excel BOM…";
  $("parseStatus").className = "status-text";

  try {
    const payload = {
      customer:$("customer").value,
      projectName:$("projectName").value,
      poNumber:$("poNumber").value,
      projectNumber:$("projectNumber").value,
      fixtureTag:$("fixtureTag").value,
      scheduleRowNumber:(schedule.find(item => item.tag === $("fixtureTag").value) || {}).no || "",
      fixtureQuantity:$("fixtureQuantity").value,
      fixtureDescription:$("fixtureDescription").value,
      finish:[$("finish").value, $("finishDescription").value].filter(Boolean).join(" = "),
      bomFilenameDescription:$("bomFilenameDescription").value,
      shopFormat:isShop,
      components:components.map(component => ({
        itemNo:component.itemNo,
        partNumber:component.partNumber,
        quantityPerAssembly:component.quantityPerAssembly,
        description:isShop
          ? buildShopStandardExportDescription(component)
          : component.description
      }))
    };

    const response = await fetch("/api/export-bom-xlsx", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Excel export failed.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const baseFilename = makeBomFilename().replace(/\.xlsx$/i, "");
    anchor.download = baseFilename + (isShop ? " - Shop Standard.xlsx" : " - DXF-Based.xlsx");
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    const missing = components.filter(component => !String(component.description || "").trim()).length;
    fixtureData[currentFixtureTag] = fixtureData[currentFixtureTag] || {};
    fixtureData[currentFixtureTag].bomGenerated = true;
    fixtureData[currentFixtureTag][isShop ? "shopBomGenerated" : "dxfBomGenerated"] = true;
    fixtureData[currentFixtureTag].generatedAt = new Date().toISOString();
    fixtureData[currentFixtureTag].includeInLaser = fixtureData[currentFixtureTag].includeInLaser !== false;
    saveCurrentFixture();
    renderSummary();
    $("summaryStatus").textContent = currentFixtureTag + " BOM Excel generated and marked complete.";
    $("summaryStatus").className = "ok";
    const modeLabel = isShop ? "Shop-format" : "DXF-based";
    status.textContent = modeLabel + " BOM downloaded. Generate the other version for comparison.";
    status.className = "ok";
    $("parseStatus").textContent = modeLabel + " Excel BOM generated. " +
      (missing ? missing + " description(s) are blank; review the workbook before release." : "Descriptions are populated.");
    $("parseStatus").className = missing ? "status-text" : "ok";
    $("folderImportReview").textContent = currentFixtureTag + " " + modeLabel + " BOM Excel file generated successfully." +
      (missing ? " " + missing + " description(s) remain blank and need review." : "");
    $("folderImportReview").className = missing ? "status-text" : "ok";
  } catch (error) {
    status.textContent = error.message;
    status.className = "error";
    $("parseStatus").textContent = error.message;
    $("parseStatus").className = "error";
    $("folderImportReview").textContent = "BOM Excel generation failed: " + error.message;
    $("folderImportReview").className = "error";
  } finally {
    button.disabled = components.length === 0;
    otherButton.disabled = components.length === 0;
  }
}

$("exportBtn").addEventListener("click", () => exportBomWorkbook("dxf"));
$("exportShopBtn").addEventListener("click", () => exportBomWorkbook("shop"));


function collectProjectBomData() {
  saveCurrentFixture();
  const fixtures = [];
  for (const item of schedule) {
    const saved = fixtureData[item.tag];
    if (!saved || !saved.bomGenerated || saved.includeInLaser === false || !Array.isArray(saved.components) || !saved.components.length) continue;
    fixtures.push({
      fixtureTag: item.tag,
      fixtureQuantity: item.qty,
      finish: item.finish,
      mountingComment: item.mounting,
      components: saved.components.map(component => {
        const dxf = component.dxfIndex === "" || component.dxfIndex == null
          ? null : saved.dxfFiles?.[Number(component.dxfIndex)];
        return {
          partNumber: component.partNumber,
          quantityPerAssembly: component.quantityPerAssembly,
          materialCode: component.materialCode || dxf?.materialCode || "",
          materialGrade: component.materialGrade || "",
          gauge: component.gauge || "",
          cuttingListFinish: component.cuttingListFinish || "",
          dxf: dxf ? { originalFilename: dxf.originalFilename, fixtureTag: dxf.fixtureTag, materialCode: dxf.materialCode || "", sha256: dxf.sha256 || "", consolidationKey: component.cuttingListIdentity || "", outputFilename: dxf.originalFilename } : null
        };
      })
    });
  }
  return fixtures;
}

let cuttingListPreview = [];
function renderCuttingListPreview() {
  const fixtures = collectProjectBomData();
  const groups = new Map();
  const hashFixtureMap = new Map();
  for (const fixture of fixtures) {
    for (const component of fixture.components) {
      const hash = component.dxf?.sha256;
      if (!hash) continue;
      if (!hashFixtureMap.has(hash)) hashFixtureMap.set(hash, new Set());
      hashFixtureMap.get(hash).add(fixture.fixtureTag);
    }
  }
  const commonHashes = new Set([...hashFixtureMap.entries()].filter(([, tags]) => tags.size > 1).map(([hash]) => hash));
  let noDxfCount = 0;
  for (const fixture of fixtures) {
    for (const component of fixture.components) {
      if (!component.dxf) { noDxfCount++; continue; }
      const hashCommon = Boolean(component.dxf.sha256 && commonHashes.has(component.dxf.sha256));
      const isCommon = Boolean(component.dxf.consolidationKey) ||
        String(component.dxf.fixtureTag || "").toUpperCase() === "COMMON" ||
        hashCommon;
      const dxfIdentity = component.dxf.consolidationKey
        ? "approved:" + component.dxf.consolidationKey.toLowerCase()
        : hashCommon ? "sha256:" + component.dxf.sha256
        : component.dxf.originalFilename.toLowerCase();
      const materialCode = String(component.materialCode || component.dxf.materialCode || "").toUpperCase();
      const material = component.materialGrade || (materialCode === "C11" || materialCode === "C16" ? "CRS" : "");
      const thickness = component.gauge || (materialCode === "C11" ? "11GA" : materialCode === "C16" ? "16GA" : "");
      const finish = component.cuttingListFinish || fixture.finish || "";
      const key = [dxfIdentity, material.toUpperCase(), thickness.toUpperCase(), String(finish).toUpperCase()].join("|");
      if (!groups.has(key)) groups.set(key, {
        dxfFilename: component.dxf.originalFilename,
        material,
        thickness,
        finish,
        quantity: 0,
        common: isCommon,
        sources: new Set()
      });
      const entry = groups.get(key);
      const qty = Number(component.quantityPerAssembly);
      if (!Number.isFinite(qty) || qty < 0 || component.quantityPerAssembly === "") {
        throw new Error("Invalid quantity for " + component.partNumber + " in " + fixture.fixtureTag);
      }
      entry.quantity += qty * Number(fixture.fixtureQuantity || 0);
      entry.sources.add(fixture.fixtureTag);
      if (!entry.material && component.materialCode) entry.material = component.materialCode;
    }
  }
  cuttingListPreview = [...groups.values()].sort((a,b) =>
    Number(b.common) - Number(a.common) || a.material.localeCompare(b.material) ||
    a.thickness.localeCompare(b.thickness) || a.dxfFilename.localeCompare(b.dxfFilename)
  );
  $("cuttingListRows").innerHTML = cuttingListPreview.length ? cuttingListPreview.map(line => {
    const section = line.common ? "COMMON PARTS" : line.thickness + " CRS";
    return "<tr><td>" + esc(line.dxfFilename) + "</td><td>" + esc(section) + "</td><td>" + esc(line.material || "—") +
      "</td><td>" + esc(line.thickness || "—") + "</td><td>" + esc(line.quantity) +
      "</td><td>" + esc(line.finish || "—") + "</td><td>PC</td><td>" + esc([...line.sources].join(", ")) + "</td></tr>";
  }).join("") : '<tr><td colspan="8" class="empty">No matched DXF components found in the saved fixture BOMs.</td></tr>';
  $("exportCuttingListBtn").disabled = !fixtures.length || cuttingListPreview.length === 0;
  const commonLineCount = cuttingListPreview.filter(line => line.common).length;
  $("cuttingListStatus").textContent = cuttingListPreview.length + " consolidated DXF line(s), including " + commonLineCount + " common line(s), from " +
    fixtures.length + " selected, generated fixture BOM(s). " + noDxfCount + " BOM component(s) without DXF were excluded.";
  $("cuttingListStatus").className = cuttingListPreview.length ? "ok" : "status-text";
}

$("previewCuttingListBtn").addEventListener("click", () => {
  try { renderCuttingListPreview(); }
  catch (error) {
    $("cuttingListStatus").textContent = error.message;
    $("cuttingListStatus").className = "error";
    $("exportCuttingListBtn").disabled = true;
  }
});

$("exportCuttingListBtn").addEventListener("click", async () => {
  const button = $("exportCuttingListBtn");
  button.disabled = true;
  $("cuttingListStatus").textContent = "Preparing the selected fixture BOMs…";
  try {
    const fixtures = collectProjectBomData();
    if (!fixtures.length) throw new Error("Generate at least one fixture BOM and include it in the Project Schedule Summary.");
    renderCuttingListPreview();
    if (!cuttingListPreview.length) throw new Error("No matched DXF components are available for the Laser Order Request.");
    button.disabled = true;
    $("cuttingListStatus").textContent = "Generating Laser Order Request Excel…";
    const response = await fetch("/api/export-cutting-list-xlsx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: $("projectName").value,
        customer: $("customer").value,
        storeNumber: $("projectNumber").value,
        poNumber: $("poNumber").value,
        orderNumber: $("laserOrderNumber").value,
        orderDate: $("laserOrderDate").value,
        requestedBy: $("laserRequestedBy").value,
        shipDate: $("laserShipDate").value,
        mountingComment: [...new Set(fixtures.map(fixture => fixture.mountingComment).filter(Boolean))].join(" / "),
        fixtures
      })
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Cutting list export failed.");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const disposition = response.headers.get("Content-Disposition") || "";
    const filenameMatch = disposition.match(/filename="([^"]+)"/i);
    anchor.download = filenameMatch ? filenameMatch[1] : "Laser Order Request.xlsx";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    $("cuttingListStatus").textContent = "Laser Order Request generated. Review material, gauge, finish and quantities before sending to laser cutting.";
    $("cuttingListStatus").className = "ok";
  } catch (error) {
    $("cuttingListStatus").textContent = error.message;
    $("cuttingListStatus").className = "error";
  } finally {
    updateLaserOrderButtonState();
  }
});

const logoutButton = $("logoutBtn");
if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/logout", {method:"POST"});
    window.location.replace("/login");
  });
}

renderScheduleEditor();
renderFixtureOptions();
$("fixtureSelect").value = schedule[0]?.tag || "";
loadFixture($("fixtureSelect").value);