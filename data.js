/**
 * APPLIANCES — Phantom / standby power dataset
 *
 * Standby wattage values are sourced from:
 *   • Bureau of Energy Efficiency (BEE), India — Standby Power Guidelines
 *   • Lawrence Berkeley National Laboratory (LBNL) — Standby Power Summary
 *   • IEA "Standby Power: The Next Action Item" report
 *
 * Values represent typical standby draw; actual consumption varies by
 * manufacturer, model year, and BEE star rating.
 */

const APPLIANCES = [
  // ── Entertainment ────────────────────────────────────────────────────────
  {
    id: "led-tv",
    name: "LED Television (32–43 in.)",
    category: "Entertainment",
    wattsStandby: 0.5,
    icon: "📺",
    tip: "Enable auto power-off so the TV shuts down after 30 minutes of inactivity.",
  },
  {
    id: "set-top-box",
    name: "Set-Top Box (DTH / Cable)",
    category: "Entertainment",
    wattsStandby: 15.0,
    icon: "📡",
    tip: "Set-top boxes are among India's biggest standby offenders — switch off at the power strip when not in use.",
  },
  {
    id: "dvd-player",
    name: "DVD / Blu-ray Player",
    category: "Entertainment",
    wattsStandby: 1.6,
    icon: "💿",
    tip: "Unplug when not in use; most players draw standby power even in 'off' mode.",
  },
  {
    id: "home-theatre",
    name: "Home Theatre / Soundbar",
    category: "Entertainment",
    wattsStandby: 5.4,
    icon: "🔊",
    tip: "Use a smart power strip so the soundbar cuts power whenever the TV is off.",
  },
  {
    id: "music-system",
    name: "Music System / Stereo",
    category: "Entertainment",
    wattsStandby: 4.8,
    icon: "🎵",
    tip: "Switch off at the mains after use; remote-standby mode keeps the receiver active all night.",
  },

  // ── Kitchen ──────────────────────────────────────────────────────────────
  {
    id: "microwave",
    name: "Microwave Oven",
    category: "Kitchen",
    wattsStandby: 3.1,
    icon: "🍲",
    tip: "The clock display alone draws ~3 W continuously — unplug when the kitchen is unused for long periods.",
  },
  {
    id: "refrigerator",
    name: "Refrigerator (Frost-Free, 250 L)",
    category: "Kitchen",
    wattsStandby: 10.0,
    icon: "🧊",
    tip: "Keep the condenser coils clean and maintain a 5 cm gap from the wall to reduce compressor cycling.",
  },
  {
    id: "electric-chimney",
    name: "Kitchen Chimney / Exhaust Hood",
    category: "Kitchen",
    wattsStandby: 2.0,
    icon: "🍳",
    tip: "Turn off the indicator light and controls at the wall switch after cooking.",
  },
  {
    id: "water-purifier",
    name: "Water Purifier (RO/UV)",
    category: "Kitchen",
    wattsStandby: 8.0,
    icon: "💧",
    tip: "Switch off the purifier at night; modern RO tanks hold enough water for morning use.",
  },
  {
    id: "electric-kettle",
    name: "Electric Kettle",
    category: "Kitchen",
    wattsStandby: 1.0,
    icon: "☕",
    tip: "Unplug immediately after use — the keep-warm element draws power even when idle.",
  },

  // ── Computing ────────────────────────────────────────────────────────────
  {
    id: "desktop-pc",
    name: "Desktop Computer",
    category: "Computing",
    wattsStandby: 21.1,
    icon: "🖥️",
    tip: "Enable S4 (hibernate) instead of S1/S3 sleep; hibernate cuts standby draw to near zero.",
  },
  {
    id: "laptop",
    name: "Laptop (charger plugged in)",
    category: "Computing",
    wattsStandby: 15.8,
    icon: "💻",
    tip: "Unplug the charger once the battery is full — idle chargers still draw 4–8 W.",
  },
  {
    id: "inkjet-printer",
    name: "Inkjet Printer",
    category: "Computing",
    wattsStandby: 5.3,
    icon: "🖨️",
    tip: "Turn off the printer at the power button, not just via software, to eliminate standby draw.",
  },
  {
    id: "ups-inverter",
    name: "UPS / Home Inverter",
    category: "Computing",
    wattsStandby: 20.0,
    icon: "🔋",
    tip: "Choose a high-efficiency inverter (≥90%) and keep the battery fully charged to minimise trickle losses.",
  },
  {
    id: "smart-speaker",
    name: "Smart Speaker / Voice Assistant",
    category: "Computing",
    wattsStandby: 2.0,
    icon: "🔈",
    tip: "Use the physical mute button when sleeping; the microphone array draws power continuously in listening mode.",
  },

  // ── Cooling ──────────────────────────────────────────────────────────────
  {
    id: "split-ac",
    name: "Split Air Conditioner (1.5 TR)",
    category: "Cooling",
    wattsStandby: 5.0,
    icon: "❄️",
    tip: "Switch off at the MCB during off-season months; the standby circuit draws power year-round.",
  },
  {
    id: "ceiling-fan",
    name: "Ceiling Fan (with remote/regulator)",
    category: "Cooling",
    wattsStandby: 3.0,
    icon: "🌀",
    tip: "Replace capacitor-type regulators with electronic regulators to cut standby and running losses.",
  },
  {
    id: "air-cooler",
    name: "Desert / Room Air Cooler",
    category: "Cooling",
    wattsStandby: 1.5,
    icon: "🌬️",
    tip: "Drain the water tank and unplug when not in use to avoid pump and control board standby draw.",
  },

  // ── Networking ───────────────────────────────────────────────────────────
  {
    id: "wifi-router",
    name: "Wi-Fi Router (Dual-Band)",
    category: "Networking",
    wattsStandby: 6.0,
    icon: "📶",
    tip: "Schedule the router to power down automatically between midnight and 6 AM using its built-in timer.",
  },
  {
    id: "network-switch",
    name: "Ethernet Switch / Modem",
    category: "Networking",
    wattsStandby: 4.5,
    icon: "🔌",
    tip: "Use an Energy Efficient Ethernet (IEEE 802.3az) switch to reduce idle port power by up to 50%.",
  },
];
