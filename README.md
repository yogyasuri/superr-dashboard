# SupeRR Selector 2.0 — Pressure Performance Analytics (static site)

This folder is the complete, ready-to-host dashboard. It is plain HTML, CSS and JavaScript with no build step, server or database, and all data is bundled in `data.js`.

Open `index.html` locally to preview it.

## Host it (pick one)

**GitHub Pages**
1. Create a new GitHub repository and upload the *contents* of this folder (keep `.nojekyll`).
2. Repository → Settings → Pages → Source: "Deploy from a branch" → `main` / root → Save.
3. The site appears at `https://<your-username>.github.io/<repo-name>/` after a minute or two.

**Netlify (drag and drop)**
Go to https://app.netlify.com/drop and drop this whole folder. You get a public URL instantly.

**Vercel / Cloudflare Pages / any static host**
Create a project from this folder. Framework: "Other" / none. Build command: none. Output directory: `.` (root).

## Updating
The analysis project keeps the source at `final call/dashboard/`. After the data changes:
```
cd "final call/dashboard"
../../.venv/bin/python build_data.py   # rebuild data.js from the analysis outputs
./publish.sh                            # copy the refreshed site into this folder
```
Then re-upload or push this folder.

## Notes
- Hosting publicly makes everything in `data.js` public: player ratings, rankings and the sourced RR squad information. There is nothing private in it.
- Links inside the app use `#` routes, such as `#explorer?role=bowl&player=3644`, so they work on any host without server configuration.
- Chart.js 4.4.1 (MIT licence) is bundled in `vendor/`.
