# Stoockroom

Installable stock & inventory web app. Login screen with an Emerald dark theme.

## Run locally

```bash
python3 serve.py 5173
# open http://localhost:5173
```

`serve.py` is a tiny static server that sends the right MIME types
(`application/manifest+json` for the manifest, `text/javascript` for the
service worker) — a plain `python3 -m http.server` will break PWA install.

## Install as an app (PWA)

The page is a Progressive Web App, so it can be installed like a native app
and works offline after the first load.

- **Chrome / Edge / Android:** an **Install app** button appears in the top
  right (or use the install icon in the address bar). On Android use
  *⋮ → Add to Home screen*.
- **iPhone / iPad (Safari):** tap **Share → Add to Home Screen** (a hint shows
  automatically on iOS).
- **Desktop:** installs as a standalone window with its own dock/taskbar icon.

> Installation requires **HTTPS** or **localhost**. Opening `index.html`
> directly via `file://` will show the page but cannot install.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Login screen, PWA meta tags, install button |
| `styles.css` | Theme system (5 color themes) + layout |
| `app.js` | Show/hide password, validation, theme switcher, SW + install flow |
| `sw.js` | Service worker, offline cache |
| `manifest.webmanifest` | App name, icons, standalone display |
| `icons/` | App icons (SVG + PNG 192/512/maskable/apple-touch) |
| `serve.py` | Local dev server with correct MIME types |

## Change the colors

Themes live in `styles.css` — five accent pairs: `indigo`, `emerald`, `rose`,
`amber`, `slate`. Set the default in `index.html` (`<body data-theme="...">`)
and in `app.js` (`localStorage.getItem("login-theme") || "emerald"`).
You can also switch themes live with the swatches at the bottom of the page.

## Install on your laptop

1. Get the files: `git clone https://github.com/husoftdeveloper-del/stoockroom.git` (or download the ZIP) and check out `arena/20252ded-stoockroom`.
2. Start the local server:
   - **Windows:** double-click `start.bat`
   - **macOS / Linux:** `bash start.sh`
3. The browser opens `http://localhost:5173`.
4. Click **Install app** (top right) or the install icon in the address bar → **Install**.

The app then opens in its own window and gets an entry in the Start Menu /
Applications / Dock. Installation requires `localhost` or HTTPS — opening
`index.html` via `file://` will not install.

Full guide (Pashto + English, including phone install and updates): **[INSTALL.md](INSTALL.md)**.
