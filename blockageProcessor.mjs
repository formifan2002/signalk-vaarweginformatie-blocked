import axios from "axios";
import {getReasonCode} from "./codeMappings.mjs";
import { transformDetailUrl,formatCommunications } from "./formatting.mjs";

async function createBlockages(
	target,
	details,
	validUntilMs,
	detailUrl,
	app,
	languageIsGerman,
	isRoute = false
) {
	const lat = isRoute ? null : target.lat;
	const lon = isRoute ? null : target.lon;
	const bericht = `${details.ntsNumber.year}-${details.ntsNumber.number}`;
	const allLimitations = [];
	const isCancel = details.subjectCode === "CANCEL";
	if (!target.berichte[bericht]) {
		target.berichte[bericht] = {
			bericht,
			blockages: [],
			detailUrl,
			cancelled: false,
		};
	} else {
		target.berichte[bericht].detailUrl = detailUrl;
	}

	if (isCancel) {
		if (target.berichte[bericht]) {
			// 1. Blockages entfernen
			target.berichte[bericht].blockages = [];

			// 2. Bericht als aufgehoben markieren
			target.berichte[bericht].status = "CANCELLED";
			target.berichte[bericht].cancelled = true;
		}

		return; // keine weiteren Blockages erzeugen
	}
	if (details.communications && details.communications.length > 0) {
		const commText = details.communications
			.map((c) => `${c.communicationCode}: ${c.numberAddress}`)
			.join(", ");
		target.berichte[bericht].communication = commText;
	} else {
		target.berichte[bericht].communication = "";
	}
	if (details.contents) {
		target.berichte[bericht].contents = details.contents;
	} else {
		target.berichte[bericht].contents = "";
	}

	if (details && Array.isArray(details.subjectLimitations)) {
		details.subjectLimitations.forEach((subject, idx) => {
			let coordsMatch = false;

			const hasCoords =
				Array.isArray(subject.geoObject?.coordinates) &&
				subject.geoObject.coordinates.length > 0;

			if (isRoute) {
				if (hasCoords) {
					coordsMatch = subject.geoObject.coordinates.some((apiCoord) =>
						target.coordinates.some(
							(coord) =>
								Math.abs(coord[0] - apiCoord.lon) < 0.0005 &&
								Math.abs(coord[1] - apiCoord.lat) < 0.0005
						)
					);
				} else {
					coordsMatch = true;
				}
			} else {
				// Punkt: Prüfe ob ein Punkt übereinstimmt
				coordsMatch =
					Array.isArray(subject.limitations) &&
					subject.geoObject?.coordinates?.[0]?.lat === lat &&
					subject.geoObject?.coordinates?.[0]?.lon === lon;
			}

			if (coordsMatch && Array.isArray(subject.limitations)) {
				subject.limitations.forEach((lim) => {
					if (Array.isArray(lim.limitationPeriods)) {
						lim.limitationPeriods.forEach((period) => {
							const startDate =
								(period.startDate ?? 0) + (period.startTimeMs ?? 0);
							const endDate = (period.endDate ?? 0) + (period.endTimeMs ?? 0);
							const isRelevant =
								endDate === 0 ||
								endDate >= Date.now() ||
								((period.endDate ?? 0) === 0 && (period.endTimeMs ?? 0) != 0);
							if (isRelevant) {
								const pushPeriod = {
									startDate: period.startDate,
								};

								if (period.endDate) {
									pushPeriod.endDate = period.endDate;
								}

								if (period.startTimeMs) {
									pushPeriod.startTimeMs = period.startTimeMs;
								}
								if (period.endTimeMs) {
									pushPeriod.endTimeMs = period.endTimeMs;
								}
								if (period.interval) {
									pushPeriod.interval = period.interval;
								}
								if (lim.limitationCode) {
									pushPeriod.limitationCode = lim.limitationCode;
								}
								allLimitations.push({
									lim,
									period: pushPeriod,
									subject,
								});
							}
						});
					}
				});
			}
		});
	}

	allLimitations.forEach((record) => {
		if (!target.berichte[bericht]) {
			// Sollte nicht mehr vorkommen, aber als Fallback
			const newBericht = {};
			newBericht.bericht = bericht.replace(",", "-");
			if (details.reasonCode) {
				newBericht.reasonCode = getReasonCode(
					details.reasonCode,
					lat,
					lon,
					detailUrl,
					app,
					languageIsGerman
				);
			}
			if (record.lim.limitationCode) {
				newBericht.status = record.lim.limitationCode;
			}
			newBericht.subjectCode = details.subjectCode;
			newBericht.detailUrl = detailUrl;
			newBericht.communication = formatCommunications(
				details.communications,
				languageIsGerman
			);
			newBericht.contents = details.contents;
			newBericht.blockages = [];
			target.berichte[bericht] = newBericht;
		} else {
			// NEU: Bericht existiert bereits, ergänze fehlende Details
			if (details.reasonCode && !target.berichte[bericht].reasonCode) {
				target.berichte[bericht].reasonCode = getReasonCode(
					details.reasonCode,
					lat,
					lon,
					detailUrl,
					app,
					languageIsGerman
				);
			}
			if (details.subjectCode && !target.berichte[bericht].subjectCode) {
				target.berichte[bericht].subjectCode = details.subjectCode;
			}
		}

		// Blockage hinzufügen
		const blockage = {
			startDate: record.period.startDate,
		};

		if (record.period.endDate) {
			blockage.endDate = record.period.endDate;
		}
		if (record.period.startTimeMs !== undefined) {
			blockage.startTimeMs = record.period.startTimeMs;
		}
		if (record.period.endTimeMs !== undefined) {
			blockage.endTimeMs = record.period.endTimeMs;
		}
		if (record.lim.indicationCode) {
			blockage.indicationCode = record.lim.indicationCode;
		}
		if (record.lim.unit) {
			blockage.unit = record.lim.unit;
		}
		if (record.lim.value) {
			blockage.value = record.lim.value;
		}
		if (record.lim.referenceCode) {
			blockage.referenceCode = record.lim.referenceCode;
		}
		if (record.lim.targetGroups && record.lim.targetGroups.length > 0) {
			blockage.targetGroups = record.lim.targetGroups;
		}
		if (record.period.interval) {
			blockage.interval = record.period.interval;
		}
		if (record.period.limitationCode) {
			blockage.limitationCode = record.period.limitationCode;
		}
		target.berichte[bericht].blockages.push(blockage);
	});
}

