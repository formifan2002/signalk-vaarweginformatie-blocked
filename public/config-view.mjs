// ============================================================
// CONFIGURATION VIEW
// ============================================================

import { translations, areaLabels, areaOrder } from "./translations.mjs";
import {
	currentLang,
	setCurrentLang,
	bridge,
	initialConfig,
	setInitialConfig,
} from "./utils.mjs";
import {
	loadMapData,
	mapInstance,
	startAutoMode,
	updateMapLabels,
} from "./map-view.mjs";

// UI Elements
const mainTitle = document.getElementById("mainTitle");
const generalLegend = document.getElementById("generalLegend");
const languageLabel = document.getElementById("languageLabel");
const languageHelp = document.getElementById("languageHelp");
const areasLegend = document.getElementById("areasLegend");
const paramsLegend = document.getElementById("paramsLegend");
const pollLabel = document.getElementById("pollLabel");
const pollHelp = document.getElementById("pollHelp");
const daysLabel = document.getElementById("daysLabel");
const daysHelp = document.getElementById("daysHelp");
const deeplApiKeyLabel = document.getElementById("deeplApiKeyLabel");
const deeplApiKeyHelp = document.getElementById("deeplApiKeyHelp");
const routesLabel = document.getElementById("routesLabel");
const routesHelp = document.getElementById("routesHelp");
const waypointsLabel = document.getElementById("waypointsLabel");
const waypointsHelp = document.getElementById("waypointsHelp");
const moveLabel = document.getElementById("moveLabel");
const moveHelp = document.getElementById("moveHelp");
const sizeLabel = document.getElementById("sizeLabel");
const sizeHelp = document.getElementById("sizeHelp");
const colorLabel = document.getElementById("colorLabel");
const colorHelp = document.getElementById("colorHelp");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const backBtn = document.getElementById("backBtn");
const restartBtn = document.getElementById("restartBtn");
const languageSelect = document.getElementById("languageSelect");
const enabledSwitch = document.getElementById("enabledSwitch");
const helpBtn = document.getElementById("helpBtn");
const configUrl = "/plugins/signalk-vaarweginformatie-blocked/config";
const restartUrl = "/plugins/signalk-vaarweginformatie-blocked/restart";

function showStatus(message, isError = false) {
	const status = document.getElementById("status");
	status.textContent = message;
	status.className = isError ? "error" : "success";
	setTimeout(() => {
		status.style.display = "none";
	}, 5000);
}

function setLoading(isLoading) {
	const form = document.getElementById("configForm");
	if (isLoading) {
		form.classList.add("loading");
	} else {
		form.classList.remove("loading");
	}
}

function updateUI(lang) {
	const t = translations[lang];
	document.title = t.title;
	mainTitle.textContent = t.title;
	document.querySelector(".description-text").innerHTML = t.description;
	generalLegend.textContent = t.generalLegend;
	languageLabel.textContent = t.languageLabel;
	languageHelp.textContent = t.languageHelp;
	areasLegend.textContent = t.areasLegend;
	paramsLegend.textContent = t.paramsLegend;
	pollLabel.textContent = t.pollInterval;
	pollHelp.innerHTML = t.pollHelp;
	daysLabel.textContent = t.daysSpan;
	daysHelp.textContent = t.daysHelp;
	deeplApiKeyLabel.textContent = t.deeplApiKeyLabel;
	deeplApiKeyHelp.textContent = t.deeplApiKeyHelp;
	routesLabel.textContent = t.routesPath;
	routesHelp.textContent = t.routesHelp;
	waypointsLabel.textContent = t.waypointsPath;
	waypointsHelp.textContent = t.waypointsHelp;
	moveLabel.textContent = t.moveMeters;
	moveHelp.textContent = t.moveHelp;
	sizeLabel.textContent = t.pointSize;
	sizeHelp.textContent = t.sizeHelp;
	colorLabel.textContent = t.color;
	colorHelp.textContent = t.colorHelp;
	saveBtn.textContent = t.save;
	restartBtn.textContent = t.restart;
	cancelBtn.textContent = t.cancel;
	backBtn.textContent = t.back;
	document.getElementById("enabledLabel").textContent = t.enabledLabel;
	document.getElementById("loggingLabel").textContent = t.loggingLabel;
	document.getElementById("debugLabel").textContent = t.debugLabel;
	document.getElementById("helpBtnText").textContent = t.helpBtnText;
	document.getElementById("configViewBtn").textContent = t.configViewBtn;
	document.getElementById("mapViewBtn").textContent = t.mapViewBtn;
	updateResourceInfo(lang);
}

