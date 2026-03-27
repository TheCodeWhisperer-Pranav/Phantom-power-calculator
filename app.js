/**
 * @module PhantomCalc
 * Pure calculation functions for the Phantom Power Cost Estimator.
 * Emission factor: BEE India / CEA CO2 Baseline Database 2023 — 0.82 kg CO2/kWh
 * Tree absorption: ~21 kg CO2/tree/year
 */
const PhantomCalc = (() => {
  const BEE_EMISSION_FACTOR = 0.82;
  const CO2_PER_TREE_KG     = 21;

  function calcAnnualKwh(watts, qty)      { return (watts * qty * 24 * 365) / 1000; }
  function calcAnnualCost(kwh, rate)      { return kwh * rate; }
  function calcMonthlyCost(annualCost)    { return annualCost / 12; }
  function calcCO2(kwh)                   { return kwh * BEE_EMISSION_FACTOR; }
  function calcTreeEquivalent(co2kg)      { return Math.ceil(co2kg / CO2_PER_TREE_KG); }

  return { calcAnnualKwh, calcAnnualCost, calcMonthlyCost, calcCO2, calcTreeEquivalent };
})();

// ── Utility ───────────────────────────────────────────────────────────────────

/** Returns a debounced version of fn that fires after `wait` ms of silence. */
function debounce(fn, wait) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); };
}

// ── Theme ─────────────────────────────────────────────────────────────────────

function initTheme() {
  const root        = document.documentElement;
  const btn         = document.getElementById("theme-toggle");
  const icon        = btn.querySelector(".theme-icon");
  const label       = btn.querySelector(".theme-label");
  const STORAGE_KEY = "phantom-theme";

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    const isDark = theme === "dark";
    btn.setAttribute("aria-pressed", String(isDark));
    btn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    icon.textContent  = isDark ? "☀️" : "🌙";
    label.textContent = isDark ? "Light Mode" : "Dark Mode";
  }

  const saved       = localStorage.getItem(STORAGE_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved ?? (prefersDark ? "dark" : "light"));

  btn.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    ChartManager.applyDarkMode(next === "dark");
  });
}

// ── State ─────────────────────────────────────────────────────────────────────

/** @type {{ appliances: Array<{id:string,qty:number,hours:number}>, electricityRate: number }} */
const State = { appliances: [], electricityRate: 8 };

function addAppliance(id, qty = 1, hours = 20) {
  const existing = State.appliances.find(a => a.id === id);
  if (existing) { existing.qty += qty; }
  else          { State.appliances.push({ id, qty, hours }); }
  render();
}

function removeAppliance(id) {
  State.appliances = State.appliances.filter(a => a.id !== id);
  render();
}

function updateRate(rate) {
  State.electricityRate = rate;
  render();
}

// ── Derived data ──────────────────────────────────────────────────────────────

function getTotals() {
  let totalWatts = 0, totalKwh = 0;
  State.appliances.forEach(entry => {
    const def = APPLIANCES.find(a => a.id === entry.id);
    if (!def) return;
    totalWatts += def.wattsStandby * entry.qty;
    totalKwh   += (def.wattsStandby * entry.qty * entry.hours * 365) / 1000;
  });
  const totalCost      = PhantomCalc.calcAnnualCost(totalKwh, State.electricityRate);
  const totalCO2       = PhantomCalc.calcCO2(totalKwh);
  const monthlyCost    = PhantomCalc.calcMonthlyCost(totalCost);
  const treeEquivalent = PhantomCalc.calcTreeEquivalent(totalCO2);
  return { totalWatts, totalKwh, totalCost, totalCO2, monthlyCost, treeEquivalent };
}

/**
 * Returns per-appliance breakdown sorted by annual cost descending.
 * FIX: `category` is now included so ChartManager can colour bars correctly.
 */
