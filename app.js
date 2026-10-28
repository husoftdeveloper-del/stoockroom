// ---- Theme switching ---------------------------------------------------
const dots = document.querySelectorAll(".dot");
const saved = localStorage.getItem("login-theme") || "emerald";

function applyTheme(name) {
  document.body.dataset.theme = name;
  localStorage.setItem("login-theme", name);
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
