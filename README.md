# Stoockroom

Installable stock & inventory web app — a working sign-in flow, a guarded
dashboard, and offline support. Red dark theme by default.

## Sign in

| Account | Email | Password |
| --- | --- | --- |
| Demo (seeded automatically) | `admin@stoockroom.af` | `stoockroom123` |

Or hit **Create account** on the login screen — new accounts are stored on the
device and can sign in offline.

How the auth actually works (`auth.js`):

- Passwords are **never** stored in plain text: PBKDF2-SHA256, 150 000 rounds,
  random 16-byte salt per user, derived with `crypto.subtle`.
- Sessions are random 32-byte tokens with an expiry — 7 days with
  *Remember me* (`localStorage`), 12 hours without (`sessionStorage`).
- 5 wrong passwords lock that email for 60 seconds.
- `dashboard.html` is guarded by `Auth.requireAuth()`: no session → straight
  back to the login page, with `?next=` preserved.
- Change password from the dashboard user menu.

> Accounts live in this browser's storage, which is what makes the app work with
> no server (GitHub Pages has none). They are therefore per-device. Swapping
> `Auth` for an API/Supabase call later needs no UI changes.

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

## Tests

```bash
npm install      # once, for jsdom
npm test         # auth engine: hashing, sessions, lockout, validation (20 checks)
npm run test:ui  # login page + guarded dashboard in a DOM (34 checks)
```

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Login / create-account screen, PWA meta tags, install button |
| `dashboard.html` | Guarded dashboard: stats, inventory table, movements |
| `auth.js` | Sign-in engine: hashing, sessions, lockout, change password |
| `app.js` | Login wiring, tabs, theme switcher, SW + install flow |
| `dashboard.js` | Auth guard, rendering, filters, search, user menu |
| `styles.css` / `dashboard.css` | Theme system (5 themes) + layouts |
| `tests/` | Node test suites for auth and the UI |
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

## Getting new changes into the installed app

The installed app runs from the files on your machine (`localhost`), so GitHub
is only the source of changes — pull them in:

- **Windows:** double-click `update.bat`
- **macOS / Linux:** `bash update.sh`

That runs `git pull` and restarts the server. The app also checks for a new
service-worker version on focus and every 10 minutes, and shows an **Update**
bar when one is available.