function getChartData() {
  return State.appliances
    .map(entry => {
      const def = APPLIANCES.find(a => a.id === entry.id);
      if (!def) return null;
      const kwh        = (def.wattsStandby * entry.qty * entry.hours * 365) / 1000;
      const annualCost = PhantomCalc.calcAnnualCost(kwh, State.electricityRate);
      return {
        id:          def.id,
        name:        def.name,
        icon:        def.icon,
        tip:         def.tip,
        category:    def.category,
        qty:         entry.qty,
        hours:       entry.hours,
        watts:       def.wattsStandby,
        kwh,
        annualCost,
        monthlyCost: PhantomCalc.calcMonthlyCost(annualCost),
        co2:         PhantomCalc.calcCO2(kwh),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.annualCost - a.annualCost);
}

// ── Render helpers ────────────────────────────────────────────────────────────

function fmt(n) { return "₹" + n.toFixed(2); }

/**
 * Animates a numeric counter using requestAnimationFrame + easeOutQuart easing.
 * @param {HTMLElement} el
 * @param {number} from  Starting value
 * @param {number} to    Target value
 * @param {number} duration ms (default 600)
 * @param {string} prefix  e.g. "₹"
 * @param {string} suffix  e.g. " kg" or " trees"
 */
function animateCounter(el, from, to, duration, prefix, suffix) {
  if (!el) return;
  duration = duration || 600;
  prefix   = prefix   || "";
  suffix   = suffix   || "";
  const start  = performance.now();
  const useInt = suffix.includes("tree");

  function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }

  function tick(now) {
    const progress  = Math.min((now - start) / duration, 1);
    const value     = from + (to - from) * easeOutQuart(progress);
    const formatted = useInt ? Math.round(value).toLocaleString("en-IN") : value.toFixed(2);
    el.textContent  = prefix + formatted + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const _prev = { totalCost: 0, monthlyCost: 0, totalCO2: 0, treeEquivalent: 0 };

// ── Filter / search ───────────────────────────────────────────────────────────

/**
 * Rebuilds the appliance <select> filtered by query text and active category.
 * @param {string} query
 * @param {string} category
 */
function filterAppliances(query, category) {
  const select = document.getElementById("device-select");
  if (!select) return;
  const q = query.trim().toLowerCase();
  const matches = APPLIANCES.filter(a => {
    const inCat    = category === "All" || a.category === category;
    const inSearch = !q || a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q);
    return inCat && inSearch;
  });

  select.innerHTML = "";
  if (matches.length === 0) {
    const opt = document.createElement("option");
    opt.value = ""; opt.disabled = true; opt.selected = true;
    opt.textContent = "No appliances found";
    select.appendChild(opt);
    return;
  }

  const grouped = {};
  matches.forEach(a => { (grouped[a.category] = grouped[a.category] || []).push(a); });
  Object.keys(grouped).forEach(cat => {
    const group = document.createElement("optgroup");
    group.label = cat;
    grouped[cat].forEach(a => {
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.dataset.category = a.category;
      opt.textContent = a.icon + "  " + a.name + "  (" + a.wattsStandby + " W)";
      group.appendChild(opt);
    });
    select.appendChild(group);
  });
}

// ── Tips ──────────────────────────────────────────────────────────────────────

const FALLBACK_TIPS = [
  { icon: "🔌", name: "Smart Power Strips",  text: "Use smart power strips to cut power to idle entertainment systems automatically." },
  { icon: "⏰", name: "Wi-Fi Router",         text: "Schedule your router to power down between midnight and 6 AM." },
  { icon: "⭐", name: "BEE Star Rating",      text: "Choose BEE 5-star rated appliances — they have stricter standby power limits." },
  { icon: "📡", name: "Set-Top Box",          text: "Your set-top box is likely your biggest standby offender — switch it off at the socket." },
];

function generateTips(rows) {
  const grid = document.getElementById("tips-grid");
  if (!grid) return;
  const frag = document.createDocumentFragment();

  if (rows.length === 0) {
    FALLBACK_TIPS.forEach(t => {
      const el = document.createElement("article");
      el.className = "tip-card";
      el.innerHTML = '<span class="tip-icon" aria-hidden="true">' + t.icon + '</span>'
        + '<span class="tip-appliance">' + t.name + '</span>'
        + '<span class="tip-text">' + t.text + '</span>';
      frag.appendChild(el);
    });
  } else {
    rows.slice(0, 3).forEach(row => {
      const el = document.createElement("article");
      el.className = "tip-card tip-card--vampire";
      el.innerHTML = '<span class="tip-icon" aria-hidden="true">💡</span>'
        + '<span class="tip-appliance">' + row.icon + " " + row.name + '</span>'
        + '<span class="tip-text">' + row.tip + '</span>'
        + '<span class="tip-savings">Unplugging saves <strong>' + fmt(row.annualCost) + '</strong>/year.</span>';
      frag.appendChild(el);
    });
    if (rows.length > 3) {
      const rest    = rows.slice(3);
      const savings = fmt(rest.reduce(function(s, r) { return s + r.annualCost; }, 0));
      const el      = document.createElement("article");
      el.className  = "tip-card tip-card--summary";
      el.innerHTML  = '<span class="tip-icon" aria-hidden="true">📊</span>'
        + '<span class="tip-appliance">+' + rest.length + ' more appliance' + (rest.length > 1 ? "s" : "") + '</span>'
        + '<span class="tip-text">Combined standby cost: <strong>' + savings + '/yr</strong>.</span>';
      frag.appendChild(el);
    }
  }

  grid.innerHTML = "";
  grid.appendChild(frag);
}

// ── Main render ───────────────────────────────────────────────────────────────

function render() {
  const rows    = getChartData();
  const listEl  = document.getElementById("appliance-list");
  const emptyEl = document.getElementById("empty-msg");

  // Appliance cards — DocumentFragment minimises reflows
  listEl.querySelectorAll(".appliance-card").forEach(function(c) { c.remove(); });

  if (rows.length === 0) {
    if (emptyEl) emptyEl.hidden = false;
  } else {
    if (emptyEl) emptyEl.hidden = true;
    const frag = document.createDocumentFragment();
    rows.forEach(function(row) {
      const card = document.createElement("article");
      card.className = "appliance-card";
      card.style.animation = "fadeInUp 300ms ease both";
      card.dataset.id = row.id;
      card.innerHTML = '<span class="card-icon" aria-hidden="true">' + row.icon + '</span>'
        + '<div class="card-body">'
        +   '<span class="card-name">' + row.name + '</span>'
        +   '<span class="card-watt-badge">' + row.watts + ' W standby</span>'
        +   '<span class="card-meta">' + row.qty + ' unit' + (row.qty > 1 ? "s" : "") + ' · ' + row.hours + ' hrs/day</span>'
        + '</div>'
        + '<div class="card-cost">'
        +   '<span class="card-annual">' + fmt(row.annualCost) + '/yr</span>'
        +   '<span class="card-monthly">' + fmt(row.monthlyCost) + '/mo</span>'
        + '</div>'
        + '<button class="remove-btn" aria-label="Remove ' + row.name + '" data-id="' + row.id + '" type="button">✕</button>';
      frag.appendChild(card);
    });
    listEl.appendChild(frag);
  }

  // Breakdown table — DocumentFragment
  const tbody = document.getElementById("device-list");
  const tFrag = document.createDocumentFragment();
  rows.forEach(function(row) {
    const tr = document.createElement("tr");
    tr.innerHTML = '<td>' + row.icon + ' ' + row.name + '</td>'
      + '<td>' + row.qty + '</td>'
      + '<td>' + row.watts + '</td>'
      + '<td>' + row.hours + '</td>'
      + '<td>' + fmt(row.monthlyCost) + '</td>'
      + '<td>' + fmt(row.annualCost) + '</td>'
      + '<td><button class="remove-btn" aria-label="Remove ' + row.name + '" data-id="' + row.id + '" type="button">✕</button></td>';
    tFrag.appendChild(tr);
  });
  tbody.innerHTML = "";
  tbody.appendChild(tFrag);

  // Metric counters
  const totals = getTotals();
  animateCounter(document.getElementById("total-yearly"),  _prev.totalCost,      totals.totalCost,      600, "₹", "");
  animateCounter(document.getElementById("total-monthly"), _prev.monthlyCost,    totals.monthlyCost,    600, "₹", "");
  animateCounter(document.getElementById("total-co2"),     _prev.totalCO2,       totals.totalCO2,       600, "",  " kg");
  animateCounter(document.getElementById("total-trees"),   _prev.treeEquivalent, totals.treeEquivalent, 600, "",  " trees");

  var tfMonthly = document.getElementById("tfoot-monthly");
  var tfYearly  = document.getElementById("tfoot-yearly");
  if (tfMonthly) tfMonthly.textContent = fmt(totals.monthlyCost);
  if (tfYearly)  tfYearly.textContent  = fmt(totals.totalCost);

  _prev.totalCost      = totals.totalCost;
  _prev.monthlyCost    = totals.monthlyCost;
  _prev.totalCO2       = totals.totalCO2;
  _prev.treeEquivalent = totals.treeEquivalent;

  generateTips(rows);
  ChartManager.updateCharts(rows);
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function showToast(message) {
  var toast = document.getElementById("app-toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("toast--visible");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function() { toast.classList.remove("toast--visible"); }, 2500);
}

// ── Share / encode state ──────────────────────────────────────────────────────

/**
 * Encodes current State into a base64 JSON URL parameter.
 * @returns {string} Full shareable URL
 */
function encodeState() {
  var payload = {
    r: State.electricityRate,
    a: State.appliances.map(function(e) { return { i: e.id, q: e.qty, h: e.hours }; }),
  };
  var b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  var url  = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("s", b64);
  return url.toString();
}

/**
 * Reads the `?s=` URL parameter and restores State from it.
 * Called once on page load. Silently ignores malformed data.
 */
function decodeState() {
  try {
    var params = new URLSearchParams(window.location.search);
    var b64    = params.get("s");
    if (!b64) return;
    var payload = JSON.parse(decodeURIComponent(escape(atob(b64))));
    if (payload.r && payload.r > 0) {
      State.electricityRate = payload.r;
      var rateInput = document.getElementById("rate");
      if (rateInput) rateInput.value = payload.r;
    }
    if (Array.isArray(payload.a)) {
      payload.a.forEach(function(item) {
        var def = APPLIANCES.find(function(a) { return a.id === item.i; });
        if (def) State.appliances.push({ id: item.i, qty: Math.max(1, item.q), hours: Math.min(24, Math.max(0, item.h)) });
      });
    }
  } catch (_) { /* malformed URL — ignore */ }
}

// ── Download report ───────────────────────────────────────────────────────────

function downloadReport() {
  var rows   = getChartData();
  var totals = getTotals();
  var date   = new Date().toLocaleDateString("en-IN", { dateStyle: "long" });
  var lines  = [
    "PHANTOM POWER COST REPORT",
    "Generated: " + date,
    "Electricity Rate: Rs." + State.electricityRate + "/kWh",
    "------------------------------------------------------------",
    ""
  ];

  if (rows.length === 0) {
    lines.push("No appliances added.");
  } else {
    lines.push("Appliance                            Qty      W  Hrs  Annual (Rs.)");
    lines.push("------------------------------------------------------------");
    rows.forEach(function(r) {
      var name = r.name.slice(0, 35);
      lines.push(
        name.padEnd(36) + String(r.qty).padStart(4) + String(r.watts).padStart(7)
        + String(r.hours).padStart(5) + r.annualCost.toFixed(2).padStart(13)
      );
    });
    lines.push("------------------------------------------------------------");
    lines.push("");
    lines.push("SUMMARY");
    lines.push("Annual Cost:     Rs." + totals.totalCost.toFixed(2));
    lines.push("Monthly Cost:    Rs." + totals.monthlyCost.toFixed(2));
    lines.push("CO2 Emitted:     " + totals.totalCO2.toFixed(2) + " kg/year");
    lines.push("Trees to Offset: " + totals.treeEquivalent);
  }

  var blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement("a");
  a.href = url; a.download = "phantom-power-report-" + Date.now() + ".txt";
  a.click();
  URL.revokeObjectURL(url);
}

// ── UI bootstrap ──────────────────────────────────────────────────────────────

(function() {
  initTheme();
  decodeState();

  var form       = document.getElementById("device-form");
  var select     = document.getElementById("device-select");
  var qtyInput   = document.getElementById("quantity");
  var hoursInput = document.getElementById("hours-standby");
  var rateInput  = document.getElementById("rate");
  var rateError  = document.getElementById("rate-error");

  // Build dropdown
  var categories = [];
  APPLIANCES.forEach(function(a) { if (categories.indexOf(a.category) === -1) categories.push(a.category); });
  categories.forEach(function(cat) {
    var group = document.createElement("optgroup");
    group.label = cat;
    APPLIANCES.forEach(function(a) {
      if (a.category !== cat) return;
      var opt = document.createElement("option");
      opt.value = a.id;
      opt.dataset.category = a.category;
      opt.textContent = a.icon + "  " + a.name + "  (" + a.wattsStandby + " W)";
      group.appendChild(opt);
    });
    select.appendChild(group);
  });

  // Restore shared state if decoded from URL
  if (State.appliances.length > 0) render();

  var activeCategory = "All";
  var searchInput    = document.getElementById("appliance-search");

  // Live search
  if (searchInput) {
    searchInput.addEventListener("input", function() {
      filterAppliances(searchInput.value, activeCategory);
    });
  }

  // Category tabs
  document.querySelector(".category-tabs").addEventListener("click", function(e) {
    var btn = e.target.closest(".tab-btn[data-category]");
    if (!btn) return;
    document.querySelectorAll(".category-tabs .tab-btn").forEach(function(b) {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
      b.setAttribute("aria-expanded", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    btn.setAttribute("aria-expanded", "true");
    activeCategory = btn.dataset.category;
    filterAppliances(searchInput ? searchInput.value : "", activeCategory);
  });

  // Rate validation
  function validateRate(val) {
    var invalid = !val || val <= 0;
    if (rateError) rateError.hidden = !invalid;
    if (rateInput) rateInput.setAttribute("aria-invalid", String(invalid));
    return !invalid;
  }

  // Debounced rate update — 300ms
  var debouncedUpdateRate = debounce(function(val) {
    if (validateRate(val)) updateRate(val);
  }, 300);

  rateInput.addEventListener("input", function() {
    var val = parseFloat(rateInput.value);
    validateRate(val);
    debouncedUpdateRate(val);
  });

  // Form submit
  form.addEventListener("submit", function(e) {
    e.preventDefault();
    var rateVal = parseFloat(rateInput.value);
    if (!validateRate(rateVal)) { rateInput.focus(); return; }
    var id = select.value;
    if (!id) return;
    var qty   = Math.max(1, parseInt(qtyInput.value) || 1);
    var hours = Math.min(24, Math.max(0, parseFloat(hoursInput.value) || 0));
    var isDuplicate = State.appliances.some(function(a) { return a.id === id; });
    addAppliance(id, qty, hours);
    if (isDuplicate) {
      var found = APPLIANCES.find(function(a) { return a.id === id; });
      showToast("Quantity updated for " + (found ? found.name : "appliance"));
    }
  });

  // Remove (delegated)
  document.addEventListener("click", function(e) {
    if (e.target.classList.contains("remove-btn")) {
      removeAppliance(e.target.dataset.id);
    }
  });

  // Chart tab switcher
  var chartTabsEl = document.querySelector(".chart-tabs[aria-label='Chart type']");
  if (chartTabsEl) {
    chartTabsEl.addEventListener("click", function(e) {
      var btn = e.target.closest(".tab-btn[data-chart]");
      if (!btn) return;
      chartTabsEl.querySelectorAll(".tab-btn").forEach(function(b) {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      ChartManager.switchTab(btn.dataset.chart);
    });
  }

  // Quantity stepper
  document.getElementById("qty-dec").addEventListener("click", function() {
    qtyInput.value = Math.max(1, parseInt(qtyInput.value || 1) - 1);
  });
  document.getElementById("qty-inc").addEventListener("click", function() {
    qtyInput.value = Math.min(99, parseInt(qtyInput.value || 1) + 1);
  });

  // Download report
  var dlBtn = document.getElementById("btn-download");
  if (dlBtn) dlBtn.addEventListener("click", downloadReport);

  // Copy link
  var shareBtn = document.getElementById("btn-share");
  if (shareBtn) {
    shareBtn.addEventListener("click", function() {
      var url = encodeState();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function() {
          showToast("Link copied! Share it to restore this exact list.");
        }).catch(function() { prompt("Copy this link:", url); });
      } else {
        prompt("Copy this link:", url);
      }
    });
  }

  // Footer year
  var yearEl = document.getElementById("footer-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(function() {});
  }
}());
