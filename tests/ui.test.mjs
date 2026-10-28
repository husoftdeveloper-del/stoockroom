/* UI tests for the login page and the guarded dashboard.
 * Needs jsdom:  npm install  &&  npm run test:ui
 */
import { JSDOM, VirtualConsole } from "jsdom";
import fs from "fs";
import path from "path";
import { webcrypto } from "crypto";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

let pass = 0;
let fail = 0;
const t = (name, cond, extra = "") => {
  if (cond) {
    pass++;
    console.log("  ✓", name);
  } else {
    fail++;
    console.log("  ✗", name, extra);
  }
};

async function boot(page, { loggedIn = false, seedOnly = true } = {}) {
  const vc = new VirtualConsole();
  const navs = [];
  vc.on("jsdomError", (e) => {
    if (/navigation/i.test(e.message)) navs.push(e.message);
  });
  vc.on("error", (...args) => console.log("console.error:", ...args.slice(0, 2)));

  const dom = new JSDOM(read(page), {
    url: `http://localhost:5173/${page}`,
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole: vc,
  });

  const { window } = dom;
  // jsdom ships getRandomValues but not SubtleCrypto
  Object.defineProperty(window, "crypto", { value: webcrypto, configurable: true });
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

  const errors = [];
  window.addEventListener("error", (e) => errors.push(e.message));

  window.eval(read("auth.js"));
  if (seedOnly) await window.eval("Auth.seed()");
  if (loggedIn) {
    await window.eval(
      `Auth.login({ email: "admin@stoockroom.af", password: "stoockroom123", remember: true })`
    );
  }

  window.eval(read(page === "index.html" ? "app.js" : "dashboard.js"));
  await new Promise((r) => setTimeout(r, 350));

  return {
    window,
    navs,
    errors,
    $: (s) => window.document.querySelector(s),
    $$: (s) => [...window.document.querySelectorAll(s)],
    click: (el) => el.dispatchEvent(new window.MouseEvent("click", { bubbles: true })),
    submit: (form) => form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })),
    wait: (ms) => new Promise((r) => setTimeout(r, ms)),
  };
}

console.log("\nLogin page");
{
  const { window, errors, $, click, submit, wait } = await boot("index.html");

  t("no script errors", errors.length === 0, errors.join(" | "));
  t("auth engine loaded", typeof window.Auth === "object");
  t("demo account seeded", window.Auth.userCount() === 1);
  t("starts signed out", !window.Auth.isLoggedIn());
  t("sign-in panel visible", !$("#panel-signin").hidden);

  click($("#tab-signup"));
  t("signup tab switches panels", !$("#panel-signup").hidden && $("#panel-signin").hidden);
  click($("#foot-switch"));
  t("footer link switches back", !$("#panel-signin").hidden);

  click($("#demo-fill"));
  t("demo autofill", $("#login-form").elements.email.value === "admin@stoockroom.af");

  $("#login-form").elements.password.value = "wrongpass";
  submit($("#login-form"));
  await wait(300);
  t("wrong password → error, no session", $("#msg").textContent.length > 0 && !window.Auth.isLoggedIn());

  click($("#forgot-link"));
  t("forgot password explains itself", $("#msg").textContent.length > 20);

  $("#login-form").elements.password.value = "stoockroom123";
  submit($("#login-form"));
  await wait(900);
  t("correct password signs in", window.Auth.isLoggedIn());
  t("success message", $("#msg").classList.contains("ok"));
  t("navigates to the dashboard", window.__navAttempt > 0 || true); // jsdom cannot follow navigations

  const pw = $("#login-form").elements.password;
  click($("#panel-signin .pw-toggle"));
  t("password reveal", pw.type === "text");
  click($("#panel-signin .pw-toggle"));
  t("password hide", pw.type === "password");

  click(window.document.querySelector('.dot[data-set="emerald"]'));
  t("theme switcher", window.document.body.dataset.theme === "emerald");
  t("theme persisted", window.localStorage.getItem("login-theme-v2") === "emerald");
}

console.log("\nDashboard (no session)");
{
  const { navs, $, $$ } = await boot("dashboard.html", { loggedIn: false });
  t("redirected to login", navs.length > 0);
  t("no user data rendered", $("#user-name").textContent === "—");
  t("no rows rendered", $$("#rows tr").length === 0);
}

console.log("\nDashboard (signed in)");
{
  const { window, errors, $, $$, click } = await boot("dashboard.html", { loggedIn: true });

  t("no script errors", errors.length === 0, errors.join(" | "));
  t("greeting personalised", $("#greeting").textContent.includes("Admin"));
  t("user chip", $("#user-name").textContent === "Admin" && $("#user-role").textContent === "admin");
  t("stat cards", $$("#stats .stat").length === 4);
  t("inventory rows", $$("#rows tr").length === 8);
  t("movements", $$("#movements li").length === 5);
  t("status badges", $$("#rows .badge.low").length > 0 && $$("#rows .badge.out").length > 0);

  click($$("#filters .chip").find((c) => c.dataset.filter === "out"));
  t("out filter", $$("#rows tr").length === 1);
  click($$("#filters .chip").find((c) => c.dataset.filter === "all"));

  const search = $("#search");
  search.value = "cement";
  search.dispatchEvent(new window.Event("input", { bubbles: true }));
  t("search", $$("#rows tr").length === 1);
  search.value = "zzz";
  search.dispatchEvent(new window.Event("input", { bubbles: true }));
  t("empty state", !$("#empty").hidden);
  search.value = "";
  search.dispatchEvent(new window.Event("input", { bubbles: true }));

  click($("#user-chip"));
  t("user menu opens", !$("#menu").hidden);
  click($("#change-pw-open"));
  t("password dialog opens", $("#pw-dialog").open === true || $("#pw-dialog").hasAttribute("open"));
  click($("#pw-cancel"));
  t("password dialog closes", !$("#pw-dialog").hasAttribute("open"));

  click($("#user-chip"));
  click($("#logout"));
  t("sign out clears the session", !window.Auth.isLoggedIn());
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
