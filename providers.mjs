// providers.js
// ---------------------------------------------------------
// Zentrale Provider- und Fetch-Logik für dein Plugin
// ---------------------------------------------------------

import axios from "axios";
import fs from "fs";

import { translationCache } from "./translationCache.mjs";
import { descriptionToHtml } from "./public/common-utils.mjs";
import { formatBlockageTime } from "./formatting.mjs";
import { isInBbox, positionToBbox } from "./geoHelpers.mjs";
import { buildApiUrl } from "./apiHelpers.mjs";
import { generateRoutesGPX, generateWaypointsGPX } from "./gpxGenerator.mjs";

// ---------------------------------------------------------
// 1. doFetch – komplette API-Logik ausgelagert
// ---------------------------------------------------------

async function doFetch({
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
}) {
	try {
		const now = new Date();
		const midnight = new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
		);
		const validFromMs = midnight.getTime();
		const validUntilMs = validFromMs + days * 24 * 60 * 60 * 1000;

		const url = buildApiUrl(validFromMs, validUntilMs, selectedIds);
		app.debug(`Fetching data: ${url}`);

		const { data } = await axios.get(url, {
			headers: { Accept: "application/json" },
		});

		const messages = Array.isArray(data)
			? data
			: Array.isArray(data.messages)
			? data.messages
			: Array.isArray(data.summaries)
			? data.summaries
			: [];

		app.debug(`Found ${messages.length} messages in API response`);

		// ⭐ toGeoJSON komplett ausführen - befüllt auch pointClosuresCache
		const geoData = await toGeoJSON(
			messages,
			movePointMeters,
			validUntilMs,
			languageIsGerman,
			app,
			plugin,
			pointClosuresCache
		);

		app.debug(
			`toGeoJSON completed: ${geoData.points.length} points, ${geoData.routes.length} routes, ${pointClosuresCache.size} notes cached`
		);

		// ⭐ Alte Routen aufräumen
		for (const routeId of pluginRouteIds) {
			delete state.cachedRoutes[routeId];
		}
		pluginRouteIds.clear();

		// ⭐ ResourceSet für Punkte erzeugen
		const resourceDescription = languageIsGerman
			? "Gesperrte Objekte (Brücken, Schleusen,..) und Wasserstraßen von vaarweginformatie.nl"
			: "Blocked objects (bridges, sluices,...) and waterways from vaarweginformatie.nl";

		state.cachedResourceSet = {
			type: "ResourceSet",
			name: RESOURCESET_NAME,
			description: resourceDescription,
			applicationData: {},
			styles: {
				default: {
					width: pointSize,
					stroke: colorHex,
					fill: colorHex + "80",
				},
			},
			values: {
				features: geoData.points,
			},
		};

		// ⭐ Routen cachen
		geoData.routes.forEach((route, index) => {
			const routeId = `blocked-route-${index}`;
			pluginRouteIds.add(routeId);

			state.cachedRoutes[routeId] = {
				name: route.name,
				description: route.description,
				distance: route.distance,
				contents: route.contents,
				detailUrl: route.detailUrl,
				startDate: route.startDate,
				startTimeMs: route.startTimeMs,
				endDate: route.endDate,
				endTimeMs: route.endTimeMs,
				berichte: route.berichte,
				feature: {
					type: "Feature",
					geometry: {
						type: "LineString",
						coordinates: route.coordinates,
					},
					properties: {
						fairway: route.fairway,
					},
				},
			};
		});

		app.debug(
			`ResourceSet updated: ${geoData.points.length} points, ${geoData.routes.length} routes cached`
		);

		// ⭐ SignalK über Änderungen informieren
		if (typeof app.handleMessage === "function") {
			app.handleMessage("resources", {
				updates: [
					{
						source: { label: plugin.id },
						timestamp: new Date().toISOString(),
						values: [{ path: "resources.update", value: Date.now() }],
					},
				],
			});
		}

		// ⭐ GPX-Dateien asynchron im Hintergrund erzeugen (blockiert nicht)
		if (options.openCpnGeoJsonPathRoutes && geoData.routes.length > 0) {
			setImmediate(() => {
				try {
					const routesGPX = generateRoutesGPX(
						geoData.routes,
						colorHex,
						languageIsGerman
					);
					fs.writeFile(
						options.openCpnGeoJsonPathRoutes,
						routesGPX,
						"utf8",
						(err) => {
							if (err) {
								app.error(`Routes GPX write error: ${err.message}`);
							} else {
								app.debug(
									`Routes GPX written: ${options.openCpnGeoJsonPathRoutes}`
								);
							}
						}
					);
				} catch (err) {
					app.error(`Routes GPX generation error: ${err.message}`);
				}
			});
		}

		if (options.openCpnGeoJsonPathWaypoints && geoData.points.length > 0) {
			setImmediate(() => {
				try {
					const waypointsGPX = generateWaypointsGPX(
						geoData.points,
						languageIsGerman
					);
					fs.writeFile(
						options.openCpnGeoJsonPathWaypoints,
						waypointsGPX,
						"utf8",
						(err) => {
							if (err) {
								app.error(`Waypoints GPX write error: ${err.message}`);
							} else {
								app.debug(
									`Waypoints GPX written: ${options.openCpnGeoJsonPathWaypoints}`
								);
							}
						}
					);
				} catch (err) {
					app.error(`Waypoints GPX generation error: ${err.message}`);
				}
			});
		}

		return {
			cachedResourceSet: state.cachedResourceSet,
			cachedRoutes: state.cachedRoutes,
		};
	} catch (err) {
		if (app && typeof app.error === "function") {
			app.error(`Fetch error: ${err.message}\n${err.stack}`);
		}
		return null;
	}
}

