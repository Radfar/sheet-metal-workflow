export function parseDxfFilename(rawLine) {
  const originalFilename = rawLine.trim();
  if (!originalFilename) return null;

  const upper = originalFilename.toUpperCase();
  const projectMatch = upper.match(/\b(\d{4})\b/);
  const materialMatch = upper.match(/\bC(11|16)\b/);
  const dimensionMatch = originalFilename.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
  const fixtureMatch = upper.match(/\b(T[0-9O]{2}[A-Z]?)(?=[\s_-]|$)/);
  const fixtureTag = fixtureMatch?.[1] ?? "COMMON";

  let componentLabel = upper.replace(/^ARI\s+/, "");
  componentLabel = componentLabel.replace(/\bC(?:11|16)\b/, "").replace(/\b\d{4}\b/, "");
  if (fixtureMatch) componentLabel = componentLabel.replace(fixtureMatch[1], "");
  if (dimensionMatch) componentLabel = componentLabel.replace(dimensionMatch[0], "");
  componentLabel = componentLabel.replace(/\.DXF$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

  const warnings = [];
  if (!projectMatch) warnings.push("Project number not detected");
  if (!materialMatch) warnings.push("Material code not detected");
  if (!dimensionMatch) warnings.push("Flat-pattern dimensions not detected");
  if (/\bTO[0-9]{1,2}[A-Z]/i.test(originalFilename)) {
    warnings.push("Possible letter O / digit 0 ambiguity in fixture tag; verify manually");
  }
  if (fixtureTag === "COMMON") warnings.push("Common component; no unit/fixture tag detected");

  return {
    originalFilename,
    projectNumber: projectMatch?.[1] ?? "",
    materialCode: materialMatch ? "C" + materialMatch[1] : "",
    fixtureTag,
    componentLabel,
    flatWidth: dimensionMatch?.[1] ?? "",
    flatHeight: dimensionMatch?.[2] ?? "",
    warnings
  };
}

export function parseDxfList(input) {
  return input.split(/\r?\n/).map(parseDxfFilename).filter(Boolean);
}
