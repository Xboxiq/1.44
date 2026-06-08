# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

Static, data-driven web app for Baghdad Electricity subscriber service forms (31 forms, 4 departments). No backend or database — all runtime assets are committed in the repo. Optional `package.json` provides the skills CLI only (not a runtime dependency).

### Required services

| Service | Command | Notes |
|---------|---------|-------|
| Static HTTP server | `python3 -m http.server 8000` (from repo root) | **Required.** The app uses `fetch()` for `data/services.json` and templates; opening `index.html` via `file://` will not work. |

No other services are needed for development or end-to-end testing.

### Lint / validation

There is no ESLint or test suite. Use these manual checks:

```bash
npm run check
# or manually:
node --check assets/js/app.js
node --check assets/js/docxgen.js
python3 -c "import json; json.load(open('data/services.json'))"
```

### Running the app

1. Start the server: `python3 -m http.server 8000`
2. Open `http://localhost:8000/` in a browser
3. Hash routes: `#/` (home), `#/service/CS0001` (example form)

Use a tmux session for the dev server so it stays running across agent turns.

### Optional tooling

- **Python tools** (`tools/docx_extract.py`, `tools/docx_cells.py`): content extraction from source `.docx` files only; not needed at runtime.
- **Google Fonts CDN**: loaded from `fonts.googleapis.com` in `index.html`; app works offline except typography.
- **Node.js**: optional — `node --check` / `npm run check` syntax validation, or `npm run skills:install` for Cursor agent skills.
- **Word templates & flowcharts**: `data/templates/*.docx` and `data/flowcharts/*` — required for preview/flowchart tabs.

### Known non-blocking issues

- Google Fonts CDN required for Cairo/Tajawal typography when offline.
