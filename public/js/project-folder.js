export function discoverProjectFixtureEntries(entries, rootName, scheduleTags) {
  const normalizedRoot = String(rootName || "").split("\\").join("/");
  const tags = (scheduleTags || []).map(tag => String(tag));
  const discovered = new Map();
  for (const entry of entries || []) {
    if (!entry || !entry.file || !entry.path) continue;
    const path = String(entry.path).split("\\").join("/");
    const parts = path.split("/").filter(Boolean);
    if (parts.length < 3 || parts[0].toUpperCase() !== normalizedRoot.toUpperCase()) continue;
    const tag = tags.find(value => value.toUpperCase() === parts[1].toUpperCase());
    if (!tag) continue;
    if (!discovered.has(tag)) discovered.set(tag, []);
    discovered.get(tag).push({ file: entry.file, path: tag + "/" + parts.slice(2).join("/") });
  }
  return discovered;
}
