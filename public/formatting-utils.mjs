import { translations } from "./translations.mjs";
import { escapeHtml } from "./common-utils.mjs";
import { aisShipTypes } from "./utils.mjs";

// Formatiere Zeitstempel
function formatTimestamp(timestamp, lang) {
	if (!timestamp) return "";

	const t = translations[lang];
	const date = new Date(timestamp);
	const now = new Date();
	const diffMs = now - date;
	const diffSec = Math.floor(diffMs / 1000);

	// Weniger als 24 Stunden: Rückgabe relative Zeit (vor x Stunden y Minuten z Sekunden)
	if (diffSec < 86400) {
		const hours = Math.floor(diffSec / 3600);
		const minutes = Math.floor((diffSec % 3600) / 60);
		const seconds = diffSec % 60;

		let parts = [];
		if (hours > 0) parts.push(`${hours} ${t.timeHours || "Stunden"}`);
		if (minutes > 0) parts.push(`${minutes} ${t.timeMinutes || "Minuten"}`);
		if (seconds > 0 || parts.length === 0)
			parts.push(`${seconds} ${t.timeSeconds || "Sekunden"}`);

		const result =
			lang === "de"
				? `${t.timeAgo || "vor"} ${parts.join(" ")}`
				: `${parts.join(" ")} ${t.timeAgo || "ago"}`;
		return result.trim();
	}

	// Älter als 24 Stunden: absolutes Datum
	return formatDate(date, lang);
}