async function fetchDetailWithFallback(bericht, app, retries = 2) {
	// ⭐ retry parameter
	const base = `https://vaarweginformatie.nl/frp/api/messages/${bericht.ntsType.toLowerCase()}`;
	const withSerial = `${base}/${bericht.organisation}-${bericht.bericht}-${bericht.serialNumber}`;
	const withoutSerial = `${base}/${bericht.organisation}-${bericht.bericht}`;

	const tryFetch = async (url, attempt = 1) => {
		// ⭐ attempt parameter
		try {
			const resp = await axios.get(url, {
				timeout: 30000, // ⭐ 30 Sekunden
				maxRedirects: 5,
				validateStatus: () => true,
			});

			if (resp.status >= 400) {
				return null;
			}
			if (typeof resp.data !== "object") {
				return null;
			}
			if (!resp.data.ntsNumber && !resp.data.subjectCode) {
				return null;
			}

			return {
				data: resp.data,
				url: url,
			};
		} catch (err) {
			// ⭐ Bei Timeout: Retry
			if (err.code === "ECONNABORTED" && attempt < retries) {
				await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
				return tryFetch(url, attempt + 1);
			}

			app.error(
				`❌ Fetch exception for ${url} (attempt ${attempt}): ${err.message}`
			);
			return null;
		}
	};

	// 1. Versuch: mit serialNumber
	if (bericht.serialNumber) {
		const resp = await tryFetch(withSerial);
		if (resp) return resp;
	}

	// 2. Versuch: ohne serialNumber
	const resp = await tryFetch(withoutSerial);

	if (!resp) {
		app.error(
			`🚨 BOTH fetch attempts failed for bericht ${bericht.organisation}-${bericht.bericht}`
		);
	}

	return resp;
}

export { createBlockages, fetchDetailWithFallback };