// 2. Notes Provider für Punkt-Sperrungen
// ---------------------------------------------------------
async function formatPointClosureNote(group, languageIsGerman, app, plugin) {

	const targetLang = languageIsGerman ? "de" : "en";

	// Berichte mit automatischer Übersetzung verarbeiten
	const berichteWithTranslation = await Promise.all(
		Object.values(group.berichte || {}).map(async (b) => {
			let communicationText = b.communicationTranslated || "";
			let contentsText = b.contentsTranslated || "";

			// Original-Texte speichern
			const communicationOriginal = b.communication || "";
			const contentsOriginal = b.contents || "";

			// Communication übersetzen falls nötig
			if (!communicationText && b.communication) {
				communicationText = await plugin.translate(
					b.communication,
					null,
					targetLang
				);
			}

			// Contents übersetzen falls nötig
			if (!contentsText && b.contents) {
				contentsText = await plugin.translate(
					b.contents,
					null,
					targetLang
				);
			}

			return {
				ntsNumber: b.bericht,
				organisation: b.organisation,
				ntsType: b.ntsType,
				reasonCode: b.reasonCode,
				subjectCode: b.subjectCode,
				status: b.status,
				communication: communicationText,
				contents: contentsText,
				communicationOriginal: communicationOriginal,
				contentsOriginal: contentsOriginal,
				detailUrl: b.detailUrl || "",
				blockages: (b.blockages || []).map((blk) => ({
					startDate: formatBlockageTime(blk, languageIsGerman),
					endDate: blk.endDate ? formatBlockageTime(blk, languageIsGerman) : "",
					startTime: blk.startTime,
					endTime: blk.endTime,
				})),
			};
		})
	);

	// Template-Daten vorbereiten
	const templateData = {
		name: group.locationName,
		position: {
			latitude: group.lat,
			longitude: group.lon,
		},
		meta: {
			locationName: group.locationName,
			description: group.descriptionFormatted,
			berichte: berichteWithTranslation,
		},
		timestamp: new Date().toISOString(),
	};

	const rawDescription = await templateData.meta.description;
	const berichteArray = templateData.meta.berichte;
	const berichteObj = Object.fromEntries(
		berichteArray.map((b) => [
			b.ntsNumber,
			{
				bericht: b.ntsNumber,
				reasonCode: b.reasonCode,
				detailUrl: b.detailUrl,
				communication: b.communication,
				contents: b.contents,
				communicationTranslated: b.communication, // Bereits übersetzt
				contentsTranslated: b.contents, // Bereits übersetzt
			},
		])
	);

	const description = await descriptionToHtml(
		rawDescription,
		berichteObj,
		targetLang
	);

	return {
		name: group.locationName,
		description: description,
		mimeType: "text/html",
		properties: {
			readOnly: true,
			skIcon: "hazard",
		},
		position: {
			longitude: group.lon,
			latitude: group.lat,
		},
		timestamp: new Date().toISOString(),
		$source: plugin.id,
	};
}

