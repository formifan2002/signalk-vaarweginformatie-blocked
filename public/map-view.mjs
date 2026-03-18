// ============================================================
// MAP VIEW
// ============================================================
import { getVesselIcon } from "./iconsshiptype.mjs";
import {
	detectContext,
	currentLang,
	aisDecoder,
	bridge,
	initialConfig,
	setCurrentLang,
} from "./utils.mjs";

import { formatVesselData } from "./formatting-utils.mjs";

import { escapeHtml, descriptionToHtml } from "./common-utils.mjs";

import { translations } from "./translations.mjs";
import { SignalKDeltaHandler } from "./signalk-delta-handler.mjs";

let vesselMarker = null;
let vesselUpdateTimer = null;
let aisUpdateTimer = null;
let aisWebSocket = null;
let showOnlyMovingVessels = false;
let mapFilter = {};
let mapInstance = null;
let mapLayers = { waterways: L.featureGroup(), closures: L.featureGroup() };
let mapUpdateTimer = null;
let allMarkers = [];
let countAis = 0;
const anchorPlus = "+⚓";
const anchorMinus = "−⚓";
let deltaHandler = null;

// Verstecke map-info initial, außer im Map-Modus
document.addEventListener("DOMContentLoaded", () => {
	const params = new URLSearchParams(window.location.search);
	const mode = params.get("mode");
	const mapInfo = document.getElementById("mapInfo");

	if (mapInfo) {
		mapInfo.style.display = mode === "map" ? "block" : "none";
	}

	// WICHTIG: Config-View sichtbar machen, wenn NICHT map
	if (mode !== "map") {
		document.getElementById("configView").style.display = "block";
	}

	startAutoMode();
});

async function startAutoMode() {
	const params = new URLSearchParams(window.location.search);
	const mode = params.get("mode");
	const context = detectContext();

	const mustShowMap = mode === "map" || context !== "main-document";

	// 🔹 Normaler Modus → Config anzeigen, Toggle anzeigen
	if (!mustShowMap) {
		document.getElementById("configView").style.display = "block";
		document.getElementById("viewToggle").style.display = "flex";
		document.getElementById("mapView").style.display = "none";
		return;
	}

	// 🔹 Map-Auto-Modus → Spinner anzeigen
	const overlay = document.getElementById("loadingOverlay");
	overlay.style.display = "flex";

	// 🔹 Alles ausblenden, was nicht Map ist
	document.getElementById("viewToggle").style.display = "none";
	document.getElementById("configView").style.display = "none";

	// 🔹 Map-View sichtbar machen (Leaflet braucht sichtbaren Container)
	const mapView = document.getElementById("mapView");
	mapView.style.display = "block";
	mapView.classList.add("active");

	// 🔹 Warten bis initialConfig geladen ist
	const waitForConfig = () =>
		new Promise((resolve) => {
			const timer = setInterval(() => {
				if (initialConfig !== null) {
					clearInterval(timer);
					resolve();
				}
			}, 50);
		});

	await waitForConfig();
	// Sprache setzen
	setCurrentLang(initialConfig.language ? "de" : "en" || "en");
	// Loading-Text aktualisieren
	const t = translations[currentLang];
	document.querySelector(".loading-text").textContent = t.loadingText;

	// 🔹 Delta-Handler initialisieren
	if (!deltaHandler) {
		deltaHandler = new SignalKDeltaHandler();
		deltaHandler.setAISCache(aisDecoder);

		deltaHandler.subscribe((type, data) => {
			if (type === "ownPosition" && vesselMarker) {
				vesselMarker.setLatLng([data.lat, data.lon]);
			}
		});

		deltaHandler.connect();

		// Initiale Daten für eigenes Schiff laden (einmalig)
		try {
			// Position laden
			const position = await bridge.getLatLon(deltaHandler.ownVesselCache);
			if (position) {
				const timestamp = deltaHandler.ownVesselCache.positionTimestamp;
				deltaHandler.setInitialPosition(position, timestamp);
			}

			// Schiffsdaten laden
			const vesselData = await bridge.getVesselData(
				"",
				deltaHandler.ownVesselCache
			);
			if (vesselData) {
				deltaHandler.setInitialOwnVesselData(vesselData);
			}

			console.log("✓ Initial own vessel data loaded");
		} catch (err) {
			console.error("Failed to load initial own vessel data:", err);
		}
	}

	// 🔹 Map initialisieren
	await initMap();

	// 🔹 Labels aktualisieren
	updateMapLabels();

	// 🔹 Daten laden
	await loadMapData();

	// 🔹 Polling aktivieren
	if (initialConfig.pollIntervalHours) {
		mapUpdateTimer = setInterval(
			loadMapData,
			initialConfig.pollIntervalHours * 3600000
		);
	}

	// 🔹 Spinner ausblenden
	overlay.style.display = "none";
}

// Verhindere automatisches Schließen von Popups
if (typeof L !== "undefined") {
	L.Popup.prototype.options.autoClose = false;
	L.Popup.prototype.options.closeOnClick = false;
}

// ============================================================
// AIS FUNKTIONEN
// ============================================================

function showHideAISElements(show, isLoading = false) {
	const style = show && !isLoading ? "inline-block" : "none";
	const styleLoading = "inline-block";
	document.getElementById("toggleAIS").style.display = style;
	document.getElementById("showSogBtn").style.display = style;
	document.getElementById("mapAISCount").style.display = style;
	if (!isLoading) {
		document.getElementById("mapAISLabel").style.display = style;
		document.getElementById("mapAISLabel").textContent =
			translations[currentLang]?.mapAISLabel;
	} else {
		document.getElementById("mapAISLabel").style.display = styleLoading;
		document.getElementById("mapAISLabel").textContent =
			translations[currentLang]?.mapAISUpdate;
	}
}

