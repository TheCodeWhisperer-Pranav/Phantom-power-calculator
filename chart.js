/**
 * @module ChartManager
 *
 * Manages Bar and Pie/Donut charts for the Phantom Power Cost Estimator
 * using Chart.js (loaded via CDN).
 *
 * Design decisions:
 *  - Charts lazy-initialise: bar on first "Bar" tab view, pie on first "Pie" tab view.
 *  - On render(), only the currently visible chart is updated; the other is
 *    marked stale and rebuilt on its next tab activation.
 *  - applyDarkMode() patches Chart.defaults and updates live instances so
 *    toggling the theme doesn't require a full page reload.
 */
const ChartManager = (() => {

  // ── Palette — mirrors CSS custom properties ──────────────────────────────
  // Values are read at runtime so they respect the active theme.
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  /** Per-category bar colours (index matches APPLIANCES category order). */
  const CATEGORY_COLORS = {
    Entertainment: "#0d9e7e",   // --clr-primary
    Kitchen:       "#f59e0b",   // --clr-accent
    Computing:     "#6366f1",   // indigo
    Cooling:       "#38bdf8",   // sky blue
    Networking:    "#f97316",   // --clr-warning
  };

  /** Donut segment palette — cycles if more items than colours. */
  const PIE_PALETTE = [
    "#0d9e7e", "#f59e0b", "#6366f1", "#38bdf8", "#f97316",
    "#22c55e", "#e879f9", "#fb7185", "#a78bfa", "#34d399",
  ];

  // ── Internal state ───────────────────────────────────────────────────────
  let barInstance  = null;   // Chart.js instance for bar chart
  let pieInstance  = null;   // Chart.js instance for pie/donut chart
  let lastData     = [];     // most recent data array passed to updateCharts()
  let activeTab    = "bar";  // "bar" | "pie"
  let pieStale     = true;   // pie needs rebuild on next activation
  let barStale     = false;  // bar is always initialised first

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Safely destroy a Chart.js instance. */
  function destroy(instance) {
    if (instance) { try { instance.destroy(); } catch (_) {} }
  }

  /** Read current theme. */
  function isDark() {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }

  /** Resolve text/grid colours from the live CSS variables. */
  function themeColors() {
    return {
      text:    cssVar("--clr-text")    || (isDark() ? "#e8eaf0" : "#1a2e2b"),
      muted:   cssVar("--clr-muted")   || (isDark() ? "#7b8099" : "#6b7f7c"),
      surface: cssVar("--clr-surface") || (isDark() ? "#1a1d27" : "#ffffff"),
      border:  cssVar("--clr-border")  || (isDark() ? "#2a2d3e" : "#d1dbd8"),
    };
  }

  /** Format a number as ₹ with no decimals for axis labels. */
  function fmtRupee(n) {
    return "₹" + Math.round(n).toLocaleString("en-IN");
  }

  // ── Bar chart ────────────────────────────────────────────────────────────

  /**
   * Initialises (or re-initialises) a horizontal bar chart.
   * Bars are sorted by annual cost descending and coloured by category.
   *
   * @param {string} canvasId - ID of the <canvas> element.
   * @param {Array}  data     - getChartData() output.
   */
  function initBarChart(canvasId, data) {
    destroy(barInstance);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const tc = themeColors();

    // Sort descending by cost (data already sorted, but be explicit)
    const sorted = [...data].sort((a, b) => b.annualCost - a.annualCost);

    const labels     = sorted.map(d => `${d.icon} ${d.name}`);
    const values     = sorted.map(d => d.annualCost);
    const bgColors   = sorted.map(d => CATEGORY_COLORS[d.category] ?? PIE_PALETTE[0]);
    const hoverColors = bgColors.map(c => c + "cc");  // slight transparency on hover

    barInstance = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Annual Cost (₹)",
          data: values,
          backgroundColor: bgColors,
          hoverBackgroundColor: hoverColors,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        indexAxis: "y",          // horizontal bars
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${fmtRupee(ctx.parsed.x)} / year`,
            },
            backgroundColor: tc.surface,
            titleColor: tc.text,
            bodyColor: tc.muted,
            borderColor: tc.border,
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            ticks: {
              color: tc.muted,
              callback: v => fmtRupee(v),
            },
            grid: { color: tc.border },
          },
          y: {
            ticks: { color: tc.text, font: { size: 12 } },
            grid:  { display: false },
          },
        },
      },
    });

    barStale = false;
  }

  // ── Pie / Donut chart ────────────────────────────────────────────────────

  /**
   * Initialises (or re-initialises) a donut chart with percentage labels
   * and a custom HTML legend rendered below the canvas.
   *
   * @param {string} canvasId  - ID of the <canvas> element.
   * @param {string} legendId  - ID of the <div> to render the HTML legend into.
   * @param {Array}  data      - getChartData() output.
   */
  function initPieChart(canvasId, legendId, data) {
    destroy(pieInstance);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const tc     = themeColors();
    const total  = data.reduce((s, d) => s + d.annualCost, 0);
    const labels = data.map(d => `${d.icon} ${d.name}`);
    const values = data.map(d => d.annualCost);
    const colors = data.map((_, i) => PIE_PALETTE[i % PIE_PALETTE.length]);

    pieInstance = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          hoverOffset: 10,
          borderWidth: 2,
          borderColor: tc.surface,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: "62%",
        plugins: {
          legend: { display: false },   // we render our own HTML legend
          tooltip: {
            callbacks: {
              label: ctx => {
                const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                return ` ${fmtRupee(ctx.parsed)} (${pct}%)`;
              },
            },
            backgroundColor: tc.surface,
            titleColor: tc.text,
            bodyColor: tc.muted,
            borderColor: tc.border,
            borderWidth: 1,
          },
        },
      },
    });

    // Render HTML legend
    renderPieLegend(legendId, data, colors, total, tc);
    pieStale = false;
  }

  /**
   * Renders a custom HTML legend for the donut chart.
   * @param {string} legendId
   * @param {Array}  data
   * @param {string[]} colors
   * @param {number} total
   * @param {object} tc - theme colours
   */
  function renderPieLegend(legendId, data, colors, total, tc) {
    const el = document.getElementById(legendId);
    if (!el) return;

    el.innerHTML = data.map((d, i) => {
      const pct = total > 0 ? ((d.annualCost / total) * 100).toFixed(1) : "0.0";
      return `
        <span class="pie-legend-item">
          <span class="pie-legend-swatch" style="background:${colors[i]}"></span>
          <span class="pie-legend-name">${d.icon} ${d.name}</span>
          <span class="pie-legend-pct">${pct}%</span>
        </span>`;
    }).join("");
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Updates charts with new data. Only the currently visible chart is
   * re-rendered immediately; the hidden chart is marked stale and will
   * rebuild on its next tab activation.
   *
   * @param {Array}  data      - getChartData() output.
   * @param {string} [tab]     - Override active tab ("bar" | "pie").
   */
  function updateCharts(data, tab) {
    lastData  = data;
    if (tab) activeTab = tab;

    if (activeTab === "bar") {
      initBarChart("bar-chart", data);
      pieStale = true;
    } else {
      initPieChart("pie-chart", "pie-legend", data);
      barStale = true;
    }
  }

  /**
   * Switches the visible chart tab. Lazy-initialises the target chart if
   * it hasn't been rendered yet or is stale.
   *
   * @param {"bar"|"pie"} tab
   */
  function switchTab(tab) {
    activeTab = tab;

    // Show / hide panels
    const barPanel = document.getElementById("chart-panel-bar");
    const piePanel = document.getElementById("chart-panel-pie");
    if (barPanel) { barPanel.hidden = tab !== "bar"; barPanel.classList.toggle("active", tab === "bar"); }
    if (piePanel) { piePanel.hidden = tab !== "pie"; piePanel.classList.toggle("active", tab === "pie"); }

    // Lazy-init or rebuild stale chart
    if (tab === "bar" && (barStale || !barInstance)) {
      initBarChart("bar-chart", lastData);
    } else if (tab === "pie" && (pieStale || !pieInstance)) {
      initPieChart("pie-chart", "pie-legend", lastData);
    }
  }

  /**
   * Updates chart colours for dark / light mode without full re-init.
   * Patches Chart.defaults and updates tooltip/scale colours on live instances.
   *
   * @param {boolean} dark
   */
  function applyDarkMode(dark) {
    const tc = themeColors();

    // Patch global defaults for future instances
    Chart.defaults.color = tc.muted;

    // Live-update bar chart
    if (barInstance) {
      barInstance.options.scales.x.ticks.color = tc.muted;
      barInstance.options.scales.x.grid.color  = tc.border;
      barInstance.options.scales.y.ticks.color = tc.text;
      barInstance.options.plugins.tooltip.backgroundColor = tc.surface;
      barInstance.options.plugins.tooltip.titleColor      = tc.text;
      barInstance.options.plugins.tooltip.bodyColor       = tc.muted;
      barInstance.options.plugins.tooltip.borderColor     = tc.border;
      barInstance.update("none");
    }

    // Live-update pie chart
    if (pieInstance) {
      pieInstance.data.datasets[0].borderColor = tc.surface;
      pieInstance.options.plugins.tooltip.backgroundColor = tc.surface;
      pieInstance.options.plugins.tooltip.titleColor      = tc.text;
      pieInstance.options.plugins.tooltip.bodyColor       = tc.muted;
      pieInstance.options.plugins.tooltip.borderColor     = tc.border;
      pieInstance.update("none");
    }
  }

  return { initBarChart, initPieChart, updateCharts, switchTab, applyDarkMode };
})();
