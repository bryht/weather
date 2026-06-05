# Weather · Rain Radar 🌧️

A [Buienradar](https://www.buienradar.nl/)-style weather app: live conditions,
an **animated rain radar**, a short-term precipitation graph, and hourly /
7-day forecasts for anywhere in the world.

🔗 **Live:** https://weather.bryht.net

## Features

- 🌧️ **Animated rain radar** — Leaflet map with past + nowcast frames from
  [RainViewer](https://www.rainviewer.com/), play/pause and a time scrubber.
- 📊 **Precipitation graph** — Buienradar's signature short-term (next ~2 h)
  rain forecast in 15-minute steps.
- 🌡️ **Current conditions** — temperature, feels-like, wind, humidity,
  pressure and precipitation.
- 🕐 **Hourly forecast** — next 24 hours with rain probability.
- 📅 **7-day forecast** — daily highs/lows with a temperature range bar.
- 🔍 **Location search** + 📍 **geolocation**, with your last place remembered.
- 🎨 Adaptive background that follows the current weather and day/night.

No API keys required — all data comes from the free
[Open-Meteo](https://open-meteo.com/) API (CORS-enabled).

## Tech stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) build tooling
- [Leaflet](https://leafletjs.com/) + [react-leaflet](https://react-leaflet.js.org/) for the radar map
- Data: [Open-Meteo](https://open-meteo.com/) (forecast + geocoding),
  [RainViewer](https://www.rainviewer.com/) (radar tiles)

## Local development

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check and produce the production build in dist/
npm run preview  # preview the production build locally
```

## Deployment (GitHub Pages + custom domain)

Every push to `main` triggers the
[`Deploy to GitHub Pages`](.github/workflows/deploy.yml) workflow, which builds
the app and publishes `dist/` to GitHub Pages.

The site is served from the custom domain **weather.bryht.net**. This is wired
up in two places:

1. **`public/CNAME`** — contains `weather.bryht.net`, copied into the build so
   GitHub Pages keeps the custom domain on every deploy.
2. **DNS** — a `CNAME` record for `weather` in the `bryht.net` zone pointing to
   `bryht.github.io.` (see setup below).

### One-time setup

1. In the repository, go to **Settings → Pages** and set **Source** to
   **GitHub Actions**.
2. Add the DNS record at your `bryht.net` provider:

   | Type  | Name      | Value               |
   | ----- | --------- | ------------------- |
   | CNAME | `weather` | `bryht.github.io.`  |

3. Back in **Settings → Pages**, set the **Custom domain** to
   `weather.bryht.net` and enable **Enforce HTTPS** once the certificate is
   issued.

After DNS propagates, the app is live at https://weather.bryht.net.

## Credits

- Weather & geocoding data © [Open-Meteo](https://open-meteo.com/) (CC BY 4.0)
- Radar imagery © [RainViewer](https://www.rainviewer.com/)
- Base map © [OpenStreetMap](https://www.openstreetmap.org/) contributors,
  tiles by [CARTO](https://carto.com/)
- Inspired by [Buienradar](https://www.buienradar.nl/)