async function initAIS() {
	const wsPort = await getWsPort();
	if (wsPort === 0) {
		console.log(
			"AIS Converter from plugin signalk-ais-navionics-converter not available or disabled"
		);
		// Verstecke AIS komplett
		showHideAISElements(false);
		return;
	}

	// Zeige "Lade..." während Verbindung
	countAis = allMarkers.filter((m) => m.type === "ais").length;
	if (countAis === 0) {
		showHideAISElements(true, true);
	}

	const connected = await connectAISWebSocket(wsPort);
	if (!connected) {
		showHideAISElements(false);
		return false;
	}

	// Update AIS Layer alle 10 Sekunden
	aisUpdateTimer = setInterval(renderAISLayer, 10000);

	// Initiales Rendering
	renderAISLayer();
}

async function getWsPort() {
	let baseUrl;

	const host = window.location.hostname;
	const port = window.location.port;

	const isLocal =
		host.startsWith("192.168.") ||
		host.startsWith("10.") ||
		(host.startsWith("172.") &&
			parseInt(host.split(".")[1]) >= 16 &&
			parseInt(host.split(".")[1]) <= 31);

	if (isLocal) {
		// Lokal im WLAN → direkt zum Pi
		baseUrl = `http://${host}:${port}`;
	} else {
		// Reverse Proxy → HTTPS → keine Host/Port-Angabe nötig
		baseUrl = "";
	}

	const url = `${baseUrl}/plugins/signalk-ais-navionics-converter/plugin-status`;

	try {
		const response = await fetch(url, { timeout: 2000 });

		if (!response.ok) {
			return 0;
		}

		const data = await response.json();

		if (data.enabled === true && typeof data.wsPort === "number") {
			return data.wsPort;
		}

		return 0;
	} catch (err) {
		return 0;
	}
}

async function detectWsUrl(wsPort) {
	let internalUrl = null;
	let externalUrl = null;

	const host = window.location.hostname;
	const isLocal =
		host.startsWith("192.168.") ||
		host.startsWith("10.") ||
		(host.startsWith("172.") &&
			parseInt(host.split(".")[1]) >= 16 &&
			parseInt(host.split(".")[1]) <= 31);

	// 1) Lokale URL (nur wenn lokal)
	if (isLocal) {
		internalUrl = `ws://${host}:${wsPort}/`;
	}

	// 2) Reverse Proxy URL (immer wenn HTTPS)
	if (window.location.protocol === "https:") {
		externalUrl = `wss://${window.location.host}/aisws/`;
	}

	// WebSocket-Testfunktion mit längerem Timeout und Nachrichtenprüfung
	async function testWs(url) {
		return new Promise((resolve) => {
			if (!url) return resolve(false);

			let ws = null;
			let resolved = false;
			let messageReceived = false;

			const cleanup = (result) => {
				if (resolved) return;
				resolved = true;

				if (ws) {
					try {
						ws.close();
					} catch (e) {
						// Ignoriere Fehler beim Schließen
					}
					ws = null;
				}
				resolve(result);
			};

			try {
				ws = new WebSocket(url);

				// Erfolg: WebSocket ist offen
				ws.onopen = () => {
					console.log(`✓ WebSocket opened: ${url}`);
					// NICHT sofort schließen - warte auf erste Nachricht
				};

				// Erste Nachricht empfangen = definitiv funktionsfähig
				ws.onmessage = () => {
					if (!messageReceived) {
						messageReceived = true;
						console.log(`✓ WebSocket data received: ${url}`);
						cleanup(true);
					}
				};

				// Fehler sind während des Tests normal (andere URL wird probiert)
				ws.onerror = (err) => {
					console.warn(`WebSocket test error (trying next): ${url}`, err);
				};

				// Bei Close ohne Nachricht = fehlgeschlagen
				ws.onclose = () => {
					if (!messageReceived && !resolved) {
						console.warn(`WebSocket closed without data: ${url}`);
						cleanup(false);
					}
				};

				// Timeout: Bei SSL/nginx dauert es länger
				// 5 Sekunden sollten auch für langsame Verbindungen reichen
				setTimeout(() => {
					if (!resolved) {
						if (ws && ws.readyState === WebSocket.OPEN && !messageReceived) {
							// Verbindung offen aber keine Daten = probiere weiter
							console.warn(`WebSocket open but no data after 5s: ${url}`);
							cleanup(false);
						} else if (!messageReceived) {
							console.warn(`WebSocket timeout: ${url}`);
							cleanup(false);
						}
					}
				}, 5000);
			} catch (err) {
				console.warn("WebSocket exception:", err);
				cleanup(false);
			}
		});
	}

	// 1. Bei HTTPS: Erst Reverse Proxy testen (wahrscheinlicher)
	if (window.location.protocol === "https:") {
		if (externalUrl) {
			console.log("Testing HTTPS Reverse Proxy WebSocket...");
			if (await testWs(externalUrl)) {
				console.log("✓ AIS WebSocket via PROXY:", externalUrl);
				return externalUrl;
			}
		}

		// Fallback: Lokal (falls verfügbar)
		if (internalUrl) {
			console.log("Proxy failed, testing local WebSocket...");
			if (await testWs(internalUrl)) {
				console.log("✓ AIS WebSocket via LOCAL:", internalUrl);
				return internalUrl;
			}
		}
	} else {
		// Bei HTTP: Erst lokal testen
		if (internalUrl) {
			console.log("Testing local WebSocket...");
			if (await testWs(internalUrl)) {
				console.log("✓ AIS WebSocket via LOCAL:", internalUrl);
				return internalUrl;
			}
		}

		// Fallback: Proxy (falls verfügbar)
		if (externalUrl) {
			console.log("Local failed, testing Proxy WebSocket...");
			if (await testWs(externalUrl)) {
				console.log("✓ AIS WebSocket via PROXY:", externalUrl);
				return externalUrl;
			}
		}
	}

	console.error("❌ AIS WebSocket konnte nicht verbunden werden.");
	console.error(
		`Getestete URLs: ${internalUrl || "n/a"}, ${externalUrl || "n/a"}`
	);

	return null;
}

