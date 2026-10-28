/* Stoockroom dashboard — guarded page.
 * Auth.requireAuth() runs first: without a valid session you never see this.
 */
const user = Auth.requireAuth();
if (user) init(user);

function init(user) {
  // Theme follows whatever was chosen on the login screen.
  document.body.dataset.theme = localStorage.getItem("login-theme-v2") || "rose";

  /* ---------- user chrome ---------------------------------------------- */
  const first = user.name.split(" ")[0];
  document.getElementById("user-name").textContent = first;
  document.getElementById("user-role").textContent = user.role || "member";
  document.getElementById("menu-name").textContent = user.name;
  document.getElementById("menu-email").textContent = user.email;
  document.getElementById("avatar").textContent = (first[0] || "U").toUpperCase();
  document.getElementById("greeting").textContent = `Welcome back, ${first}`;
  document.getElementById("today").textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const chip = document.getElementById("user-chip");
  const menu = document.getElementById("menu");
  chip.addEventListener("click", () => {
    const open = menu.hidden;
    menu.hidden = !open;
    chip.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (e) => {
    if (!menu.hidden && !e.target.closest(".user-menu")) {
      menu.hidden = true;
      chip.setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") menu.hidden = true;
  });

  document.getElementById("logout").addEventListener("click", () => {
    Auth.logout();
    location.replace("index.html?signedout=1");
  });

  /* ---------- demo inventory ------------------------------------------- */
  const ITEMS = [
    { name: "Cement bags 50kg", sku: "CEM-50", loc: "Kabul · A1", qty: 128, min: 40, unit: "bag" },
    { name: "Steel rebar 12mm", sku: "STL-12", loc: "Kabul · A2", qty: 18, min: 25, unit: "pc" },
    { name: "Paint — white 20L", sku: "PNT-W20", loc: "Herat · B1", qty: 0, min: 6, unit: "tin" },
    { name: "PVC pipe 3in", sku: "PVC-3", loc: "Kabul · C4", qty: 74, min: 20, unit: "pc" },
    { name: "Safety helmets", sku: "SAF-HLM", loc: "Mazar · D1", qty: 9, min: 15, unit: "pc" },
    { name: "Sand (truck load)", sku: "SND-TRK", loc: "Kabul · Yard", qty: 12, min: 3, unit: "load" },
    { name: "Bricks 9-hole", sku: "BRK-9", loc: "Kandahar · E2", qty: 2400, min: 500, unit: "pc" },
    { name: "Electrical cable 2.5mm", sku: "ELC-25", loc: "Herat · B3", qty: 4, min: 10, unit: "roll" },
  ];

  const MOVEMENTS = [
    { type: "in", qty: 60, item: "Cement bags 50kg", who: first, when: "2 hours ago", note: "Supplier delivery" },
    { type: "out", qty: 24, item: "PVC pipe 3in", who: "Site 4", when: "5 hours ago", note: "Issued to project" },
    { type: "out", qty: 6, item: "Safety helmets", who: "Site 2", when: "Yesterday", note: "Crew issue" },
    { type: "in", qty: 400, item: "Bricks 9-hole", who: first, when: "Yesterday", note: "Kiln batch #221" },
    { type: "out", qty: 2, item: "Electrical cable 2.5mm", who: "Site 1", when: "2 days ago", note: "Repair job" },
  ];

  const state = { filter: "all", query: "" };

  const statusOf = (i) => (i.qty === 0 ? "out" : i.qty <= i.min ? "low" : "ok");

  /* ---------- stats ----------------------------------------------------- */
  function renderStats() {
    const low = ITEMS.filter((i) => statusOf(i) === "low").length;
    const out = ITEMS.filter((i) => statusOf(i) === "out").length;
    const units = ITEMS.reduce((sum, i) => sum + i.qty, 0);

    const cards = [
      { label: "Items tracked", value: ITEMS.length, foot: `${units.toLocaleString()} units on hand` },
      { label: "Low stock", value: low, foot: "at or below minimum", cls: low ? "warn" : "" },
      { label: "Out of stock", value: out, foot: "needs restocking", cls: out ? "bad" : "" },
      { label: "Locations", value: new Set(ITEMS.map((i) => i.loc.split(" · ")[0])).size, foot: "across 3 cities" },
    ];

    document.getElementById("stats").innerHTML = cards
      .map(
        (c) => `
        <article class="stat ${c.cls || ""}">
          <div class="stat-label">${c.label}</div>
          <div class="stat-value">${c.value}</div>
          <div class="stat-foot">${c.foot}</div>
        </article>`
      )
      .join("");
  }

  /* ---------- table ----------------------------------------------------- */
  function renderRows() {
    const q = state.query.trim().toLowerCase();
    const rows = ITEMS.filter((i) => {
      const status = statusOf(i);
      if (state.filter === "low" && status !== "low") return false;
      if (state.filter === "out" && status !== "out") return false;
      if (!q) return true;
      return `${i.name} ${i.sku} ${i.loc}`.toLowerCase().includes(q);
    });

    const labels = { ok: "In stock", low: "Low", out: "Out" };

    document.getElementById("rows").innerHTML = rows
      .map(
        (i) => `
        <tr>
          <td>
            <div class="item">
              <span class="item-ico">${i.sku.slice(0, 2)}</span>
              <span>
                <div class="item-name">${i.name}</div>
                <div class="item-sku">${i.sku}</div>
              </span>
            </div>
          </td>
          <td>${i.loc}</td>
          <td class="num">${i.qty.toLocaleString()} <span style="color:var(--muted);font-size:11.5px">${i.unit}</span></td>
          <td><span class="badge ${statusOf(i)}">${labels[statusOf(i)]}</span></td>
        </tr>`
      )
      .join("");

    document.getElementById("empty").hidden = rows.length > 0;
  }

  /* ---------- movements ------------------------------------------------- */
  function renderMovements() {
    document.getElementById("movements").innerHTML = MOVEMENTS.map(
      (m) => `
      <li>
        <span class="mv-ico ${m.type === "in" ? "mv-in" : "mv-out"}">${m.type === "in" ? "↓" : "↑"}</span>
        <div class="mv-body">
          <p class="mv-title">${m.type === "in" ? "+" : "−"}${m.qty} · ${m.item}</p>
          <p class="mv-sub">${m.note} · ${m.who} · ${m.when}</p>
        </div>
      </li>`
    ).join("");
  }

  /* ---------- wiring ---------------------------------------------------- */
  document.getElementById("search").addEventListener("input", (e) => {
    state.query = e.target.value;
    renderRows();
  });

  document.querySelectorAll("#filters .chip").forEach((chip) =>
    chip.addEventListener("click", () => {
      state.filter = chip.dataset.filter;
      document.querySelectorAll("#filters .chip").forEach((c) => {
        const active = c === chip;
        c.classList.toggle("is-active", active);
        c.setAttribute("aria-selected", String(active));
      });
      renderRows();
    })
  );

  document.getElementById("refresh").addEventListener("click", (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    setTimeout(() => {
      renderStats();
      renderRows();
      renderMovements();
      btn.disabled = false;
    }, 350);
  });

  renderStats();
  renderRows();
  renderMovements();

  /* ---------- change password ------------------------------------------ */
  const dialog = document.getElementById("pw-dialog");
  const pwForm = document.getElementById("pw-form");
  const pwMsg = document.getElementById("pw-msg");

  // <dialog> is widely supported, but fall back to the `open` attribute for
  // older Safari builds that lack showModal().
  const openDialog = () =>
    typeof dialog.showModal === "function" ? dialog.showModal() : dialog.setAttribute("open", "");
  const closeDialog = () =>
    typeof dialog.close === "function" ? dialog.close() : dialog.removeAttribute("open");

  document.getElementById("change-pw-open").addEventListener("click", () => {
    menu.hidden = true;
    pwMsg.textContent = "";
    pwForm.reset();
    openDialog();
  });

  document.getElementById("pw-cancel").addEventListener("click", closeDialog);

  pwForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    pwMsg.classList.remove("ok");
    pwMsg.textContent = "";

    if (pwForm.elements.next.value !== pwForm.elements.confirm.value) {
      pwMsg.textContent = "نوي پاسورډونه سره سم نه دي.";
      return;
    }

    const btn = pwForm.querySelector(".btn-primary");
    btn.disabled = true;
    try {
      await Auth.changePassword({ current: pwForm.elements.current.value, next: pwForm.elements.next.value });
      pwMsg.classList.add("ok");
      pwMsg.textContent = "پاسورډ بدل شو.";
      setTimeout(closeDialog, 900);
    } catch (err) {
      pwMsg.textContent = err.message || "بدلون ونشول.";
    } finally {
      btn.disabled = false;
    }
  });

  /* ---------- session countdown ---------------------------------------- */
  // If the tab sits open past the session expiry, send the user back.
  const check = setInterval(() => {
    if (!Auth.isLoggedIn()) {
      clearInterval(check);
      location.replace("index.html?expired=1");
    }
  }, 30_000);
}