function formatDate(date, lang) {
	const day = String(date.getDate()).padStart(2, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const year = String(date.getFullYear()).slice(-2);

	// Gemeinsame Teile
	const hours = String(date.getHours()).padStart(2, "0");
	const mins = String(date.getMinutes()).padStart(2, "0");
	const secs = String(date.getSeconds()).padStart(2, "0");
	const time = `${hours}:${mins}:${secs}`;

	if (lang === "de") {
		return `${day}.${month}.${year} ${time}`;
	} else {
		return `${month}/${day}/${year} ${time}`;
	}
}

// Formatiere Position in Grad/Minuten (DMM)
function formatPositionDMM(lat, lon) {
	if (!lat || !lon) return "";

	// Latitude
	const latDir = lat >= 0 ? "N" : "S";
	const latAbs = Math.abs(lat);
	const latDeg = Math.floor(latAbs);
	const latMin = (latAbs - latDeg) * 60;

	// Longitude
	const lonDir = lon >= 0 ? "E" : "W";
	const lonAbs = Math.abs(lon);
	const lonDeg = Math.floor(lonAbs);
	const lonMin = (lonAbs - lonDeg) * 60;

	return `${latDeg}° ${latMin.toFixed(
		3
	)}' ${latDir}, ${lonDeg}° ${lonMin.toFixed(3)}' ${lonDir}`;
}

async function formatVesselData(
	vesselData,
	lang,
	isOwnVessel = false,
	ownVesselData = null
) {
	if (!vesselData) return "";

	const t = translations[lang];
	let html = "";

	// Name und MMSI
	if (vesselData.name) {
		html += `<div style="margin-top: 0.5em;"><strong>${
			t.vesselName
		}:</strong> ${escapeHtml(vesselData.name)}</div>`;
	}
	if (vesselData.mmsi) {
		const mmsiEsc = escapeHtml(vesselData.mmsi);
		html += `<div>
        <strong>${t.vesselMmsi}:</strong> 
        <a href="https://www.vesselfinder.com/de/vessels/details/${mmsiEsc}" 
          target="_blank" rel="noopener noreferrer">
          ${mmsiEsc}
        </a>
      </div>`;
	}

	// IMO (falls vorhanden)
	if (vesselData.imo && vesselData.imo !== "0") {
		html += `<div style="margin-top: 0.5em;"><strong>IMO:</strong> ${escapeHtml(
			String(vesselData.imo)
		)}</div>`;
	}

	// Destination
	if (vesselData.destination) {
		html += `<div><strong>${t?.destination || "Ziel"}:</strong> ${escapeHtml(
			vesselData.destination
		)}</div>`;
	}

	// ETA
	if (vesselData.eta) {
		const locale = lang === "de" ? "de-DE" : "en-US";

		const formattedEta = vesselData.eta.toLocaleString(locale, {
			year: "2-digit",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});

		html += `<div><strong>${
			t?.eta || "Geschätzte Ankunftszeit"
		}:</strong> ${escapeHtml(formattedEta)}</div>`;
	}

	// Position anzeigen
	if (isOwnVessel && ownVesselData) {
		// Eigenes Schiff - Position aus ownVesselData
		if (ownVesselData.lat && ownVesselData.lon) {
			const dmmPos = formatPositionDMM(ownVesselData.lat, ownVesselData.lon);
			html += `<div style="margin-top: 0.5em;"><strong>${t.position}:</strong></div>`;
			html += `<div style="margin-left: 1em;">${ownVesselData.lat.toFixed(
				6
			)}, ${ownVesselData.lon.toFixed(6)} (lat,lon)</div>`;
			html += `<div style="margin-left: 1em;">${dmmPos} (DMM)</div>`;
		}

		// Letzte Positionsänderung aus navigation.position.timestamp
		const posTimestamp = vesselData?.navigation?.position?.timestamp;
		if (posTimestamp) {
			const timestamp = formatTimestamp(posTimestamp, lang);
			html += `<div style="margin-left: 1em;">${timestamp} (${t.lastPositionUpdate})</div>`;
		}
	} else if (!isOwnVessel) {
		// AIS Ziel - Position aus vesselData
		if (vesselData.latitude && vesselData.longitude) {
			const dmmPos = formatPositionDMM(
				vesselData.latitude,
				vesselData.longitude
			);
			html += `<div style="margin-top: 0.5em;"><strong>${t.position}:</strong></div>`;
			html += `<div style="margin-left: 1em;">${vesselData.latitude.toFixed(
				6
			)}, ${vesselData.longitude.toFixed(6)} (lat,lon)</div>`;
			html += `<div style="margin-left: 1em;">${dmmPos} (DMM)</div>`;
		}

		// Letzte Positionsänderung
		if (vesselData.positionTimestamp) {
			const timestamp = formatTimestamp(vesselData.positionTimestamp, lang);
			html += `<div style="margin-left: 1em;">${timestamp} (${t.lastPositionUpdate})</div>`;
		}

		// AIS-Klasse anzeigen
		if (vesselData.aisClass) {
			html += `<div style="margin-top: 0.5em;"><strong>${t.aisClass}:</strong> ${vesselData.aisClass}</div>`;
		}

		// CPA/TCPA berechnen
		if (ownVesselData && ownVesselData.lat && ownVesselData.lon) {
			const cpaData = calculateCPATCPA(ownVesselData, vesselData);

			if (cpaData.cpa !== null) {
				html += `<div style="margin-top: 0.5em;"><strong>${
					t.cpa
				}:</strong> ${cpaData.cpa.toFixed(2)} NM</div>`;
			}

			if (cpaData.tcpa !== null) {
				const tcpaMin = Math.floor(cpaData.tcpa);
				const tcpaSec = Math.floor((cpaData.tcpa - tcpaMin) * 60);
				html += `<div><strong>${t.tcpa}:</strong> ${tcpaMin} min ${tcpaSec} s</div>`;
			}
		}
	}

	// Communication
	if (
		vesselData.communication &&
		Object.keys(vesselData.communication).length > 0
	) {
		const commKeys = Object.keys(vesselData.communication);

		if (commKeys.length > 1) {
			html += `<div style="margin-top: 0.5em;"><strong>${t.vesselCommunication}:</strong></div>`;
		}

		Object.entries(vesselData.communication).forEach(([key, value]) => {
			const translationKey = key.replace(/([A-Z])/g, (match) =>
				match.toLowerCase()
			);
			const label = t[translationKey] || key;
			const indent = commKeys.length > 1 ? "1em" : "0";
			html += `<div style="margin-left: ${indent}; margin-top: 0.5em;"><strong>${escapeHtml(
				label
			)}:</strong> ${escapeHtml(String(value))}</div>`;
		});
	}

	// Callsign für AIS Ziele
	if (vesselData.callsign && vesselData.callsign.toUpperCase() != "UNKNOWN") {
		html += `<div style="margin-top: 0.5em;"><strong>${
			t.callsignvhf
		}:</strong> ${escapeHtml(vesselData.callsign)}</div>`;
	}

	// Design
	if (vesselData.design && Object.keys(vesselData.design).length > 0) {
		html += `<div style="margin-top: 0.5em;"><strong>${t.vesselDesign}:</strong></div>`;

		Object.entries(vesselData.design).forEach(([key, data]) => {
			const value = data?.value;
			if (value === undefined || value === null) return;

			if (typeof value === "object" && !Array.isArray(value)) {
				const subKeys = Object.keys(value);

				if (key === "aisShipType" && value.id !== undefined && value.id != 0) {
					const shipTypeId = value.id;
					const shipTypeName =
						aisShipTypes[lang][shipTypeId] ||
						value.name ||
						`Type ${shipTypeId}`;
					const label = t.aisshiptype || "Schiffstyp";
					html += `<div style="margin-left: 1em;"><strong>${escapeHtml(
						label
					)}:</strong> ${escapeHtml(shipTypeName)}</div>`;
					return;
				}

				if (subKeys.length > 1) {
					const parentLabel = t[key] || key;
					html += `<div style="margin-left: 1em; margin-top: 0.3em;"><em>${escapeHtml(
						parentLabel
					)}:</em></div>`;
				}

				Object.entries(value).forEach(([subKey, subValue]) => {
					if (subValue === undefined || subValue === null) return;

					const translationKey = key + subKey;
					const subLabel = t[translationKey] || subKey;

					let displayValue = subValue;
					if (typeof subValue === "object") {
						displayValue = subValue.name || JSON.stringify(subValue);
					}

					const unit =
						data?.meta?.units || data?.meta?.properties?.[subKey]?.units;
					if (unit && typeof displayValue === "number") {
						displayValue += ` ${unit}`;
					}

					const indent = subKeys.length > 1 ? "2em" : "1em";
					html += `<div style="margin-left: ${indent};"><strong>${escapeHtml(
						subLabel
					)}:</strong> ${escapeHtml(String(displayValue))}</div>`;
				});
			} else {
				const translationKey = key.replace(/([A-Z])/g, (match) =>
					match.toLowerCase()
				);
				const label = t[translationKey] || key;
				let displayValue = String(value);

				const unit = data?.meta?.units;
				if (unit) {
					displayValue += ` ${unit}`;
				}

				html += `<div style="margin-left: 1em;"><strong>${escapeHtml(
					label
				)}:</strong> ${escapeHtml(displayValue)}</div>`;
			}
		});
	}

	// Schiffstyp für AIS Ziele (falls nicht in design)
	if (
		!isOwnVessel &&
		vesselData.shipType !== undefined &&
		vesselData.shipType != 0 &&
		!vesselData.design?.aisShipType
	) {
		const shipTypeName =
			aisShipTypes[lang][vesselData.shipType] || `Type ${vesselData.shipType}`;
		html += `<div style="margin-top: 0.5em;"><strong>${
			t.aisshiptype
		}:</strong> ${escapeHtml(shipTypeName)}</div>`;
	}

	// Dimensionen für AIS Ziele
	if (!isOwnVessel) {
		if (vesselData.length || vesselData.length || vesselData.draught) {
			html += `<div style="margin-top: 0.5em;"><strong>${t.vesselDesign}:</strong></div>`;
		}
		if (vesselData.length) {
			html += `<div style="margin-left: 1em;"><strong>${t.length}:</strong> ${vesselData.length} m</div>`;
		}
		if (vesselData.width) {
			html += `<div style="margin-left: 1em;"><strong>${t.beam}:</strong> ${vesselData.width} m</div>`;
		}
		if (vesselData.draught) {
			html += `<div style="margin-left: 1em;"><strong>${t.draft}:</strong> ${vesselData.draught} m</div>`;
		}
	}

	return html;
}

// Berechne CPA/TCPA
function calculateCPATCPA(ownVessel, targetVessel) {
    const ownLat = ownVessel.lat;
    const ownLon = ownVessel.lon;
    const ownSOG = ownVessel.sog || 0;
    const ownCOG = ownVessel.cog || 0;

    const targetLat = targetVessel.latitude;
    const targetLon = targetVessel.longitude;
    const targetSOG = targetVessel.sog || 0;
    const targetCOG = targetVessel.cog || 0;

    if (!ownLat || !ownLon || !targetLat || !targetLon) {
        return { cpa: null, tcpa: null };
    }

    const dLat = (targetLat - ownLat) * 60;
    const dLon = (targetLon - ownLon) * 60 * Math.cos((ownLat * Math.PI) / 180);
    const currentDist = Math.sqrt(dLat * dLat + dLon * dLon);

    const ownVelN = ownSOG * Math.cos((ownCOG * Math.PI) / 180);
    const ownVelE = ownSOG * Math.sin((ownCOG * Math.PI) / 180);
    const targetVelN = targetSOG * Math.cos((targetCOG * Math.PI) / 180);
    const targetVelE = targetSOG * Math.sin((targetCOG * Math.PI) / 180);

    const relVelN = targetVelN - ownVelN;
    const relVelE = targetVelE - ownVelE;
    const relSpeed = Math.sqrt(relVelN * relVelN + relVelE * relVelE);

    if (relSpeed < 0.1) {
        return { cpa: currentDist, tcpa: null };
    }

    const tcpa = -(dLat * relVelN + dLon * relVelE) / (relSpeed * relSpeed);

    if (tcpa < 0) {
        return { cpa: currentDist, tcpa: null };
    }

    const cpaLat = dLat + relVelN * tcpa;
    const cpaLon = dLon + relVelE * tcpa;
    const cpa = Math.sqrt(cpaLat * cpaLat + cpaLon * cpaLon);

    return {
        cpa: cpa,
        tcpa: tcpa * 60,
    };
}

export { formatTimestamp, formatDate, formatPositionDMM, formatVesselData };