async function connectAISWebSocket(wsPort) {
	try {
		const wsUrl = await detectWsUrl(wsPort);
		if (!wsUrl) {
			showHideAISElements(false, false);
			return false;
		}
		const aisWebSocket = new WebSocket(wsUrl);
		aisWebSocket.onopen = () => console.log("AIS WebSocket connected");
		aisWebSocket.onerror = (err) => console.error("AIS WebSocket error:", err);
		aisWebSocket.onclose = () => {
			console.log("AIS WebSocket closed, reconnecting in 5s...");
			setTimeout(() => connectAISWebSocket(wsPort), 5000);
		};

		aisWebSocket.onmessage = (event) => {
			const message = event.data.trim();

			if (message.startsWith("!AIVDM")) {
				aisDecoder.processNMEA(message);
			} else if (message.startsWith("{")) {
				try {
					const data = JSON.parse(message);
					if (data.mmsi && data.navigation?.position?.timestamp) {
						aisDecoder.updatePositionTimestamp(
							data.mmsi,
							data.navigation.position.timestamp
						);
					}
				} catch (err) {
					console.error("❌ Failed to parse JSON message:");
					console.error("Raw message:", message);
					console.error("Error:", err.message);
				}
			}
		};
		return true;
	} catch (err) {
		console.error("AIS WebSocket connection failed:", err);
		return false;
	}
}

async function renderAISLayer() {
	if (!mapInstance) return;

	const vessels = aisDecoder.getVessels();

	// Sammle existierende Marker mit ihren MMSIs und Popup-Status
	const existingMarkers = new Map();
	mapLayers.ais.eachLayer((layer) => {
		if (layer.options && layer.options.mmsi) {
			existingMarkers.set(layer.options.mmsi, {
				marker: layer,
				popupOpen: layer.isPopupOpen(),
			});
		}
	});

	let ownVesselData = null;
	try {
		let position = deltaHandler?.getOwnPosition();
		if (!position) {
			position = await bridge.getLatLon(deltaHandler?.ownVesselCache);
		}

		let vesselData = deltaHandler?.getOwnVesselData();
		if (!vesselData || !vesselData.navigation) {
			vesselData = await bridge.getVesselData("", deltaHandler?.ownVesselCache);
		}

		if (position && vesselData) {
			const sog = vesselData?.navigation?.speedOverGround?.value || 0;
			const cog = vesselData?.navigation?.courseOverGroundTrue?.value || 0;

			ownVesselData = {
				lat: position.lat,
				lon: position.lon,
				sog: sog * 1.94384,
				cog: (cog * 180) / Math.PI,
			};
		}
	} catch (err) {
		console.error("Could not get own vessel data for CPA calculation:", err);
	}

	// Popup Content mit CPA/TCPA
	const t = translations[currentLang];
	// Set für verarbeitete MMSIs um Duplikate zu verhindern
	const processedMMSIs = new Set();

	for (const vessel of vessels) {
		if (!vessel.latitude || !vessel.longitude) continue;
		if (processedMMSIs.has(vessel.mmsi)) continue;
		if (showOnlyMovingVessels) {
			const sog =
				vessel.sog !== null && vessel.sog !== undefined ? vessel.sog : 0;
			if (sog <= 0) continue; // Überspringe Schiffe ohne Bewegung
		}
		processedMMSIs.add(vessel.mmsi);

		const iconSymbol = getVesselIcon(vessel.shipType || 0);

		let heading =
			vessel.heading !== null && vessel.heading !== undefined
				? vessel.heading
				: vessel.cog;

		if (heading === null || heading === undefined) {
			heading = 0;
		}

		// -90° weil Emojis standardmäßig nach rechts (90°) zeigen
		// COG 0° = Nord = Icon muss um -90° gedreht werden
		const rotation = heading + 90;

		const vesselIcon = L.divIcon({
			html: `<div style="font-size: 20px; text-align: center; line-height: 20px; transform: rotate(${rotation}deg);">${iconSymbol}</div>`,
			className: "ais-vessel-marker",
			iconSize: [20, 20],
			iconAnchor: [10, 10],
		});

		const vesselInfo = await formatVesselData(
			vessel,
			currentLang,
			false,
			ownVesselData
		);

		let html =
			'<div class="popup-content"><strong>' +
			(t?.vesselInfo || "Information Schiff") +
			"</strong>" +
			vesselInfo;

		// Navigation
		if (
			(vessel.sog !== null && vessel.sog !== undefined) ||
			(vessel.cog !== null && vessel.cog !== undefined) ||
			(vessel.heading !== null && vessel.heading !== undefined) ||
			(vessel.rot !== null && vessel.rot !== undefined) ||
			(vessel.navStatus !== null && vessel.navStatus !== undefined)
		) {
			html += `<div style="margin-top: 0.5em;"><strong>${
				t?.navigation || "Navigation"
			}:</strong></div>`;
		}

		// SOG
		if (vessel.sog !== null && vessel.sog !== undefined) {
			html += `<div style="margin-left: 1em;"><strong>SOG:</strong> ${vessel.sog.toFixed(
				1
			)} kn</div>`;
		}

		// COG
		if (vessel.cog !== null && vessel.cog !== undefined) {
			html += `<div style="margin-left: 1em;"><strong>COG:</strong> ${vessel.cog.toFixed(
				0
			)}°</div>`;
		}

		// Heading
		if (vessel.heading !== null && vessel.heading !== undefined) {
			html += `<div style="margin-left: 1em;"><strong>${
				t?.heading || "Kurs"
			}:</strong> ${vessel.heading}°</div>`;
		}

		// Rate of Turn - nur anzeigen wenn vorhanden und nicht 0
		if (vessel.rot !== null && vessel.rot !== undefined) {
			// Drehrichtung bestimmen
			let direction = "";
			if (typeof vessel.rot === "number" && vessel.rot !== 0) {
				direction =
					vessel.rot > 0
						? ` (${t?.starboard || "Steuerbord"})`
						: ` (${t?.port || "Backbord"})`;
			}

			if (typeof vessel.rot === "string") {
				html += `<div style="margin-left: 1em;">
          <strong>${t?.rateOfTurn || "Drehrate"}:</strong> ${
					vessel.rot
				}°/s${direction}
        </div>`;
			} else if (vessel.rot !== 0) {
				html += `<div style="margin-left: 1em;">
          <strong>${t?.rateOfTurn || "Drehrate"}:</strong> ${vessel.rot.toFixed(
					1
				)}°/s${direction}
        </div>`;
			}
		}

		// Navigation Status
		if (vessel.navStatus !== null && vessel.navStatus !== undefined) {
			const statusTexts = {
				de: [
					"Unter Maschine",
					"Vor Anker",
					"Manövrierunfähig",
					"Manövrierbehindert",
					"Tiefgangsbehindert",
					"Festgemacht",
					"Auf Grund gelaufen",
					"Mit Fischerei beschäftigt",
					"Unter Segel",
					"Reserviert",
					"Reserviert",
					"Reserviert",
					"Reserviert",
					"Reserviert",
					"AIS-SART",
					"Undefiniert",
				],
				en: [
					"Under way using engine",
					"At anchor",
					"Not under command",
					"Restricted manoeuvrability",
					"Constrained by draught",
					"Moored",
					"Aground",
					"Engaged in fishing",
					"Under way sailing",
					"Reserved",
					"Reserved",
					"Reserved",
					"Reserved",
					"Reserved",
					"AIS-SART",
					"Undefined",
				],
			};
			const statusText =
				statusTexts[currentLang]?.[vessel.navStatus] || vessel.navStatus;
			html += `<div style="margin-left: 1em;"><strong>${
				t?.navStatus || "Status"
			}:</strong> ${escapeHtml(statusText)}</div>`;
		}

		html += "</div>";

		// Prüfe ob Marker bereits existiert
		const existing = existingMarkers.get(vessel.mmsi);

		if (existing) {
			// Update existierenden Marker
			existing.marker.setLatLng([vessel.latitude, vessel.longitude]);
			existing.marker.setIcon(vesselIcon);
			existing.marker.getPopup().setContent(html);

			// Entferne aus Map, damit er nicht gelöscht wird
			existingMarkers.delete(vessel.mmsi);
		} else {
			// Erstelle neuen Marker
			const marker = L.marker([vessel.latitude, vessel.longitude], {
				icon: vesselIcon,
				mmsi: vessel.mmsi, // Speichere MMSI für spätere Updates
			});

			marker.bindPopup(html, {
				closeButton: true,
				autoClose: false,
				closeOnClick: false,
			});
			marker.addTo(mapLayers.ais);
		}
	}

	// Lösche Marker für Schiffe die nicht mehr vorhanden sind
	existingMarkers.forEach((data, mmsi) => {
		mapLayers.ais.removeLayer(data.marker);
	});

	// Aktualisiere Suche nach AIS-Update
	await initSearch();
}

