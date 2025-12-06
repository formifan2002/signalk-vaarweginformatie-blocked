# Copilot Instructions — signalk-vaarweginformatie-blocked

The goal: Make concise, actionable edits and improvements in this plugin with minimal back-and-forth. Focus on the plugin behaviour (fetching and exposing BLOCKED waterways, GPX export), its resource provider contract, and the configuration UI.

---

## Big picture

- This is a SignalK server plugin that fetches BLOCKED waterways and exposes them as:
  - A `ResourceSet` type named `Sperrungen` (German) or `Closures` (English) for single-location points (GeoJSON points).
  - Standard SignalK `routes` resources for multi-location blockages (GeoJSON LineString features).
- Main logic lives in `index.js`. The UI is a React component in `src/components/PluginConfigurationPanel.jsx`. Built assets live under `public/`.
- The plugin queries `https://www.vaarweginformatie.nl/frp/api/messages/nts/summaries` with query parameters built by `buildApiUrl()` and converts messages to a GeoJSON-like structure using `toGeoJSON()`.

## Critical code paths and functions

- `index.js`
  - `module.exports = function(app) { ... }` — plugin factory signature used by SignalK; `app` provides logging, router, and plugin lifecycle callbacks.
  - `start(options)`: initializes poll settings, constructs `doFetch()` and registers resource providers.
  - `doFetch()`: fetches API data, calls `toGeoJSON`, populates `cachedResourceSet` and `cachedRoutes`, and optionally writes GPX files.
  - `toGeoJSON(messages, movePointMeters, languageIsGerman, app)`: core data parsing and grouping; returns { points, routes }.
  - `formatLimitations(details, app)`: converts API limitation details to human-readable text. This has important code mappings—be careful when changing. Note: pass the `app` object when calling these top-level helpers, or move the function inside the `module.exports` closure if it needs direct access to `app`.
  - `generateRoutesGPX()` and `generateWaypointsGPX()`: create GPX export used by OpenCPN.
  - `app.registerResourceProvider(provider)`: two providers registered — one for points (`Sperrungen` / `Closuress`) and one for `routes`.

- `src/components/PluginConfigurationPanel.jsx`
  - React config UI used by SignalK Admin. Uses inline translations and saves via `save(config)` passed into component.
  - Area checkboxes: enabling "All areas" disables all other area selectors (this logic appears both in the UI and in the plugin: `All areas` => `[]` selectedIds).

## Workflow / build / test

- Default behavior to validate change locally:
  1. Build UI assets (if you've modified React code):

```bash
npm install
npm run build
```

- For quick iteration, update `public/` files or run `npm run build` to recompile UI bundle.
- Manual plugin install for local SignalK:

```bash
# from your repo root
cd ~/.signalk/node_modules
git clone <repo> signalk-vaarweginformatie-blocked
cd signalk-vaarweginformatie-blocked
npm install
systemctl restart signalk.service # or restart your local SignalK process
```

- Useful checks / debug:
  - SignalK logs: `journalctl -u signalk.service -f` — see `app.debug` / `app.error` messages
  - Endpoints registered (router) in plugin:
    - `GET /plugins/signalk-vaarweginformatie-blocked/config`
    - `POST /plugins/signalk-vaarweginformatie-blocked/configure`
    - `POST /plugins/signalk-vaarweginformatie-blocked/restart`
  - Resource endpoints:
    - Points: `GET /signalk/v2/api/resources/Sperrungen` or `/signalk/v2/api/resources/Closures`
    - Routes: `GET /signalk/v2/api/resources/routes`

## Patterns and conventions used in this repository

- Language default: **German** (options.language true by default). Keep this in mind when adding new UI text.
- Translations are inline in the React component — no i18n framework present. If adding strings, update both `de` and `en` translations in `src/components/PluginConfigurationPanel.jsx`.
- All network calls use `axios` with `Accept: application/json` header.
- The plugin uses **in-memory caching** (`cachedResourceSet`, `cachedRoutes`) and clears them on every update or `stop()`.
- Resource provider method conventions:
  - `listResources(params)`: returns mapping of resourceId to resource
  - `getResource(id, property)`: resolves to resource or property
  - `setResource` rejects (read-only resource provider)
  - `deleteResource` removes cached resource when plugin created it
- When adding features that change server-side resource shape, adapt both `cachedResourceSet.values.features` and the `routes` provider accordingly.

## Integration & external dependency notes

- External API: `vaarweginformatie.nl` — the plugin relies on `FTM` type messages and `limitationGroup` `BLOCKED`. Changes or schema differences in API require careful update to `toGeoJSON()`.
- GPX export uses `fs.writeFileSync` and is controlled by `openCpnGeoJsonPathRoutes` / `openCpnGeoJsonPathWaypoints`. Respect default empty paths; do not write files if path absent.
- Avoid adding heavy dependencies that increase the plugin footprint; the plugin expects to run on small devices (e.g., Raspberry Pi).

## Safety + Best Attempts

- Keep `formatLimitations` mapping intact or add mappings for new limitation codes. When encountering unknown codes, the function logs `app.debug('Unbekannter...')` so leave debug logs.
- Avoid blocking the main SignalK process; heavy data processing should remain async.
- Use `try/catch` around network calls — the plugin already logs `app.error` for fetch errors.

## Quick PR checklist for Copilot edits

- If UI changed, make sure to run `npm run build` and verify `public/` files updated.
- If you add a new config option, add default to `schema.properties` in `index.js` and add the control to `PluginConfigurationPanel.jsx` (translations, default value, and logic for saving and reading it).
- If you modify resource contents, update `public/` or API schema expectations: tests & logging.
- Use `app.debug` and `app.error` for consistent logging.
- Run plugin in a local SignalK instance or Dev Pi to validate plugin registration and endpoints.

---

If anything is unclear or you'd like more guidance on a specific part (e.g., adding tests, running a local dev server, or adding a new UI control), ask and I'll expand the instructions with code examples and step-by-step checks.