# Phantom Power Cost Estimator

A lightweight, dependency-free web app that estimates the electricity cost of devices left on standby (phantom/vampire power).

## Features

- Pre-loaded standby wattage data for 17 common household devices
- Add multiple devices with custom quantities and standby hours
- Set your local electricity rate ($/kWh)
- Live cost breakdown: daily, monthly, and yearly
- Canvas-based bar chart — no external chart libraries needed

## Usage

Open `index.html` directly in a browser. No build step or server required.

## Project Structure

```
├── index.html        # App shell (semantic HTML5)
├── css/
│   └── style.css     # Styles
└── js/
    ├── data.js       # Device standby wattage dataset
    ├── chart.js      # Canvas bar chart renderer
    └── app.js        # App logic (form, table, cost calculations)
```

## Cost Formula

```
Daily cost = (watts × qty × hours/day) ÷ 1000 × rate ($/kWh)
```

## Data Sources

Standby power values are approximate, sourced from ENERGY STAR and Lawrence Berkeley National Laboratory estimates.
