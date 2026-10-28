/* Stoockroom auth engine
 * ---------------------------------------------------------------------------
 * A real, working sign-in flow that runs entirely in the browser:
 *   - passwords are never stored in plain text (PBKDF2-SHA256, 150k rounds,
 *     random 16-byte salt per user)
 *   - sessions are signed-ish tokens with an expiry, kept in localStorage
 *     ("remember me") or sessionStorage (until the tab closes)
 *   - the dashboard is guarded: no session -> bounced back to the login page
 *
 * Accounts live in this browser's localStorage. That makes the app work with
 * zero infrastructure (GitHub Pages has no server), but it also means accounts
 * are per-device. Swap `Auth.store` for an API/Supabase call later and the
 * rest of the UI keeps working unchanged.
 */
(function (global) {
  "use strict";

  const USERS_KEY = "stoockroom.users.v1";
  const SESSION_KEY = "stoockroom.session.v1";
  const LOCK_KEY = "stoockroom.lock.v1";

  const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days when "remember me"
  const TAB_TTL = 12 * 60 * 60 * 1000; // 12 hours for a plain sign-in
  const MAX_ATTEMPTS = 5;
  const LOCK_MS = 60 * 1000; // 60s cool-down after 5 bad passwords

  const DEMO = { name: "Admin", email: "admin@stoockroom.af", password: "stoockroom123" };

  /* ---------- small helpers ---------------------------------------------- */
  const enc = new TextEncoder();

  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));

  const randomHex = (bytes = 32) =>
    Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  const normEmail = (email) => String(email || "").trim().toLowerCase();
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  async function hashPassword(password, saltB64) {
    const salt = unb64(saltB64);
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" },
      keyMaterial,
      256
    );
    return b64(bits);
  }

  // constant-time-ish comparison
  function safeEqual(a, b) {
    if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  /* ---------- storage ----------------------------------------------------- */
  function readUsers() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function writeUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function readSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeSession(session, remember) {
    const payload = JSON.stringify(session);
    if (remember) {
      localStorage.setItem(SESSION_KEY, payload);
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, payload);
      localStorage.removeItem(SESSION_KEY);
    }
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }

  /* ---------- lock-out after repeated failures ---------------------------- */
  function readLock() {
    try {
      return JSON.parse(localStorage.getItem(LOCK_KEY) || "null");
    } catch {
      return null;
    }
  }

  function writeLock(value) {
    if (!value) localStorage.removeItem(LOCK_KEY);
    else localStorage.setItem(LOCK_KEY, JSON.stringify(value));
  }

  function lockedFor(email) {
    const lock = readLock();
    if (!lock || lock.email !== normEmail(email)) return 0;
    const left = lock.until - Date.now();
    return left > 0 ? left : 0;
  }

  function registerFailure(email) {
    const key = normEmail(email);
    const lock = readLock();

    //  until === 0 means "counting, not locked yet"; only a past timestamp ends a lock
    const lockExpired = lock && lock.until > 0 && lock.until < Date.now();

    if (!lock || lock.email !== key || lockExpired) {
      writeLock({ email: key, count: 1, until: 0 });
      return { attemptsLeft: MAX_ATTEMPTS - 1, lockMs: 0 };
    }

    const count = lock.count + 1;
    if (count >= MAX_ATTEMPTS) {
      writeLock({ email: key, count: 0, until: Date.now() + LOCK_MS });
      return { attemptsLeft: 0, lockMs: LOCK_MS };
    }

    writeLock({ email: key, count, until: 0 });
    return { attemptsLeft: MAX_ATTEMPTS - count, lockMs: 0 };
  }

  function clearFailures() {
    writeLock(null);
  }

  /* ---------- public API -------------------------------------------------- */
  const Auth = {
    DEMO,
    SESSION_TTL,
    TAB_TTL,

    /** Create the demo account once, so a fresh install can sign in. */
    async seed() {
      const users = readUsers();
      if (users.some((u) => u.email === DEMO.email)) return;

      const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
      users.push({
        name: DEMO.name,
        email: DEMO.email,
        salt,
        hash: await hashPassword(DEMO.password, salt),
        role: "admin",
        createdAt: Date.now(),
        demo: true,
      });
      writeUsers(users);
    },

    async register({ name, email, password, confirm }) {
      name = String(name || "").trim();
      email = normEmail(email);
      password = String(password || "");

      if (name.length < 2) throw new Error("خپل بشپړ نوم ولیکه.");
      if (!isEmail(email)) throw new Error("د ایمیل پته سمه نه ده.");
      if (password.length < 8) throw new Error("پاسورډ باید لږ تر لږه ۸ حروف وي.");
      if (password !== confirm) throw new Error("پاسورډونه سره سم نه دي.");

      const users = readUsers();
      if (users.some((u) => u.email === email))
        throw new Error("دا ایمیل لا دمخه ثبت شوی دی. د ننوتلو هڅه وکړه.");

      const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
      const user = {
        name,
        email,
        salt,
        hash: await hashPassword(password, salt),
        role: users.length === 0 ? "admin" : "member",
        createdAt: Date.now(),
      };
      users.push(user);
      writeUsers(users);

      return this.login({ email, password, remember: true });
    },

    async login({ email, password, remember = false }) {
      email = normEmail(email);
      password = String(password || "");

      if (!email) throw new Error("د ایمیل پته ولیکه.");
      if (!isEmail(email)) throw new Error("د ایمیل پته سمه نه ده.");
      if (!password) throw new Error("پاسورډ ولیکه.");

      const left = lockedFor(email);
      if (left) {
        const secs = Math.ceil(left / 1000);
        throw new Error(`ډېر ځله ناسم پاسورډ — ${secs} ثانیې وروسته بیا هڅه وکړه.`);
      }

      await this.seed();
      const user = readUsers().find((u) => u.email === email);
      const hash = user ? await hashPassword(password, user.salt) : null;

      if (!user || !safeEqual(hash, user.hash)) {
        const { attemptsLeft, lockMs } = registerFailure(email);
        if (lockMs) throw new Error("ډېر ځله ناسم پاسورډ — ۶۰ ثانیې وروسته بیا هڅه وکړه.");
        throw new Error(
          attemptsLeft > 0
            ? `ایمیل یا پاسورډ سم نه دی. (${attemptsLeft} هڅې پاتې دي)`
            : "ایمیل یا پاسورډ سم نه دی."
        );
      }

      clearFailures();

      const session = {
        token: randomHex(32),
        email: user.email,
        name: user.name,
        role: user.role,
        issuedAt: Date.now(),
        expiresAt: Date.now() + (remember ? SESSION_TTL : TAB_TTL),
        remember: Boolean(remember),
      };
      writeSession(session, remember);
      return this.user();
    },

    /** Current signed-in user, or null. Expired sessions are dropped. */
    user() {
      const session = readSession();
      if (!session || !session.token || !session.email) return null;

      if (!session.expiresAt || session.expiresAt < Date.now()) {
        clearSession();
        return null;
      }

      const user = readUsers().find((u) => u.email === session.email);
      if (!user) {
        clearSession();
        return null;
      }

      return {
        name: session.name || user.name,
        email: user.email,
        role: user.role,
        issuedAt: session.issuedAt,
        expiresAt: session.expiresAt,
        remember: session.remember,
      };
    },

    isLoggedIn() {
      return Boolean(this.user());
    },

    logout() {
      clearSession();
    },

    /** Redirect to the login page unless a valid session exists. */
    requireAuth(loginUrl = "index.html") {
      const user = this.user();
      if (user) return user;
      const here = location.pathname.split("/").pop() || "dashboard.html";
      location.replace(`${loginUrl}?next=${encodeURIComponent(here)}&expired=1`);
      return null;
    },

    /** Send an already signed-in visitor straight to the app. */
    redirectIfLoggedIn(target = "dashboard.html") {
      if (!this.user()) return false;
      const params = new URLSearchParams(location.search);
      const next = params.get("next");
      const safe = next && /^[\w.-]+\.html$/.test(next) ? next : target;
      location.replace(safe);
      return true;
    },

    async changePassword({ current, next }) {
      const session = this.user();
      if (!session) throw new Error("لومړی د ننوتلو هڅه وکړه.");

      const users = readUsers();
      const user = users.find((u) => u.email === session.email);
      if (!user) throw new Error("حساب ونه موندل شو.");

      const currentHash = await hashPassword(String(current || ""), user.salt);
      if (!safeEqual(currentHash, user.hash)) throw new Error("اوسنی پاسورډ سم نه دی.");
      if (String(next || "").length < 8) throw new Error("نوی پاسورډ باید ۸ حروف وي.");

      const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
      user.salt = salt;
      user.hash = await hashPassword(String(next), salt);
      writeUsers(users);
      return true;
    },

    userCount() {
      return readUsers().length;
    },
  };

  global.Auth = Auth;
})(window);