async function initMap() {
	let popupCount = 0;

	// Wenn bereits initialisiert → sofort resolved
	if (mapInstance) return;

	document.getElementById("toggleAIS").style.display = "none";
	document.getElementById("showSogBtn").style.display = "none";

	// Initialisiere Layer
	mapLayers.waterways = L.featureGroup();
	mapLayers.closures = L.featureGroup();
	mapLayers.ais = L.featureGroup();

	// Promise, das resolved, sobald die Tiles geladen sind
	const mapReady = new Promise((resolve) => {
		// WICHTIG: richtiger Container!
		mapInstance = L.map("mapView", {
			closePopupOnClick: false,
			attributionControl: false,
		}).setView([52.5, 5.0], 8);

		// Hauptlayer
		const baseLayer = L.tileLayer(
			"https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
			{
				attribution:
					'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
				subdomains: "abcd",
				maxZoom: 19,
			}
		);

		// Wenn der Tile-Layer geladen ist → Map ist sichtbar
		baseLayer.on("load", () => resolve());

		baseLayer.addTo(mapInstance);

		// Overlay-Layer
		L.tileLayer("https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png", {
			attribution:
				'&copy; <a href="https://www.openseamap.org/">OpenSeaMap</a>',
			maxZoom: 18,
			opacity: 0.7,
			crossOrigin: true,
		}).addTo(mapInstance);

		// Feature-Gruppen hinzufügen
		mapLayers.waterways.addTo(mapInstance);
		mapLayers.closures.addTo(mapInstance);
		mapLayers.ais.addTo(mapInstance);

		// Popup-Handling
		mapInstance.on("popupopen", () => {
			document.getElementById("mapInfo").style.display = "none";
			popupCount++;
		});

		mapInstance.on("popupclose", () => {
			popupCount--;
			if (popupCount <= 0) {
				document.getElementById("mapInfo").style.display = "block";
			}
		});
	});

	// Auf das Laden der Tiles warten
	await mapReady;

	// Jetzt ist die Map sichtbar → weitere Initialisierung
	updateVesselPosition();
	vesselUpdateTimer = setInterval(updateVesselPosition, 5000);

	initAIS();

	return true;
}

async function loadMapData() {
	try {
		const data = await bridge.getAllData(currentLang);
		const counts = await renderMapLayers(data);

		document.getElementById("mapWaterwaysCount").textContent = counts.waterways;
		document.getElementById("mapClosuresCount").textContent = counts.closures;
		await initSearch();
	} catch (err) {
		console.error("Map data error:", err);
	}
}

let lastVesselPosition = null;