function updateResourceInfo(lang) {
	const t = translations[lang];
	const resourceInfoDiv = document.querySelector(".resource-info");

	if (!enabledSwitch.checked) {
		resourceInfoDiv.style.display = "none";
		return;
	}

	const savedLanguageIsDe = initialConfig.language === true;
	const currentLanguageIsDe = lang === "de";

	if (savedLanguageIsDe !== currentLanguageIsDe) {
		resourceInfoDiv.style.display = "none";
		return;
	}

	resourceInfoDiv.style.display = "block";
	const host = window.location.hostname;
	const port = window.location.port || "3000";
	const resourceType = lang === "de" ? "Sperrungen" : "Closures";
	let baseUrl;

	// Wenn die Seite über HTTPS geladen wurde → Reverse Proxy
	if (window.location.protocol === "https:") {
		baseUrl = "";
	} else {
		// Lokal im WLAN → direkt zum Pi
		baseUrl = `http://${host}:${port}`;
	}

	const objectsUrl = `${baseUrl}/signalk/v2/api/resources/${resourceType}`;
	const waterwaysUrl = `${baseUrl}/signalk/v2/api/resources/routes`;

	document.getElementById("resourceTitle").textContent = t.resourceTitle;
	document.getElementById(
		"resourceObjects"
	).innerHTML = `${t.resourceObjects} <a href="${objectsUrl}" target="_blank"><code>${objectsUrl}</code></a>`;
	document.getElementById(
		"resourceWaterways"
	).innerHTML = `${t.resourceWaterways} <a href="${waterwaysUrl}" target="_blank"><code>${waterwaysUrl}</code></a>`;
}

function normalizeConfig(raw) {
	const cfg = { ...(raw || {}) };

	if (typeof cfg.language !== "undefined") {
		cfg.language = Boolean(cfg.language);
	}

	if (typeof cfg.enabled !== "undefined") cfg.enabled = Boolean(cfg.enabled);
	if (typeof cfg.enableLogging !== "undefined")
		cfg.enableLogging = Boolean(cfg.enableLogging);
	if (typeof cfg.enableDebug !== "undefined")
		cfg.enableDebug = Boolean(cfg.enableDebug);
	areaOrder.forEach((key) => {
		if (typeof cfg[key] === "undefined") cfg[key] = false;
	});
	["pollIntervalHours", "daysSpan", "movePointMeters", "pointSize"].forEach(
		(n) => {
			if (typeof cfg[n] !== "undefined") cfg[n] = Number(cfg[n]);
		}
	);
	return cfg;
}

function renderAreas(lang, config) {
	const container = document.getElementById("areas");
	Array.from(container.querySelectorAll("label")).forEach((l) => l.remove());

	const sortedAreas = [
		"All areas",
		...areaOrder
			.slice(1)
			.sort((a, b) =>
				areaLabels[a][lang].localeCompare(
					areaLabels[b][lang],
					lang === "de" ? "de-DE" : "en-US"
				)
			),
	];

	sortedAreas.forEach((key) => {
		const label = document.createElement("label");
		const cb = document.createElement("input");
		cb.type = "checkbox";
		cb.name = key;
		if (key === "All areas") cb.id = "allAreas";

		const span = document.createElement("span");
		span.className = "areaLabel";
		span.textContent = areaLabels[key][lang];

		label.appendChild(cb);
		label.appendChild(document.createTextNode(" "));
		label.appendChild(span);
		container.appendChild(label);

		if (config && typeof config[key] !== "undefined")
			cb.checked = Boolean(config[key]);
	});

	const allAreasCB = document.getElementById("allAreas");
	const others = Array.from(
		container.querySelectorAll('input[type="checkbox"]')
	).filter((cb) => cb !== allAreasCB);

	function applyAllAreasLogic() {
		if (allAreasCB.checked) {
			others.forEach((cb) => {
				cb.checked = false;
				cb.disabled = true;
			});
		} else {
			others.forEach((cb) => {
				cb.disabled = false;
			});
		}
	}

	function checkIfAllAreasNeeded() {
		const anyChecked = others.some((cb) => cb.checked);
		if (!anyChecked && !allAreasCB.checked) {
			allAreasCB.checked = true;
			applyAllAreasLogic();
		}
	}

	allAreasCB.addEventListener("change", applyAllAreasLogic);
	others.forEach((cb) =>
		cb.addEventListener("change", () => {
			if (cb.checked) {
				allAreasCB.checked = false;
				applyAllAreasLogic();
			} else {
				checkIfAllAreasNeeded();
			}
		})
	);
	applyAllAreasLogic();
	checkIfAllAreasNeeded();
}

