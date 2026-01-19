const fs = require("fs");
const path = require("path");
let pendingRouter = null;

module.exports = function (app) {
	let realPlugin = null;
	const openapi = JSON.parse(
		fs.readFileSync(path.join(__dirname, "openApi.json"), "utf8"),
	);

	const wrapper = {
		id: "signalk-vaarweginformatie-blocked",
		name: "Vaarweginformatie BLOCKED",
		description: "Fetches blocked waterways from vaarweginformatie.nl",
		schema: {
			type: "object",
			properties: {
				language: {
					type: "boolean",
					title: "Sprache: Deutsch (Language: German / Taal: Duits)",
					default: true,
					description:
						"Wenn deaktiviert: Englisch (If disabled: English / Indien uitgeschakeld: Engels)",
				},
				"All areas": {
					type: "boolean",
					title: "Alle Gebiete (All areas / Alle gebieden)",
					default: true,
				},
				"Algemeen Nederland": {
					type: "boolean",
					title:
						"Allgemein Niederlande (General Netherlands / Algemeen Nederland)",
					default: false,
				},
				Noordzee: {
					type: "boolean",
					title: "Nordsee (North Sea / Noordzee)",
					default: false,
				},
				Eems: { type: "boolean", title: "Ems (Ems / Eems)", default: false },
				Waddenzee: {
					type: "boolean",
					title: "Wattenmeer (Wadden Sea / Waddenzee)",
					default: false,
				},
				Groningen: {
					type: "boolean",
					title: "Groningen (Groningen / Groningen)",
					default: false,
				},
				Fryslan: {
					type: "boolean",
					title: "Friesland (Friesland / Fryslan)",
					default: false,
				},
				Drenthe: {
					type: "boolean",
					title: "Drenthe (Drenthe / Drenthe)",
					default: false,
				},
				Overijssel: {
					type: "boolean",
					title: "Overijssel (Overijssel / Overijssel)",
					default: false,
				},
				Gelderland: {
					type: "boolean",
					title: "Gelderland (Gelderland / Gelderland)",
					default: false,
				},
				Ijsselmeer: {
					type: "boolean",
					title: "IJsselmeer (IJsselmeer / IJsselmeer)",
					default: false,
				},
				Flevoland: {
					type: "boolean",
					title: "Flevoland (Flevoland / Flevoland)",
					default: false,
				},
				Utrecht: {
					type: "boolean",
					title: "Utrecht (Utrecht / Utrecht)",
					default: false,
				},
				"Noord-Holland": {
					type: "boolean",
					title: "Nordholland (North Holland / Noord-Holland)",
					default: false,
				},
				"Zuid-Holland": {
					type: "boolean",
					title: "Südholland (South Holland / Zuid-Holland)",
					default: false,
				},
				Zeeland: {
					type: "boolean",
					title: "Zeeland (Zeeland / Zeeland)",
					default: false,
				},
				"Noord-Brabant": {
					type: "boolean",
					title: "Nordbrabant (North Brabant / Noord-Brabant)",
					default: false,
				},
				Limburg: {
					type: "boolean",
					title: "Limburg (Limburg / Limburg)",
					default: false,
				},
				pollIntervalHours: {
					type: "number",
					title: "Abfrageintervall in Stunden (Polling interval in hours)",
					default: 24,
				},
				daysSpan: {
					type: "number",
					title: "Anzahl Tage (Number of days)",
					default: 120,
				},
				deeplApiKey: {
					type: "string",
					title: "DeepL API Schlüssel (DeepL API Key)",
					default: "",
				},
				openCpnGeoJsonPathRoutes: {
					type: "string",
					title:
						"Pfad + Dateiname der GPX Datei mit gesperrten Strecken für OpenCpn (Path + filename of GPX file with closed routes for OpenCPN)",
				},
				openCpnGeoJsonPathWaypoints: {
					type: "string",
					title:
						"Pfad + Dateiname der GPX Datei mit gesperrten Objekten für OpenCpn (Path + filename of GPX file with closed objects for OpenCPN)",
				},
				movePointMeters: {
					type: "number",
					title: "Punktverschiebung in Metern (Point offset in meters)",
					default: 5,
				},
				pointSize: {
					type: "number",
					title: "Größe der Punkte (Size of points in map)",
					default: 10,
				},
				colorHex: {
					type: "string",
					title: "Farbe der Punkte (Color of points in map - hex value)",
					default: "#FF0000",
				},
			},
		},

		start: function (options) {
			app.debug("Vaarweginformatie plugin starting...");

			import("./plugin.mjs")
				.then((module) => {
					realPlugin = module.default(app);

					if (pendingRouter) {
						realPlugin.registerWithRouter(pendingRouter);
						pendingRouter = null;
					}

					realPlugin.start(options);
				})
				.catch((err) => {
					app.error("Failed to load plugin: " + err.message);
					app.error("Stack: " + err.stack);
				});
		},

		stop: function () {
			if (realPlugin && typeof realPlugin.stop === "function") {
				realPlugin.stop();
			}
		},

		registerWithRouter(router) {
			if (realPlugin && realPlugin.registerWithRouter) {
				realPlugin.registerWithRouter(router);
			} else {
				pendingRouter = router;
			}
		},

		getOpenApi() {
			return openapi;
		},
	};

	return wrapper;
};
