import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { webcrypto } from "crypto";

const store = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _m: m,
  };
};


globalThis.btoa = (s) => Buffer.from(s, "binary").toString("base64");
globalThis.atob = (s) => Buffer.from(s, "base64").toString("binary");
globalThis.localStorage = store();
globalThis.sessionStorage = store();
globalThis.window = globalThis;
globalThis.location = { search: "", pathname: "/index.html", replace() {} };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const code = fs.readFileSync(path.join(ROOT, "auth.js"), "utf8");
eval(code);

let pass = 0, fail = 0;
const t = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗", name, extra); }
};

// seed
await Auth.seed();
t("seed creates demo user", Auth.userCount() === 1);

// wrong password
try { await Auth.login({ email: "admin@stoockroom.af", password: "wrong" }); t("wrong pw rejected", false); }
catch (e) { t("wrong pw rejected", /سم نه دی/.test(e.message), e.message); }

// correct login
const u = await Auth.login({ email: "ADMIN@stoockroom.af", password: "stoockroom123", remember: true });
t("login succeeds (case-insensitive email)", u.email === "admin@stoockroom.af");
t("session in localStorage when remember", !!localStorage.getItem("stoockroom.session.v1"));
t("no plaintext password stored", !JSON.stringify(localStorage._m.get("stoockroom.users.v1")).includes("stoockroom123"));
t("password hash is pbkdf2 b64", /^[A-Za-z0-9+/=]{44}$/.test(JSON.parse(localStorage._m.get("stoockroom.users.v1"))[0].hash));

// session survives a reload (user() re-reads storage)
t("user() restores session", Auth.isLoggedIn());

// logout
Auth.logout();
t("logout clears session", !Auth.isLoggedIn());

// non-remember session goes to sessionStorage only
await Auth.login({ email: "admin@stoockroom.af", password: "stoockroom123", remember: false });
t("tab session uses sessionStorage", !!sessionStorage.getItem("stoockroom.session.v1") && !localStorage.getItem("stoockroom.session.v1"));
Auth.logout();

// register validation
try { await Auth.register({ name: "A", email: "x@y.com", password: "12345678", confirm: "12345678" }); t("short name rejected", false); }
catch (e) { t("short name rejected", /نوم/.test(e.message)); }

try { await Auth.register({ name: "Ali Khan", email: "bad", password: "12345678", confirm: "12345678" }); t("bad email rejected", false); }
catch (e) { t("bad email rejected", /ایمیل/.test(e.message)); }

try { await Auth.register({ name: "Ali Khan", email: "ali@x.com", password: "short", confirm: "short" }); t("short pw rejected", false); }
catch (e) { t("short pw rejected", /۸/.test(e.message)); }

try { await Auth.register({ name: "Ali Khan", email: "ali@x.com", password: "longenough1", confirm: "different1" }); t("mismatch rejected", false); }
catch (e) { t("mismatch rejected", /سره سم/.test(e.message)); }

try { await Auth.register({ name: "Ali Khan", email: "admin@stoockroom.af", password: "longenough1", confirm: "longenough1" }); t("duplicate email rejected", false); }
catch (e) { t("duplicate email rejected", /دمخه/.test(e.message)); }

// successful registration logs you in
const newUser = await Auth.register({ name: "Ali Khan", email: "ali@x.com", password: "longenough1", confirm: "longenough1" });
t("register logs in", newUser.email === "ali@x.com" && Auth.isLoggedIn());
t("second user is member role", newUser.role === "member");

// change password
await Auth.changePassword({ current: "longenough1", next: "brandnew123" });
Auth.logout();
try { await Auth.login({ email: "ali@x.com", password: "longenough1" }); t("old pw stops working", false); }
catch { t("old pw stops working", true); }
const re = await Auth.login({ email: "ali@x.com", password: "brandnew123" });
t("new pw works", re.email === "ali@x.com");
Auth.logout();

// lockout after 5 failures
for (let i = 0; i < 5; i++) {
  try { await Auth.login({ email: "admin@stoockroom.af", password: "nope" + i }); } catch {}
}
try { await Auth.login({ email: "admin@stoockroom.af", password: "stoockroom123" }); t("lockout blocks even correct pw", false); }
catch (e) { t("lockout blocks even correct pw", /60|۶۰|ثانی/.test(e.message), e.message); }

// expired session
localStorage.setItem("stoockroom.session.v1", JSON.stringify({ token: "t", email: "admin@stoockroom.af", expiresAt: Date.now() - 1000 }));
t("expired session dropped", !Auth.isLoggedIn() && !localStorage.getItem("stoockroom.session.v1"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
