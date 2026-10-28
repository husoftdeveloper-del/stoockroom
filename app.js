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

// ---- Show / hide password (works for every .pw field) -------------------
document.querySelectorAll(".pw").forEach((wrap) => {
  const input = wrap.querySelector("input");
  const toggle = wrap.querySelector(".pw-toggle");
  if (!input || !toggle) return;

  toggle.addEventListener("click", () => {
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    toggle.textContent = showing ? "Show" : "Hide";
    toggle.setAttribute("aria-label", showing ? "Show password" : "Hide password");
    input.focus();
  });
});

// ---- Sign in / Create account tabs -------------------------------------
const tabs = document.querySelectorAll(".tab");
const panels = {
  signin: document.getElementById("panel-signin"),
  signup: document.getElementById("panel-signup"),
};
const footText = document.getElementById("foot-text");
const footSwitch = document.getElementById("foot-switch");

function setMode(mode, { focus = false } = {}) {
  tabs.forEach((tab) => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  panels.signin.hidden = mode !== "signin";
  panels.signup.hidden = mode !== "signup";
  footText.textContent = mode === "signin" ? "Don't have an account?" : "Already have an account?";
  footSwitch.textContent = mode === "signin" ? "Create one" : "Sign in";
  clearMsg();

  if (focus) {
    const first = (mode === "signin" ? panels.signin : panels.signup).querySelector("input");
    first?.focus();
  }
}

tabs.forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));
footSwitch.addEventListener("click", (e) => {
  e.preventDefault();
  setMode(panels.signin.hidden ? "signin" : "signup", { focus: true });
});

// ---- Message helper ----------------------------------------------------
const msg = document.getElementById("msg");
const signupMsg = document.getElementById("signup-msg");

function clearMsg() {
  [msg, signupMsg].forEach((el) => {
    if (!el) return;
    el.textContent = "";
    el.classList.remove("ok");
  });
}

function showError(el, text) {
  if (!el) return;
  el.classList.remove("ok");
  el.textContent = text;
  el.closest(".card")?.classList.add("shake");
  setTimeout(() => el.closest(".card")?.classList.remove("shake"), 420);
}

function showOk(el, text) {
  if (!el) return;
  el.classList.add("ok");
  el.textContent = text;
}

async function withBusy(button, busyLabel, task) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = busyLabel;
  try {
    return await task();
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

// ---- Sign in -----------------------------------------------------------
const form = document.getElementById("login-form");
const loginBtn = form.querySelector(".btn-primary");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMsg();

  await withBusy(loginBtn, "Signing in…", async () => {
    try {
      const user = await Auth.login({
        email: form.elements.email.value,
        password: form.elements.password.value,
        remember: form.elements.remember.checked,
      });

      showOk(msg, `Welcome back, ${user.name.split(" ")[0]}!`);

      const params = new URLSearchParams(location.search);
      const nextParam = params.get("next");
      const next = nextParam && /^[\w.-]+\.html$/.test(nextParam) ? nextParam : "dashboard.html";
      setTimeout(() => location.assign(next), 450);
    } catch (err) {
      showError(msg, err.message || "ننوتل ونشول. بیا هڅه وکړه.");
    }
  });
});

// ---- Create account ----------------------------------------------------
const signupForm = document.getElementById("signup-form");
const signupBtn = signupForm.querySelector(".btn-primary");
const strengthBar = document.getElementById("strength");

signupForm.elements.password?.addEventListener("input", () => {
  const value = signupForm.elements.password.value;
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/\d/.test(value) || /[^\w\s]/.test(value)) score++;
  strengthBar.dataset.score = String(score);
});

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMsg();

  await withBusy(signupBtn, "Creating…", async () => {
    try {
      const user = await Auth.register({
        name: signupForm.elements.name.value,
        email: signupForm.elements.email.value,
        password: signupForm.elements.password.value,
        confirm: signupForm.elements.confirm.value,
      });
      showOk(signupMsg, `حساب جوړ شو — ښه راغلاست ${user.name.split(" ")[0]}!`);
      setTimeout(() => location.assign("dashboard.html"), 500);
    } catch (err) {
      showError(signupMsg, err.message || "حساب جوړ نشو. بیا هڅه وکړه.");
    }
  });
});

// ---- Forgot password (local accounts: no email server available) --------
document.getElementById("forgot-link").addEventListener("click", (e) => {
  e.preventDefault();
  const email = form.elements.email.value.trim() || "your email";
  showError(
    msg,
    `د دې اپ حسابونه پر همدې وسیله دي، نو د بیا رغولو لینک نه شي لېږل کېدای. که پاسورډ هېر شو، له مدیر سره اړیکه ونیسه یا نوی حساب جوړ کړه (${email}).`
  );
});

// ---- Demo account autofill ---------------------------------------------
document.getElementById("demo-fill")?.addEventListener("click", () => {
  form.elements.email.value = Auth.DEMO.email;
  form.elements.password.value = Auth.DEMO.password;
  form.elements.password.dispatchEvent(new Event("input"));
  form.querySelector('button[type="submit"]').focus();
});

// ---- Session / URL state -----------------------------------------------
(async () => {
  // Already signed in? Go straight to the app.
  if (Auth.redirectIfLoggedIn()) return;

  // Make sure the demo account exists so the hint is never a lie.
  try {
    await Auth.seed();
  } catch {
    // crypto.subtle only exists in secure contexts (https / localhost).
    showError(
      msg,
      "د اپ امنیتي برخه نه شي چالانېدای. پاڼه دې له https یا localhost نه پرانیزل شي."
    );
  }

  const params = new URLSearchParams(location.search);
  if (params.get("expired")) showOk(msg, "ستا سیشن پای ته ورسېد — بیا ننوته.");
  if (params.get("signedout")) showOk(msg, "په ښه توګه ووتلې. بیا هم راشه!");

  const email = params.get("email");
  if (email) form.elements.email.value = email;
})();

// ---- PWA: service worker + auto-update --------------------------------
const installBtn = document.getElementById("install-btn");
const iosHint = document.getElementById("ios-hint");
const updateBar = document.getElementById("update-bar");
const updateBtn = document.getElementById("update-btn");
let deferredPrompt = null;

const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

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
      const hadController = !!navigator.serviceWorker.controller;

      const reg = await navigator.serviceWorker.register("sw.js", { updateViaCache: "none" });

      reg.addEventListener("updatefound", () => {
        const incoming = reg.installing;
        if (!incoming) return;
        incoming.addEventListener("statechange", () => {
          if (incoming.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateBar(incoming);
          }
        });
      });

      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!hadController || reloading) return;
        reloading = true;
        window.location.reload();
      });

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
      setInterval(checkForUpdate, 10 * 60 * 1000);
    } catch (err) {
      console.warn("Service worker registration failed:", err);
    }
  });
}

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
  showOk(msg, "Stoockroom installed — you can launch it from your home screen.");
});

if (isIOS && !isStandalone && !localStorage.getItem("ios-hint-dismissed")) {
  installBtn.hidden = true;
  iosHint.hidden = false;
}
document.querySelector(".ios-close")?.addEventListener("click", () => {
  iosHint.hidden = true;
  localStorage.setItem("ios-hint-dismissed", "1");
});

// Offline status
window.addEventListener("offline", () => showError(msg, "ته آفلاین یې — اپ له کېش نه کار کوي."));