async function updateVesselPosition() {
	if (!mapInstance) return;

	try {
		// Versuche Position aus Delta-Cache zu holen
		let position = deltaHandler?.getOwnPosition();

		// Falls nicht im Cache, hole von API
		if (!position) {
			position = await bridge.getLatLon(deltaHandler?.ownVesselCache);
			if (!position) {
				document.getElementById("centerVesselBtn").style.display = "none";
				return;
			}
		}

		const { lat, lon } = position;

		// Nur updaten wenn Position sich signifikant geändert hat (>5m)
		if (lastVesselPosition) {
			const distance = Math.sqrt(
				Math.pow((lat - lastVesselPosition.lat) * 111320, 2) +
					Math.pow(
						(lon - lastVesselPosition.lon) *
							111320 *
							Math.cos((lat * Math.PI) / 180),
						2
					)
			);

			if (distance < 5) {
				return;
			}
		}
		lastVesselPosition = { lat, lon };

		document.getElementById("centerVesselBtn").style.display = "block";

		// Versuche Daten aus Delta-Cache zu holen
		let vesselData = deltaHandler?.getOwnVesselData();

		// Falls nicht im Cache oder unvollständig, hole von API
		if (!vesselData || !vesselData.navigation) {
			vesselData = await bridge.getVesselData("", deltaHandler?.ownVesselCache);
		}
		// Extrahiere SOG und COG für CPA-Berechnung
		const sog = vesselData?.navigation?.speedOverGround?.value || 0;
		const cog = vesselData?.navigation?.courseOverGroundTrue?.value || 0;

		// Konvertiere SOG von m/s zu Knoten und COG von Radiant zu Grad
		const sogKnots = sog * 1.94384;
		const cogDegrees = (cog * 180) / Math.PI;

		const ownVesselData = {
			lat,
			lon,
			sog: sogKnots,
			cog: cogDegrees,
		};

		const vesselInfo = await formatVesselData(
			vesselData,
			currentLang,
			true,
			ownVesselData
		);

		// Icon basierend auf Schiffstyp
		const shipTypeId = vesselData?.design?.aisShipType?.value?.id || 0;
		const iconSymbol = getVesselIcon(shipTypeId);

		// Erstelle oder aktualisiere Schiffsmarker
		if (!vesselMarker) {
			const vesselIcon = L.divIcon({
				html: `<div style="font-size: 24px; text-align: center; line-height: 24px;">${iconSymbol}</div>`,
				className: "vessel-marker",
				iconSize: [24, 24],
				iconAnchor: [12, 12],
			});

			const popupContent =
				'<div class="popup-content"><strong>' +
				(translations[currentLang]?.vesselInfo || "Information Schiff") +
				"</strong>" +
				vesselInfo +
				"</div>";

			vesselMarker = L.marker([lat, lon], { icon: vesselIcon })
				.addTo(mapInstance)
				.bindPopup(popupContent, {
					closeButton: true,
					autoClose: false,
					closeOnClick: false,
				});
		} else {
			// Aktualisiere Position, Icon und Popup-Inhalt
			vesselMarker.setLatLng([lat, lon]);

			// Update Icon
			const vesselIcon = L.divIcon({
				html: `<div style="font-size: 24px; text-align: center; line-height: 24px;">${iconSymbol}</div>`,
				className: "vessel-marker",
				iconSize: [24, 24],
				iconAnchor: [12, 12],
			});
			vesselMarker.setIcon(vesselIcon);

			const popupContent =
				'<div class="popup-content"><strong>' +
				(translations[currentLang]?.vesselInfo || "Information Schiff") +
				"</strong>" +
				vesselInfo +
				"</div>";

			vesselMarker.getPopup().setContent(popupContent);
		}
	} catch (err) {
		console.error("Vessel position update error:", err);
		document.getElementById("centerVesselBtn").style.display = "none";
	}
}