function showConfirmDialog(message, title) {
	return new Promise((resolve) => {
		const dialog = document.getElementById("confirmDialog");
		const t = translations[currentLang];
		document.getElementById("dialogTitle").textContent =
			title || t.unsavedTitle;
		document.getElementById("dialogMessage").textContent = message;
		document.getElementById("dialogConfirm").textContent = t.yes;
		document.getElementById("dialogCancel").textContent = t.no;

		dialog.classList.add("show");

		const handleConfirm = () => {
			dialog.classList.remove("show");
			resolve(true);
		};

		const handleCancel = () => {
			dialog.classList.remove("show");
			resolve(false);
		};

		document
			.getElementById("dialogConfirm")
			.addEventListener("click", handleConfirm);
		document
			.getElementById("dialogCancel")
			.addEventListener("click", handleCancel);
	});
}

function collectConfig() {
	const configuration = {};

	configuration.enabled = document.getElementById("enabledSwitch").checked;
	configuration.enableLogging =
		document.getElementById("loggingSwitch").checked;
	configuration.enableDebug = document.getElementById("debugSwitch").checked;

	const langValue = document.getElementById("languageSelect").value;
	configuration.language = langValue === "de";

	configuration.pollIntervalHours =
		Number(document.querySelector('[name="pollIntervalHours"]').value) || 0;
	configuration.daysSpan =
		Number(document.querySelector('[name="daysSpan"]').value) || 0;
	configuration.openCpnGeoJsonPathRoutes = document.querySelector(
		'[name="openCpnGeoJsonPathRoutes"]'
	).value;
	configuration.openCpnGeoJsonPathWaypoints = document.querySelector(
		'[name="openCpnGeoJsonPathWaypoints"]'
	).value;
	configuration.movePointMeters =
		Number(document.querySelector('[name="movePointMeters"]').value) || 0;
	configuration.pointSize =
		Number(document.querySelector('[name="pointSize"]').value) || 0;
	configuration.colorHex = document.querySelector('[name="colorHex"]').value;

	areaOrder.forEach((area) => {
		const checkbox = document.querySelector(`[name="${area}"]`);
		if (checkbox) {
			configuration[area] = checkbox.checked;
		}
	});

	return configuration;
}

function updateRestartButton() {
	if (enabledSwitch.checked) {
		restartBtn.disabled = false;
		restartBtn.style.opacity = "1";
	} else {
		restartBtn.disabled = true;
		restartBtn.style.opacity = "0.5";
	}
}

function updateMapButtonState() {
	const current = normalizeConfig(collectConfig());
	const initial = normalizeConfig(initialConfig);
	const currentStr = JSON.stringify(current);
	const initialStr = JSON.stringify(initial);
	const hasChanges = currentStr !== initialStr;

	const mapBtn = document.getElementById("mapViewBtn");
	const warningDiv = document.getElementById("unsavedWarningDiv");

	if (hasChanges) {
		mapBtn.disabled = true;
		mapBtn.style.opacity = "0.5";
		mapBtn.style.cursor = "not-allowed";

		if (!warningDiv) {
			const div = document.createElement("div");
			div.id = "unsavedWarningDiv";
			div.textContent = translations[currentLang].unsavedChanges;
			div.classList.add("unsaved-warning");
			const viewToggle = document.getElementById("viewToggle");
			viewToggle.appendChild(div);
		} else {
			// Aktualisiere Text der existierenden Warnung
			warningDiv.textContent = translations[currentLang].unsavedChanges;
		}
	} else {
		mapBtn.disabled = false;
		mapBtn.style.opacity = "1";
		mapBtn.style.cursor = "pointer";
		if (warningDiv) warningDiv.remove();
	}
}

// ============================================================
// EVENT LISTENERS
// ============================================================

helpBtn.addEventListener("click", () => {
	window.open(
		"https://github.com/formifan2002/signalk-vaarweginformatie-blocked/blob/main/README.md",
		"_blank"
	);
});

enabledSwitch.addEventListener("change", () => {
	updateRestartButton();
	updateResourceInfo(currentLang);
	updateMapButtonState();
});

document.getElementById("routesFileBtn").addEventListener("click", () => {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = ".gpx";
	input.onchange = (e) => {
		const file = e.target.files[0];
		if (file) {
			document.getElementById("routesPath").value =
				file.path || file.webkitRelativePath || `/path/to/${file.name}`;
		}
	};
	input.click();
});

document.getElementById("waypointsFileBtn").addEventListener("click", () => {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = ".gpx";
	input.onchange = (e) => {
		const file = e.target.files[0];
		if (file) {
			document.getElementById("waypointsPath").value =
				file.path || file.webkitRelativePath || `/path/to/${file.name}`;
		}
	};
	input.click();
});

document.getElementById("configViewBtn").addEventListener("click", () => {
    document.getElementById("configView").style.display = "block";
    document.getElementById("mapView").style.display = "none";
    document.getElementById("mapInfo").style.display = "none";
});