function registerPointClosuresNotesProvider(
	app,
	plugin,
	pointClosuresCache,
	languageIsGerman,
	options
) {
	app.registerResourceProvider({
		type: "notes",
		methods: {
			listResources: (query) => {
				const results = {};

				// BBOX nur einmal berechnen
				let bbox = null;
				if (query.position && query.distance) {
					bbox = positionToBbox(query.position, query.distance);
				}

				for (const [id, group] of pointClosuresCache.entries()) {
					if (bbox && !isInBbox(group.lat, group.lon, bbox)) {
						continue;
					}

					// Note erzeugen (nur primitive Werte)
					results[id] = {
						id,
						name: group.locationName || "Unnamed closure",
						position: {
							latitude: Number(group.lat),
							longitude: Number(group.lon),
						},
						mimeType: "text/html",
						properties: {
							readOnly: true,
							skIcon: "hazard",
						},
						timestamp: new Date().toISOString(),
						$source: plugin.id,
					};
				}

				// Finale Ausgabe
				const count = Object.keys(results).length;
				app.debug(
					`Vaarweg - returned  ${count} notes for listResources request`
				);

				return results;
			},

			getResource: async (id, property) => {
				// ⭐ 1. Prüfen, ob die ID zu diesem Plugin gehört
				if (!id.startsWith(plugin.id + "-")) {
					app.debug(
						`Note ${id} does not belong to plugin ${plugin.id} → skipping`
					);
					return;
				}
				app.debug(`Incoming request to get note ${id}`);
				const group = pointClosuresCache.get(id);
				if (!group) {
					app.error(`Unknown point closure ${id}`);
					throw new Error(`Unknown point closure ${id}`);
				}

				const note = await formatPointClosureNote(
					group,
					languageIsGerman,
					app,
					plugin
				);

				if (property) {
					if (note[property] === undefined) {
						app.error(`Property ${property} not found in note for ${id}`);
						throw new Error(`Property ${property} not found`);
					}
					return note[property];
				}
				return note;
			},

			setResource: () => {
				throw new Error("setResource not supported");
			},

			deleteResource: () => {
				throw new Error("deleteResource not supported");
			},
		},
	});
}

// ---------------------------------------------------------
// 3. Resource Provider für Sperrungen (Punkte)
// ---------------------------------------------------------

function createSperrungProvider({ RESOURCESET_NAME, RESOURCE_ID, state }) {
	return {
		type: RESOURCESET_NAME,
		methods: {
			listResources: () => {
				return new Promise((resolve) => {
					if (state.cachedResourceSet) {
						const result = {};
						result[RESOURCE_ID] = state.cachedResourceSet;
						resolve(result);
					} else {
						resolve({});
					}
				});
			},

			getResource: (id, property) => {
				return new Promise((resolve, reject) => {
					if (id === RESOURCE_ID && state.cachedResourceSet) {
						if (property) {
							resolve(state.cachedResourceSet[property]);
						} else {
							resolve(state.cachedResourceSet);
						}
					} else {
						reject(new Error("Resource not found"));
					}
				});
			},

			setResource: () =>
				Promise.reject(
					new Error("setResource not supported - resources are read-only")
				),

			deleteResource: (id) => {
				return new Promise((resolve, reject) => {
					if (id === RESOURCE_ID && state.cachedResourceSet) {
						state.cachedResourceSet = null;
						resolve();
					} else {
						reject(new Error("Resource not found"));
					}
				});
			},
		},
	};
}

// ---------------------------------------------------------
// 4. Resource Provider für Routes (Linien)
// ---------------------------------------------------------

function createRouteProvider({ state, pluginRouteIds }) {
	return {
		type: "routes",
		methods: {
			listResources: () => Promise.resolve(state.cachedRoutes),

			getResource: (id, property) => {
				return new Promise((resolve, reject) => {
					if (state.cachedRoutes[id]) {
						if (property) {
							resolve(state.cachedRoutes[id][property]);
						} else {
							resolve(state.cachedRoutes[id]);
						}
					} else {
						reject(new Error("Route not found"));
					}
				});
			},

			setResource: () =>
				Promise.reject(
					new Error("setResource not supported - resources are read-only")
				),

			deleteResource: (id) => {
				return new Promise((resolve, reject) => {
					if (pluginRouteIds.has(id) && state.cachedRoutes[id]) {
						delete state.cachedRoutes[id];
						pluginRouteIds.delete(id);
						resolve();
					} else {
						reject(new Error("Route not found or not deletable"));
					}
				});
			},
		},
	};
}

// ---------------------------------------------------------
// Export
// ---------------------------------------------------------

export {
	doFetch,
	createSperrungProvider,
	createRouteProvider,
	registerPointClosuresNotesProvider,
};
