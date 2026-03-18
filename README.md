# HackIdle

An incremental clicker game for hackers. Accumulate **bits** by clicking and buying upgrades; automate the grind with passive income.

## How to play

1. Open `index.html` in a browser (or run a local server).
2. Click **HACK** to earn bits.
3. Buy upgrades to increase bits per click or gain bits per second.
4. Progress is auto-saved every 30 seconds; use **Save** to save now or **Reset** to start over.

## Run locally

```bash
# From project root, e.g. with Python:
python -m http.server 8080
# Then open http://localhost:8080
```

Or open `index.html` directly in your browser.

## Tests

```bash
npm test
```

## Publish on GitHub

1. Commit and push:

   ```bash
   git add .
   git commit -m "Add HackIdle game"
   git push -u origin main
   ```

2. **Optional — play in the browser (GitHub Pages)**  
   In the repo on GitHub: **Settings → Pages → Build and deployment → Source**: *Deploy from a branch*, branch **main**, folder **/ (root)**.  
   After a minute, the game will be at `https://<your-username>.github.io/hackidle/` (repo name must match the URL path unless you use a custom domain).