document.getElementById("mapViewBtn").addEventListener("click", async () => {
    // Views umschalten
    document.getElementById("configView").style.display = "none";
    const mapView = document.getElementById("mapView");
    mapView.style.display = "block";

    // Map initialisieren oder reparieren
    if (!mapInstance) {
        await initMap();
    } else {
        mapInstance.invalidateSize();
    }

    // mapInfo anzeigen, wenn keine Popups offen sind
    let popupCount = 0;
    if (mapInstance) {
        mapInstance.eachLayer((layer) => {
            if (layer instanceof L.Marker && layer.isPopupOpen()) {
                popupCount++;
            }
        });
    }

    document.getElementById("mapInfo").style.display =
        popupCount > 0 ? "none" : "block";
});



languageSelect.addEventListener("change", (e) => {
	setCurrentLang(e.target.value);
	updateUI(currentLang);
	updateResourceInfo(currentLang);
	updateMapLabels();
	const currentConfig = normalizeConfig(collectConfig());
	renderAreas(currentLang, currentConfig);
	updateMapButtonState();
});

document.getElementById("configForm").addEventListener("input", () => {
	updateMapButtonState();
});

document.getElementById("configForm").addEventListener("change", () => {
	updateMapButtonState();
});

document.getElementById("configForm").addEventListener("submit", (e) => {
	e.preventDefault();
	const collected = collectConfig();
	const normalized = normalizeConfig(collected);
	const { enabled, enableLogging, enableDebug, ...configuration } = normalized;
	const payload = {
		configuration,
		enabled: Boolean(enabled),
		enableLogging: Boolean(enableLogging),
		enableDebug: Boolean(enableDebug),
	};

	setLoading(true);
	fetch(configUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	})
		.then((res) => res.json())
		.then(() => {
			showStatus(translations[currentLang].saveSuccess);
			const initial = collectConfig();
			setInitialConfig(initial);
			updateMapButtonState();

			if (!enabled) return Promise.resolve();
			return fetch(restartUrl, { method: "POST" });
		})
		.then((res) => {
			if (res && !res.ok) throw new Error(res.status);
			return res ? res.json() : null;
		})
		.then(() => {
			showStatus(translations[currentLang].restartSuccess);
			if (typeof loadMapData === "function") loadMapData();
		})
		.catch((err) => {
			showStatus(translations[currentLang].saveError + err.message, true);
		})
		.finally(() => setLoading(false));
});

restartBtn.addEventListener("click", () => {
	setLoading(true);
	fetch(restartUrl, { method: "POST" })
		.then((res) => res.json())
		.then(() => showStatus(translations[currentLang].restartSuccess))
		.catch((err) =>
			showStatus(translations[currentLang].restartError + err.message, true)
		)
		.finally(() => setLoading(false));
});

cancelBtn.addEventListener("click", () => window.history.back());

backBtn.addEventListener("click", async () => {
	const current = collectConfig();
	const initial = initialConfig;
	const changed = JSON.stringify(current) !== JSON.stringify(initial);

	if (changed) {
		const confirmed = await showConfirmDialog(
			translations[currentLang].unsavedWarning,
			translations[currentLang].unsavedTitle
		);
		if (confirmed) window.history.back();
	} else {
		window.history.back();
	}
});

// ============================================================
// LOAD INITIAL CONFIGURATION
// ============================================================

fetch(configUrl)
	.then((res) => res.json())
	.then((data) => {
		const raw = data.configuration || {};
		const initial = {
			...raw,
			enabled: data.enabled,
			enableLogging: data.enableLogging,
			enableDebug: data.enableDebug,
		};
		setInitialConfig(initial);
		const normalized = normalizeConfig(initialConfig);

		setCurrentLang(normalized.language ? "de" : "en");
		languageSelect.value = currentLang;
		updateUI(currentLang);
		renderAreas(currentLang, normalized);

		document.getElementById("enabledSwitch").checked = Boolean(
			normalized.enabled
		);
		document.getElementById("loggingSwitch").checked = Boolean(
			normalized.enableLogging
		);
		document.getElementById("debugSwitch").checked = Boolean(
			normalized.enableDebug
		);
		updateRestartButton();
		updateResourceInfo(currentLang);

		[
			"pollIntervalHours",
			"daysSpan",
			"openCpnGeoJsonPathRoutes",
			"openCpnGeoJsonPathWaypoints",
			"movePointMeters",
			"pointSize",
			"colorHex",
		].forEach((name) => {
			const el = document.querySelector(`[name="${name}"]`);
			if (el && normalized[name] !== undefined) {
				el.value = normalized[name];
			}
		});

		const init = collectConfig();
		setInitialConfig(init);
		// Nach dem Laden der Config startAutoMode aufrufen
		if (typeof startAutoMode === "function") {
			startAutoMode();
		}
	})
	.catch((err) => {
		showStatus(
			(translations[currentLang]?.loadError || "Fehler beim Laden: ") +
				err.message,
			true
		);
	});
