// ---- Theme switching ---------------------------------------------------
const dots = document.querySelectorAll(".dot");
const saved = localStorage.getItem("login-theme-v2") || "rose";

function applyTheme(name) {
  document.body.dataset.theme = name;
  localStorage.setItem("login-theme-v2", name);
  dots.forEach((d) => d.setAttribute("aria-pressed", String(d.dataset.set === name)));
}

applyTheme(saved);
dots.forEach((dot) => dot.addEventListener("click", () => applyTheme(dot.dataset.set)));

// ---- Show / hide password ----------------------------------------------
const pwInput = document.querySelector('input[name="password"]');
const pwToggle = document.querySelector(".pw-toggle");

pwToggle.addEventListener("click", () => {
  const showing = pwInput.type === "text";
  pwInput.type = showing ? "password" : "text";
  pwToggle.textContent = showing ? "Show" : "Hide";
  pwToggle.setAttribute("aria-label", showing ? "Show password" : "Hide password");
  pwInput.focus();
});

// ---- Form submit (no backend yet) --------------------------------------
const form = document.getElementById("login-form");
const msg = document.getElementById("msg");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  msg.classList.remove("ok");
  msg.textContent = "";

  const email = form.email.value.trim();
  const password = form.password.value;

  if (!email) return (msg.textContent = "Please enter your email address.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return (msg.textContent = "That email address doesn't look right.");
  if (password.length < 6)
    return (msg.textContent = "Password must be at least 6 characters.");

  const btn = form.querySelector(".btn-primary");
  btn.disabled = true;
  btn.textContent = "Signing in…";

  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = "Sign in";
    msg.classList.add("ok");
    msg.textContent = "Looks good — ready to connect to the backend.";
  }, 700);
});

// ---- PWA: service worker + install flow --------------------------------
const installBtn = document.getElementById("install-btn");
const iosHint = document.getElementById("ios-hint");
let deferredPrompt = null;

const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

// ---- PWA: service worker + auto-update --------------------------------
const updateBar = document.getElementById("update-bar");
const updateBtn = document.getElementById("update-btn");

function showUpdateBar(worker) {
  updateBar.hidden = false;
  updateBtn.onclick = () => {
    updateBtn.disabled = true;
    updateBtn.textContent = "Updating…";
    worker.postMessage("SKIP_WAITING");
  };
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      // If a worker already controls this page, a controllerchange means we
      // just picked up a new version -> reload. On the very first visit there
      // is no controller yet, and we must NOT reload.
      const hadController = !!navigator.serviceWorker.controller;

      const reg = await navigator.serviceWorker.register("sw.js", { updateViaCache: "none" });

      // A new version finished installing and is waiting to take over.
      reg.addEventListener("updatefound", () => {
        const incoming = reg.installing;
        if (!incoming) return;
        incoming.addEventListener("statechange", () => {
          if (incoming.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateBar(incoming);
          }
        });
      });

      // Reload once the new worker takes control.
      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!hadController || reloading) return;
        reloading = true;
        window.location.reload();
      });

      // Check for a new version whenever the app regains focus (throttled).
      let lastCheck = 0;
      const checkForUpdate = () => {
        const now = Date.now();
        if (now - lastCheck < 60_000) return;
        lastCheck = now;
        reg.update().catch(() => {});
      };
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate();
      });
      window.addEventListener("focus", checkForUpdate);

      // Also look for a new version on a timer while the app stays open.
      setInterval(checkForUpdate, 10 * 60 * 1000);
    } catch (err) {
      console.warn("Service worker registration failed:", err);
    }
  });
}

// Chrome / Edge / Android: native install prompt
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!isStandalone) installBtn.hidden = false;
});

installBtn?.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});

window.addEventListener("appinstalled", () => {
  installBtn.hidden = true;
  iosHint.hidden = true;
  msg?.classList.add("ok");
  if (msg) msg.textContent = "Stoockroom installed — you can launch it from your home screen.";
});

// iOS Safari has no install event: show manual instructions once
if (isIOS && !isStandalone && !localStorage.getItem("ios-hint-dismissed")) {
  installBtn.hidden = true;
  iosHint.hidden = false;
}
document.querySelector(".ios-close")?.addEventListener("click", () => {
  iosHint.hidden = true;
  localStorage.setItem("ios-hint-dismissed", "1");
});

// Offline / online status
window.addEventListener("offline", () => {
  if (!msg) return;
  msg.classList.remove("ok");
  msg.textContent = "You're offline — the app still works from cache.";
});