async function renderMapLayers(data) {
	mapLayers.waterways.clearLayers();
	mapLayers.closures.clearLayers();

	let waterwaysCount = 0;
	let closuresCount = 0;

	//
	// WATERWAYS
	//
	// WATERWAYS - MIT LINIE UND CLUSTER-MARKER
	if (data.waterways && typeof data.waterways === "object") {
		const waterwaysCluster = L.markerClusterGroup({
			maxClusterRadius: 50,
			spiderfyOnMaxZoom: true,
			showCoverageOnHover: false,
		});

		Object.entries(data.waterways).forEach(([key, entry]) => {
			if (key.startsWith("blocked-route-")) {
				const feature = entry.feature;

				if (
					feature?.geometry?.type === "LineString" ||
					feature?.geometry?.type === "MultiLineString"
				) {
					// 1. Zeichne die LINIE (ohne Popup)
					L.geoJSON(feature, {
						style: {
							color: initialConfig.colorHex || "#ff6b6b",
							weight: 3,
							opacity: 0.5, // Etwas transparenter
							interactive: false, // Keine Interaktion
						},
					}).addTo(mapLayers.waterways);

					// 2. Erstelle MARKER mit Popup für Clustering
					const coords = feature.geometry.coordinates;
					let centerLat, centerLon;

					if (feature.geometry.type === "LineString") {
						const mid = Math.floor(coords.length / 2);
						centerLon = coords[mid][0];
						centerLat = coords[mid][1];
					} else {
						const firstLine = coords[0];
						const mid = Math.floor(firstLine.length / 2);
						centerLon = firstLine[mid][0];
						centerLat = firstLine[mid][1];
					}

					const marker = L.circleMarker([centerLat, centerLon], {
						radius: 6,
						fillColor: initialConfig.colorHex || "#ff6b6b",
						color: "#333",
						weight: 2,
						opacity: 1,
						fillOpacity: 0.8,
					});

					const name = entry.name || feature.properties?.name;
					const description =
						entry.description || feature.properties?.description;

					let html = '<div class="popup-content">';
					if (name) html += `<strong>${name}</strong><br>`;
					html += "<em>Loading…</em></div>";
					marker.bindPopup(html);

					(async () => {
						const descHtml = await descriptionToHtml(
							description,
							entry.berichte,
							currentLang
						);

						let finalHtml = '<div class="popup-content">';
						if (name) finalHtml += `<strong>${name}</strong><br>`;
						finalHtml += descHtml + "</div>";

						marker.setPopupContent(finalHtml);
					})();

					waterwaysCluster.addLayer(marker);
					waterwaysCount++;
				}
			}
		});

		mapLayers.waterways.addLayer(waterwaysCluster);
	}

	//
	// CLOSURES
	//
	if (data.closures && typeof data.closures === "object") {
		const closureCluster = L.markerClusterGroup();

		Object.values(data.closures).forEach((set) => {
			const features = set?.values?.features;

			if (Array.isArray(features)) {
				const styleCfg = set.styles?.default || {};
				const stroke = styleCfg.stroke || "#333";
				const fill = styleCfg.fill || initialConfig.colorHex || "#4ecdc4";
				const width = Number(styleCfg.width) || initialConfig.pointSize || 6;

				features.forEach((feature) => {
					const berichte = feature.properties?.berichte || {};

					let allBlockages = [];
					Object.values(berichte).forEach((bericht) => {
						if (bericht.blockages && Array.isArray(bericht.blockages)) {
							allBlockages.push(...bericht.blockages);
						}
					});

					const isActiveInMapFilter = allBlockages.some((b) => {
						if (
							!mapFilter ||
							Object.keys(mapFilter).length === 0 ||
							(mapFilter.start === null && mapFilter.end === null)
						) {
							return true;
						}
						const start = b.startDate ? b.startDate : null;
						const end = b.endDate ? b.endDate : null;
						const filterStart = mapFilter.start ?? -Infinity;
						const filterEnd = mapFilter.end ?? Infinity;
						return (
							(start ?? -Infinity) <= filterEnd &&
							(end ?? Infinity) >= filterStart
						);
					});

					if (isActiveInMapFilter) {
						L.geoJSON(feature, {
							pointToLayer: (f, latlng) =>
								L.circleMarker(latlng, {
									radius: width,
									fillColor: fill,
									color: stroke,
									weight: 2,
									opacity: 0.8,
									fillOpacity: 0.7,
								}),

							onEachFeature: (f, l) => {
								const name = f.properties?.name;
								const description = f.properties?.description;

								// Sofort ein Popup binden
								let html = '<div class="popup-content">';
								if (name) html += `<strong>${name}</strong><br>`;
								html += "<em>Loading…</em></div>";
								l.bindPopup(html);

								// Asynchron nachladen
								(async () => {
									const descHtml = await descriptionToHtml(
										description,
										f.properties?.berichte,
										currentLang
									);

									let finalHtml = '<div class="popup-content">';
									if (name) finalHtml += `<strong>${name}</strong><br>`;
									finalHtml += descHtml + "</div>";

									l.setPopupContent(finalHtml);
								})();
							},
						}).eachLayer((l) => {
							closureCluster.addLayer(l);
							closuresCount++;
						});
					}
				});
			}
		});

		mapLayers.closures.addLayer(closureCluster);
	}

	return { waterways: waterwaysCount, closures: closuresCount };
}

async function initSearch() {
	countAis = 0;
	const countCurrentAis = allMarkers.filter((m) => m.type === "ais").length;
	if (countCurrentAis === 0) {
		document.getElementById("toggleAIS").style.display = "none";
		document.getElementById("showSogBtn").style.display = "none";
	}
	allMarkers = [];
	const seenMMSIs = new Set();

	// Closure Markers
	mapLayers.closures.eachLayer((layer) => {
		if (layer instanceof L.MarkerClusterGroup) {
			layer.eachLayer((marker) => {
				const props = marker.feature?.properties;
				if (props?.name) {
					allMarkers.push({
						type: "closure",
						name: props.name,
						fairway: props.fairway,
						marker: marker,
						latlng: marker.getLatLng(),
					});
				}
			});
		}
	});

	// Waterways (LineStrings/MultiLineStrings)
	mapLayers.waterways.eachLayer((layer) => {
		if (layer instanceof L.GeoJSON) {
			layer.eachLayer((sublayer) => {
				const props = sublayer.feature?.properties;
				const fairway = props?.fairway;
				if (fairway) {
					// Berechne Zentrum der Linie
					const bounds = sublayer.getBounds();
					const center = bounds.getCenter();

					allMarkers.push({
						type: "waterway",
						name: fairway,
						layer: sublayer,
						latlng: center,
					});
				}
			});
		}
	});

	// AIS Vessels - direkt aus aisDecoder holen statt aus Layer
	const vessels = aisDecoder.getVessels();
	const addedMMSIs = new Set(); // Verhindere Duplikate

	mapLayers.ais.eachLayer((layer) => {
		if (layer instanceof L.Marker && layer.options && layer.options.mmsi) {
			const mmsi = layer.options.mmsi;

			// Überspringe wenn bereits hinzugefügt
			if (seenMMSIs.has(mmsi)) return;
			seenMMSIs.add(mmsi);

			const vessel = vessels.find((v) => v.mmsi === mmsi);

			if (vessel) {
				const searchText = [String(mmsi), vessel.name, vessel.callsign]
					.filter(Boolean)
					.join(" ")
					.toLowerCase();

				allMarkers.push({
					type: "ais",
					name: vessel.name || `MMSI ${mmsi}`,
					mmsi: mmsi,
					searchText: searchText,
					marker: layer,
					latlng: layer.getLatLng(),
				});
			}
		}
	});
	// Eigenes Schiff hinzufügen
	if (vesselMarker) {
		try {
			let vesselData = deltaHandler?.getOwnVesselData();
			if (!vesselData || !vesselData.mmsi) {
				vesselData = await bridge.getVesselData(
					"",
					deltaHandler?.ownVesselCache
				);
			}

			if (vesselData && vesselData.mmsi) {
				const ownVesselMMSI = vesselData.mmsi;
				const ownVesselName = vesselData.name || "Eigenes Schiff";

				allMarkers.push({
					type: "own",
					name: ownVesselName,
					mmsi: ownVesselMMSI,
					searchText: [String(ownVesselMMSI), ownVesselName]
						.filter(Boolean)
						.join(" ")
						.toLowerCase(),
					marker: vesselMarker,
					latlng: vesselMarker.getLatLng(),
				});
			}
		} catch (err) {
			console.error("Could not add own vessel to search:", err);
		}
	}
	// Update Counter
	countAis = allMarkers.filter((m) => m.type === "ais").length;
	document.getElementById("mapAISCount").textContent = countAis;
	if (countCurrentAis === 0) {
		showHideAISElements(true, countAis === 0);
	}
	console.log(
		`Search index updated: ${
			allMarkers.filter((m) => m.type === "closure").length
		} closures, ${
			allMarkers.filter((m) => m.type === "waterway").length
		} waterways, ${countAis} AIS vessels`
	);
}

