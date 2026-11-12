# Approved Shop BOM Naming Rule

**Status:** Approved  
**Scope:** Shop-Standard BOM descriptions for trough sections.

## Trough section description

Use this format:

```text
[Flat-pattern dimensions] [Gauge] (Process) Trough section "[Part number]"
```

### Rules

1. Use the dimensions in fractional-inch format, as approved for the shop BOM.
2. Put the verified gauge immediately after the dimensions (for example, `16GA.`).
3. Put the manufacturing process in parentheses (for example, `(Laser/SM)`).
4. Use the component name `Trough section`, followed by the exact part number in double quotes.
5. Do not include the prefix `Flat pattern`.
6. Do not include `Channel` or `Chn'l` in a trough-section description.
7. Apply this naming rule to trough sections in every fixture unit, not only T01A.
8. Apply it only to components identified as trough sections; ordinary channel components retain their applicable description format.
9. In the Excel Shop BOM, make the process marker and quoted part number bold.

### Approved examples

```text
91 3/16" x 24 3/16" 16GA. (Laser/SM) Trough section "T01A-A"
91 1/4" x 24 3/16" 16GA. (Laser/SM) Trough section "T01A-B"
91 3/16" x 24 3/16" 16GA. (Laser/SM) Trough section "T01A-C"

91 3/16" x 24 3/16" 16GA. (Laser/SM) Trough section "T01B-A"
91 1/4" x 24 3/16" 16GA. (Laser/SM) Trough section "T01B-B"
91 3/16" x 24 3/16" 16GA. (Laser/SM) Trough section "T01B-C"
```

This document will contain only rules and standards explicitly approved by the user. Proposed conventions, assumptions, and items awaiting confirmation must not be added as standards.
