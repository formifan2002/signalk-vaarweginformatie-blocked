import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
	doFetch,
	createSperrungProvider,
	createRouteProvider,
	registerPointClosuresNotesProvider,
} from "./providers.mjs";

import { toGeoJSON } from "./geoJsonGenerator.mjs";
import { registerRouterEndpoints } from "./routerEndpoints.mjs";
import { buildApiUrl, clampDays } from "./apiHelpers.mjs";
import { generateRoutesGPX, generateWaypointsGPX } from "./gpxGenerator.mjs";
import { translateText } from "./translation.mjs";

// ⭐ Mapping von Namen auf fmtArea IDs
const AREA_MAP = {
	"Algemeen Nederland": 409359,
	Noordzee: 4577709,
	Eems: 539759,
	Waddenzee: 496785,
	Groningen: 409357,
	Fryslan: 409362,
	Drenthe: 409358,
	Overijssel: 409356,
	Gelderland: 409353,
	Ijsselmeer: 409354,
	Flevoland: 409355,
	Utrecht: 409366,
	"Noord-Holland": 409361,
	"Zuid-Holland": 409360,
	Zeeland: 409363,
	"Noord-Brabant": 409364,
	Limburg: 409365,
};

export default function (app) {
	let plugin = {
		id: "signalk-vaarweginformatie-blocked",
		name: "Vaarweginformatie BLOCKED",
		description:
			"Fetches blocked waterways, bridges and sluices from vaarweginformatie.nl for e.g. Freeboard-SK or OpenCPN.",
	};
	let timer = null;
	const pointClosuresCache = new Map();
	const pluginRouteIds = new Set();
	let RESOURCESET_NAME = "";
	const RESOURCE_ID = "blocked-waterways-nl";

	const state = {
		cachedResourceSet: null,
		cachedRoutes: {},
	};

	plugin.start = function (options) {
		plugin.lastOptions = options;
		plugin.providers = [];
		const languageIsGerman = options.language !== false;
		RESOURCESET_NAME = languageIsGerman ? "Sperrungen" : "Closures";

		const selectedIds = options["All areas"]
			? []
			: Object.keys(AREA_MAP)
					.filter((name) => options[name])
					.map((name) => AREA_MAP[name]);

		const pollHours = Number(options.pollIntervalHours) || 24;
		const days = clampDays(options.daysSpan ?? 7);
		const colorHex = options.colorHex || "#FF0000";
		const pointSize = options.pointSize || 10;
		const movePointMeters = Number(options.movePointMeters) || 5;

		async function runFetch() {
			const result = await doFetch({
				app,
				days,
				selectedIds,
				movePointMeters,
				languageIsGerman,
				buildApiUrl,
				toGeoJSON,
				generateRoutesGPX,
				generateWaypointsGPX,
				options,
				RESOURCESET_NAME,
				RESOURCE_ID,
				pointSize,
				colorHex,
				state,
				pluginRouteIds,
				plugin,
				pointClosuresCache,
			});

			if (result) {
				state.cachedResourceSet = result.cachedResourceSet;
				state.cachedRoutes = result.cachedRoutes;
			}
		}

		const sperrungProvider = createSperrungProvider({
			RESOURCESET_NAME,
			RESOURCE_ID,
			state,
		});

		const routeProvider = createRouteProvider({
			state,
			pluginRouteIds,
		});

		try {
			app.registerResourceProvider(sperrungProvider);
			app.registerResourceProvider(routeProvider);
			plugin.providers.push(sperrungProvider, routeProvider);
			registerPointClosuresNotesProvider(
				app,
				plugin,
				pointClosuresCache,
				languageIsGerman,
				options
			);
		} catch (error) {
			app.error?.(`Failed to register resource providers: ${error.message}`);
			return;
		}

		// ⭐ Initiales Fetch und dann regelmäßig
		runFetch();
		timer = setInterval(runFetch, pollHours * 60 * 60 * 1000);
	};

	plugin.stop = function () {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}

		// ⭐ Provider deregistrieren
		if (plugin.providers && plugin.providers.length > 0) {
			plugin.providers = [];
		}

		// ⭐ Cache leeren
		state.cachedResourceSet = null;
		state.cachedRoutes = {};
		pluginRouteIds.clear();
		pointClosuresCache.clear();
	};

	plugin.registerWithRouter = function (router) {
		registerRouterEndpoints(router, plugin, app);
	};

	plugin.translate = async function (text, sourceLang = null, targetLang) {
		try {
			const translatedText = await translateText(
				text,
				sourceLang,
				targetLang,
				app,
				plugin
			);
			return translatedText;
		} catch (err) {
			app.debug("Translation failed:", err.message);
			return text;
		}
	};

	// ⭐ Speichere letzte Optionen
	plugin.lastOptions = null;

	return plugin;
}