function updateMapLabels() {
	const t = translations[currentLang];
	document.querySelector(".loading-text").textContent = t.loadingText;
	document.getElementById("mapWaterwaysLabel").textContent =
		t.mapWaterwaysLabel;
	document.getElementById("mapClosuresLabel").textContent = t.mapClosuresLabel;
	document.getElementById("mapAISLabel").textContent = t.mapAISLabel;
	document.getElementById("searchLabel").textContent =
		t.searchLabel + ":" || "Suche:";
	document.getElementById("searchInput").placeholder =
		t.searchPlaceholder || "Name der Sperrung, MMSI...";
	document.getElementById("mapInfoTitle").textContent = t.mapInfoTitle; // NEU

	document.getElementById("centerVesselBtn").title =
		t.centerVesselTooltip || "Auf Schiffsposition zentrieren";
	document.getElementById("showSogBtn").title =
		t.vesselWithSogTooltip || "Nur Schiffe mit SOG>0 anzeigen";

	customElements.whenDefined("date-range-component").then(() => {
		const comp = document.querySelector("date-range-component");
		comp.setAttribute("label-start", t.mapClosureStart);
		comp.setAttribute("label-end", t.mapClosureEnd);
		comp.setAttribute("label-today", t.mapClosureToday);
		comp.setAttribute("label-all", t.mapClosureAll);
		const daysSpan = document.querySelector('input[name="daysSpan"]');
		if (daysSpan) {
			const maxdays = parseInt(daysSpan.value, 10) || 90;
			comp.setAttribute("maxdays", maxdays);
		}
	});
}

// ============================================================
// EVENT LISTENERS
// ============================================================

document.getElementById("toggleWaterways").addEventListener("change", (e) => {
	if (e.target.checked) {
		mapInstance.addLayer(mapLayers.waterways);
	} else {
		mapInstance.removeLayer(mapLayers.waterways);
	}
});

document.getElementById("toggleClosures").addEventListener("change", (e) => {
	if (e.target.checked) {
		mapInstance.addLayer(mapLayers.closures);
	} else {
		mapInstance.removeLayer(mapLayers.closures);
	}
});

const toggleAIS = document.getElementById("toggleAIS");
if (toggleAIS) {
	toggleAIS.addEventListener("change", (e) => {
		if (e.target.checked) {
			mapInstance.addLayer(mapLayers.ais);
		} else {
			mapInstance.removeLayer(mapLayers.ais);
		}
	});
}

document.getElementById("searchInput").addEventListener("input", (e) => {
	const searchTerm = e.target.value.trim().toLowerCase();
	const resultsDiv = document.getElementById("searchResults");

	if (searchTerm.length < 2) {
		resultsDiv.style.display = "none";
		resultsDiv.innerHTML = "";
		return;
	}

	const matches = allMarkers.filter((item) => {
		if (item.type === "closure") {
			return (
				item.name.toLowerCase().includes(searchTerm) ||
				(item.fairway && item.fairway.toLowerCase().includes(searchTerm))
			);
		} else if (item.type === "waterway") {
			return item.name.toLowerCase().includes(searchTerm);
		} else if (item.type === "ais" || item.type === "own") {
			// Suche in MMSI, Name und Callsign
			return item.searchText.includes(searchTerm);
		}
		return false;
	});

	if (matches.length === 0) {
		const t = translations[currentLang];
		resultsDiv.innerHTML = `<div style="padding: 0.5em; color: #999;">${
			t?.noResults || "Keine Ergebnisse"
		}</div>`;
		resultsDiv.style.display = "block";
		return;
	}

	resultsDiv.innerHTML = "";
	matches.slice(0, 10).forEach((item) => {
		const resultItem = document.createElement("div");
		resultItem.style.cssText =
			"padding: 0.5em; cursor: pointer; border-bottom: 1px solid #eee;";

		let typeIcon = "";
		let subtitle = "";

		if (item.type === "closure") {
			typeIcon = "🚫";
			subtitle = item.fairway
				? `<br><small>${escapeHtml(item.fairway)}</small>`
				: "";
		} else if (item.type === "waterway") {
			typeIcon = "🛤️";
		} else if (item.type === "own") {
			typeIcon = "⭐"; // Stern für eigenes Schiff
			subtitle = item.mmsi
				? `<br><small>MMSI ${escapeHtml(String(item.mmsi))}</small>`
				: "";
		} else if (item.type === "ais") {
			const vessel = aisDecoder.getVessel(item.mmsi);
			const iconSymbol = getVesselIcon(vessel?.shipType || 0);
			typeIcon = iconSymbol;
			subtitle = `<br><small>MMSI ${escapeHtml(String(item.mmsi))}${
				vessel?.callsign ? " · " + escapeHtml(vessel.callsign) : ""
			}</small>`;
		}

		resultItem.innerHTML = `${typeIcon} <strong>${escapeHtml(
			item.name
		)}</strong>${subtitle}`;

		resultItem.addEventListener("mouseenter", () => {
			resultItem.style.backgroundColor = "#f0f0f0";
		});
		resultItem.addEventListener("mouseleave", () => {
			resultItem.style.backgroundColor = "";
		});

		resultItem.addEventListener("click", () => {
			// Schließe zuerst ALLE Popups
			mapInstance.eachLayer((layer) => {
				if (layer instanceof L.Marker && layer.getPopup()) {
					layer.closePopup();
				}
			});

			// Zentriere auf neue Position
			mapInstance.setView(item.latlng, 15);

			// Warte kurz, dann öffne neues Popup
			setTimeout(() => {
				if (
					item.type === "closure" ||
					item.type === "ais" ||
					item.type === "own"
				) {
					item.marker.openPopup();
				} else if (item.type === "waterway") {
					item.layer.openPopup();
				}
			}, 100);

			document.getElementById("searchInput").value = "";
			resultsDiv.style.display = "none";
			resultsDiv.innerHTML = "";
		});

		resultsDiv.appendChild(resultItem);
	});

	resultsDiv.style.display = "block";
});

