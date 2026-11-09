# Development roadmap

| Milestone | Deliverable | Status |
|---|---|---|
| M1 | Define input data and engineering rules | In progress |
| M2 | Node.js application scaffold and local run | Started |
| M3 | Project and fixture data entry | Prototype |
| M4 | DXF filename parser | Initial prototype; needs test cases |
| M5 | Component register and validation | Planned |
| M6 | Draft eBOM/mBOM generation and review | Planned |
| M7 | Configurable Excel/PDF templates | Planned |
| M8 | Consolidated cutting list | Planned |
| M9 | PostgreSQL persistence and revision history | Planned |
| M10 | DXF metadata/geometry extraction | Later |

## First validation set
Use T01A and T01B from Aritzia Menlo Park project 2605. Validate parser output against the supplied filenames, then reconcile component quantities and descriptions against approved drawings. Do not infer material grade or gauge from C11/C16 until the project mapping is confirmed.