document.addEventListener("click", (e) => {
	// --- SEARCH RESULTS CLOSE ---
	const searchInput = document.getElementById("searchInput");
	const resultsDiv = document.getElementById("searchResults");
	if (searchInput && resultsDiv) {
		if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
			resultsDiv.style.display = "none";
		}
	}

	// --- MAP INFO TOGGLE ---
	const header = e.target.closest("#mapInfoHeader");
	if (header) {
		const mapInfo = document.getElementById("mapInfo");
		if (mapInfo) {
			mapInfo.classList.toggle("collapsed");

			const isCollapsed = mapInfo.classList.contains("collapsed");
			localStorage.setItem("mapInfoCollapsed", isCollapsed);
		}
	}
});

// Zentriere Karte auf Schiffsposition
// Zentriere Karte auf Schiffsposition
document
	.getElementById("centerVesselBtn")
	.addEventListener("click", async () => {
		let position = deltaHandler?.getOwnPosition();

		if (!position) {
			position = await bridge.getLatLon(deltaHandler?.ownVesselCache);
		}

		if (position && mapInstance) {
			// Schließe alle offenen Popups
			mapInstance.closePopup();

			// Zentriere auf Position
			mapInstance.setView([position.lat, position.lon], 13, {
				animate: true,
				duration: 0.5,
			});

			// Warte kurz, dann öffne Popup
			setTimeout(() => {
				if (vesselMarker) {
					vesselMarker.openPopup();
				}
			}, 100);
		} else {
			alert(
				translations[currentLang]?.noVesselPosition ||
					"Keine Schiffsposition verfügbar"
			);
		}
	});

const btn = document.getElementById("showSogBtn");
btn.textContent = anchorPlus;
btn.addEventListener("click", () => {
	if (btn.textContent === anchorPlus) {
		// Zeige nur Schiffe mit SOG > 0
		btn.textContent = anchorMinus;
		showOnlyMovingVessels = true;
	} else {
		// Zeige alle Schiffe
		btn.textContent = anchorPlus;
		showOnlyMovingVessels = false;
	}

	// Sofort AIS Layer neu rendern
	renderAISLayer();
});

document
	.querySelector("date-range-component")
	.addEventListener("dateRangeSelected", (e) => {
		const { start, end } = e.detail;
		if (start || end) {
			mapFilter = {
				start: start
					? (() => {
							const d = flatpickr.parseDate(start, "d.m.y");
							d.setHours(0, 0, 0, 0);
							return d.getTime();
					  })()
					: null,
				end: end
					? (() => {
							const d = flatpickr.parseDate(end, "d.m.y");
							d.setHours(23, 59, 59, 999);
							return d.getTime();
					  })()
					: null,
			};
		} else {
			mapFilter = {};
		}
		loadMapData();
	});

document.querySelectorAll(".view-toggle button").forEach((btn) => {
	btn.addEventListener("click", () => {
		const view = btn.dataset.view;
		document
			.querySelectorAll(".view-toggle button")
			.forEach((b) => b.classList.remove("active"));
		btn.classList.add("active");

		document.getElementById("configView").classList.remove("active");
		document.getElementById("mapView").classList.remove("active");

		if (view === "config") {
			document.getElementById("configView").classList.add("active");
			// Alle Timer clearen
			if (mapUpdateTimer) {
				clearInterval(mapUpdateTimer);
				mapUpdateTimer = null;
			}
			if (vesselUpdateTimer) {
				clearInterval(vesselUpdateTimer);
				vesselUpdateTimer = null;
			}
			if (aisUpdateTimer) {
				clearInterval(aisUpdateTimer);
				aisUpdateTimer = null;
			}
			if (aisWebSocket) {
				aisWebSocket.close();
				aisWebSocket = null;
			}
			// AIS Decoder aufräumen
			if (aisDecoder) {
				aisDecoder.cleanup();
			}
			// Delta Handler cleanup
			if (deltaHandler) {
				deltaHandler.disconnect();
				deltaHandler = null;
			}
		} else if (view === "map") {
			document.getElementById("mapView").classList.add("active");
			initMap();

			loadMapData();
			updateMapLabels();
			if (initialConfig.pollIntervalHours) {
				mapUpdateTimer = setInterval(
					loadMapData,
					initialConfig.pollIntervalHours * 3600000
				);
			}
		}
	});
});

export { loadMapData, mapInstance, updateMapLabels, startAutoMode };
