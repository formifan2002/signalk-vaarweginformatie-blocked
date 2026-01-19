const limitationLabels = {
	OBSTRU: { de: "Sperrung", en: "blockage" },
	PAROBS: { de: "Teilweise Blockierung", en: "partial obstruction" },
	NOSERV: { de: "Kein Service", en: "no service" },
	SERVIC: { de: "Geänderte Öffnungszeiten", en: "changed service" },
	VESDRA: { de: "Schiffstiefgang", en: "vessel draught" },
	VESBRE: { de: "Schiffsbreite", en: "vessel breadth" },
	CONBRE: { de: "Konvoibreite", en: "convoy breadth" },
	VESLEN: { de: "Schiffslänge", en: "vessel length" },
	CONLEN: { de: "Konvoilänge", en: "convoy length" },
	CLEHEI: { de: "Durchfahrtshöhe", en: "clearance height" },
	VESHEI: { de: "Schiffshöhe über Wasser", en: "vessel air draught" },
	AVALEN: { de: "verfügbare Länge", en: "available length" },
	CLEWID: { de: "Durchfahrtsbreite", en: "clearance width" },
	AVADEP: { de: "Verfügbare Tiefe", en: "available depth" },
	LEADEP: { de: "Geringste gemessene Tiefe", en: "least depth sounded" },
	DELAY: { de: "Verzögerung", en: "delay" },
	ALTER: {
		de: "Wechselnde Verkehrsrichtung",
		en: "alternate traffic direction",
	},
	TURNIN: { de: "Wenden verboten", en: "no turning" },
	PASSIN: { de: "Überholen verboten", en: "no passing" },
	OVRTAK: { de: "Überholen verboten", en: "no overtaking" },
	NOBERT: { de: "Anlegen verboten", en: "no berthing" },
	NOMOOR: { de: "Festmachen verboten", en: "no mooring" },
	ANCHOR: { de: "Ankern verboten", en: "no anchoring" },
	SPEED: { de: "Geschwindigkeitsbegrenzung", en: "speed limit" },
	WAVWAS: { de: "Störende Wasserbewegungen vermeiden", en: "no wash of waves" },
	NOSHORE: { de: "An Land gehen verboten", en: "not allowed to go ashore" },
	MINPWR: { de: "Mindestleistung", en: "minimum power" },
	CAUTIO: { de: "Besondere Vorsicht", en: "special caution" },
	NOLIM: { de: "Keine Einschränkungen", en: "no limitation" },
	REPAIR: { de: "Reparatur", en: "repair" },
	CALAMEIT: { de: "Notfall", en: "calamity" },
	WORK: { de: "Bauarbeiten", en: "work" },
	CALAMI: { de: "Notfall", en: "calamity" },
	EVENT: { de: "Veranstaltung", en: "event" },
	BLDWRK: { de: "Bauarbeiten", en: "building works" },
	INSPEC: { de: "Inspektionsarbeiten", en: "inspection" },
	FIRWRK: { de: "Feuerwerk", en: "fireworks" },
	OTHER: { de: "Sonstige Fälle", en: "other" },
	WERMCO: { de: "Wetterbedingt", en: "weather-related" },
	WATLEV: { de: "Wasserstand", en: "water level" },
	CURR: { de: "Strömung", en: "current" },
	FLOOD: { de: "Hochwasser", en: "flood" },
	ICE: { de: "Eis", en: "ice" },
	ICEDRI: { de: "Treibendes Eis", en: "ice drift" },
	ICEBRE: { de: "Eisbrecherdienst", en: "ice breaker service" },
	WIND: { de: "Wind", en: "wind" },
	VISI: { de: "Sicht", en: "visibility" },
	TEMP: { de: "Temperatur", en: "temperature" },
	DIVING: { de: "Taucharbeiten", en: "diving operations" },
	PRECIP: { de: "Niederschlag", en: "precipitation" },
};

const reasonCodeLabels = {
	EVENT: { de: "Veranstaltung", en: "event" },
	WORK: { de: "Arbeiten", en: "work" },
	DREDGE: { de: "Baggerarbeiten", en: "dredging" },
	EXERC: { de: "Übungen", en: "exercises" },
	HIGWAT: { de: "Hochwasser", en: "high water" },
	HIWAI: { de: "Marke I.", en: "water level of cautious navigation" },
	HIWAII: { de: "Marke II oder Marke III", en: "prohibitory water level" },
	LOWWAT: { de: "Niedrigwasser", en: "low water" },
	SHALLO: { de: "Versandung", en: "siltation" },
	CALAMI: { de: "Havarie", en: "calamity" },
	LAUNCH: { de: "Stapellauf", en: "launching" },
	DECLEV: { de: "Senken des Wasserspiegels", en: "lowering water level" },
	FLOMEA: { de: "Strömungsmessung", en: "flow measurement" },
	BLDWRK: { de: "Bauarbeiten", en: "building work" },
	REPAIR: { de: "Reparaturarbeiten", en: "repair" },
	INSPEC: { de: "Inspektion", en: "inspection" },
	FIRWRK: { de: "Feuerwerk", en: "fireworks" },
	LIMITA: { de: "Einschränkungen", en: "limitations" },
	CHGFWY: { de: "Änderungen des Fahrwassers", en: "changes of the fairway" },
	CONSTR: { de: "Einengung des Fahrwassers", en: "constriction of fairway" },
	DIVING: { de: "Taucher unter Wasser", en: "diver under the water" },
	SPECTR: { de: "Sondertransport", en: "special transport" },
	EXT: { de: "extreme Dotierung", en: "extensive sluicing" },
	MIN: { de: "minimale Dotierung", en: "minimum sluicing" },
	SOUND: { de: "Peilarbeiten", en: "sounding works" },
	OTHER: { de: "andere", en: "others" },
	INFSER: { de: "Informationsservice", en: "info service" },
	STRIKE: { de: "Streik", en: "strike" },
	FLOMAT: { de: "Treibgut", en: "floating material" },
	EXPLOS: { de: "Bombenräumung", en: "explosives clearing operation" },
	OBUNWA: { de: "Einschränkung unter Wasser", en: "obstruction under water" },
	FALMAT: { de: "herabfallende Gegenstände", en: "falling material" },
	DAMMAR: { de: "beschädigte Zeichen", en: "damaged marks/signs" },
	HEARIS: { de: "Gesundheitsgefahr", en: "health risk" },
	ICE: { de: "Eis", en: "ice" },
	OBSTAC: { de: "Schifffahrtshindernis", en: "obstacle" },
	CHGMAR: { de: "Schifffahrtszeichen geändert", en: "change marks" },
	HIGVOL: { de: "Hochspannungsleitung", en: "high voltage cable" },
	ECDISU: { de: "Inland ECDIS Update", en: "Inland ECDIS update" },
	LOCRUL: {
		de: "lokal gültige Verkehrsvorschriften",
		en: "local rules of traffic",
	},
	NEWOBJ: { de: "neues Objekt", en: "new object" },
	MISECH: { de: "Geisterechos", en: "false radar echos" },
	VHFCOV: { de: "Funkabdeckung", en: "radio coverage" },
	REMOBJ: { de: "Bergungsarbeiten", en: "removal of object" },
	LEVRIS: { de: "steigender Wasserstand", en: "rising water level" },
	SPCMAR: { de: "besondere Zeichen", en: "special marks" },
	WERMCO: { de: "Wetterbedingungen", en: "weather conditions" },
};

const intervalMap = {
	CON: { en: "continuous", de: "durchgehend" },
	DAY: { en: "daily", de: "täglich" },
	SUN: { en: "Sunday", de: "Sonntag" },
	MON: { en: "Monday", de: "Montag" },
	TUE: { en: "Tuesday", de: "Dienstag" },
	WED: { en: "Wednesday", de: "Mittwoch" },
	THU: { en: "Thursday", de: "Donnerstag" },
	FRI: { en: "Friday", de: "Freitag" },
	SAT: { en: "Saturday", de: "Samstag" },
	WRK: { en: "Monday to Friday", de: "Montag bis Freitag" },
	WKN: { en: "Saturday and Sunday", de: "Samstag und Sonntag" },
	DTI: { en: "day-time", de: "bei Tag" },
	NTI: { en: "night-time", de: "bei Nacht" },
	RVI: {
		en: "in case of restricted visibility",
		de: "bei beschränkten Sichtverhältnissen",
	},
	EXC: { en: "with the exception of", de: "mit Ausnahme von" },
	WRD: {
		en: "Monday to Friday except public holidays",
		de: "Montag bis Freitag ausgenommen Feiertage",
	},
};

const intervalExcludeMap = {
	SUN: { en: "Sunday", de: "Sonntag" },
	MON: { en: "Monday", de: "Montag" },
	TUE: { en: "Tuesday", de: "Dienstag" },
	WED: { en: "Wednesday", de: "Mittwoch" },
	THU: { en: "Thursday", de: "Donnerstag" },
	FRI: { en: "Friday", de: "Freitag" },
	SAT: { en: "Saturday", de: "Samstag" },
};

const targetGroupMap = {
	PLE: { de: "Freizeitschifffahrt", en: "Pleasure craft" },
	COM: { de: "Berufsschifffahrt", en: "Commercial shipping" },
	ALL: { de: "Gesamte Schifffahrt", en: "All shipping" },
};

const directionMap = {
	DWN: { de: "Talfahrt", en: "downstream" },
	UPS: { de: "Bergfahrt", en: "upstream" },
	ALL: { de: "Alle Richtungen", en: "All directions" },
};

const indicationCodes = {
	MAX: { de: "höchstens", en: "maximum" },
	MIN: { de: "mindestens", en: "minimum" },
	RED: { de: "verringert um", en: "reduced by" },
};

const referenceSystems = {
	NAP: {
		de: "NAP",
		en: "NAP",
	},
	KP: {
		de: "Kanalpegel",
		en: "Channel level",
	},
	FZP: {
		de: "FZP",
		en: "FZP",
	},
	ADR: {
		de: "Adria",
		en: "Adriatic Sea",
	},
	TAW_DNG: {
		de: "TAW",
		en: "TAW/DNG",
	},
	LDC: {
		de: "Niedrigwasserstand (Donaukommission)",
		en: "Low navigable water level (Danube Commission)",
	},
	HDC: {
		de: "Hochwasserstand (Donaukommission)",
		en: "High navigable water level (Danube Commission)",
	},
	ETRS: {
		de: "ETRS89",
		en: "ETRS89",
	},
};

const communicationCodes = {
	TE: { de: "Telefon", en: "telephone" },
	AP: { de: "Funkkanal", en: "VHF" },
	EM: { de: "E-Mail", en: "e-mail" },
	AH: { de: "Internet", en: "internet" },
	TT: { de: "Teletext", en: "teletext" },
	FX: { de: "Telefax", en: "telefax" },
	LS: { de: "Lichtsignal", en: "light signalling" },
	FS: { de: "Flaggensignal", en: "flag signalling" },
	SO: { de: "Tonsignal", en: "sound signalling" },
	EI: { de: "EDI Mailbox Nummer", en: "EDI mailbox number" },
};

function getLimitationCode(
	limitationCode,
	lat,
	lon,
	detailUrl,
	app,
	languageIsGerman
) {
	const lang = languageIsGerman ? "de" : "en";
	let type = "";

	if (limitationCode) {
		if (limitationLabels[limitationCode]) {
			// Sprache auswählen: "de" oder "en"
			type = limitationLabels[limitationCode][lang];
		} else {
			type =
				limitationCode + " - " + (languageIsGerman ? "UNBEKANNT" : "UNKNOWN");

			// Koordinaten nur ausgeben, wenn beide Werte vorhanden sind
			let coordsText = "";
			if (
				lat !== null &&
				lon !== null &&
				typeof lat === "number" &&
				typeof lon === "number"
			) {
				coordsText = languageIsGerman
					? `, Koordinaten: ${lat.toFixed(5)}, ${lon.toFixed(5)}`
					: `, Coordinates: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
			}

			if (languageIsGerman) {
				app.debug(
					`Unbekannter limitationcode: ${limitationCode}${coordsText} URL: ${detailUrl}`
				);
			} else {
				app.debug(
					`Unknown limitationcode: ${limitationCode}${coordsText} URL: ${detailUrl}`
				);
			}
		}
	}
	return type;
}

function getReasonCode(
	reasonCode,
	lat,
	lon,
	detailUrl,
	app,
	languageIsGerman
) {
	const lang = languageIsGerman ? "de" : "en";
	let type = "";

	if (reasonCode) {
		if (reasonCodeLabels[reasonCode]) {
			// Sprache auswählen: "de" oder "en"
			type = reasonCodeLabels[reasonCode][lang];
		} else {
			type = reasonCode + " - " + (languageIsGerman ? "UNBEKANNT" : "UNKNOWN");

			// Koordinaten nur ausgeben, wenn beide Werte vorhanden sind
			let coordsText = "";
			if (
				lat !== null &&
				lon !== null &&
				typeof lat === "number" &&
				typeof lon === "number"
			) {
				coordsText = languageIsGerman
					? `, Koordinaten: ${lat.toFixed(5)}, ${lon.toFixed(5)}`
					: `, Coordinates: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
			}

			if (languageIsGerman) {
				app.debug(
					`Unbekannter reasoncode: ${reasonCode}${coordsText} URL: ${detailUrl}`
				);
			} else {
				app.debug(
					`Unknown reasoncode: ${reasonCode}${coordsText} URL: ${detailUrl}`
				);
			}
		}
	}
	return type;
}

function getIntervalCode(
	codeText,
	intervalCode,
	lat,
	lon,
	detailUrl,
	app,
	languageIsGerman
) {
	const lang = languageIsGerman ? "de" : "en";
	let type = "";

	if (intervalCode) {
		if (intervalMap[intervalCode]) {
			// Sprache auswählen: "de" oder "en"
			if (!intervalExcludeMap[intervalCode]) {
				type = intervalMap[intervalCode][lang];
			}
		} else {
			type =
				intervalCode + " - " + (languageIsGerman ? "UNBEKANNT" : "UNKNOWN");

			// Koordinaten nur ausgeben, wenn beide Werte vorhanden sind
			let coordsText = "";
			if (
				lat !== null &&
				lon !== null &&
				typeof lat === "number" &&
				typeof lon === "number"
			) {
				coordsText = languageIsGerman
					? `, Koordinaten: ${lat.toFixed(5)}, ${lon.toFixed(5)}`
					: `, Coordinates: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
			}

			if (languageIsGerman) {
				app.debug(
					`Unbekannter ${codeText}: ${intervalCode}${coordsText} URL: ${detailUrl}`
				);
			} else {
				app.debug(
					`Unknown ${codeText}: ${intervalCode}${coordsText} URL: ${detailUrl}`
				);
			}
		}
	}
	return type;
}

// formatTargetGroup: builds text for target group and optionally direction
function formatTargetGroup(tg, lat, lon, detailUrl, app, languageIsGerman) {
	if (!tg || !tg.targetGroupCode) return "";
	let text = "";

	if (targetGroupMap[tg.targetGroupCode]) {
		text = languageIsGerman
			? targetGroupMap[tg.targetGroupCode].de
			: targetGroupMap[tg.targetGroupCode].en;
	} else {
		text =
			tg.targetGroupCode + (languageIsGerman ? " - UNBEKANNT" : " - UNKNOWN");

		// Koordinaten nur ausgeben, wenn beide Werte vorhanden und numerisch sind
		let coordsText = "";
		if (
			lat !== null &&
			lon !== null &&
			typeof lat === "number" &&
			typeof lon === "number"
		) {
			coordsText = languageIsGerman
				? `, Koordinaten: ${lat.toFixed(5)}, ${lon.toFixed(5)}`
				: `, Coordinates: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
		}

		if (languageIsGerman) {
			app.debug(
				`Unbekannter targetGroupCode: ${tg.targetGroupCode}${coordsText} URL: ${detailUrl}`
			);
		} else {
			app.debug(
				`Unknown targetGroupCode: ${tg.targetGroupCode}${coordsText} URL: ${detailUrl}`
			);
		}
	}

	// Richtung anhängen, falls vorhanden
	if (tg.directionCode) {
		const dirText = formatDirectionCode(
			tg.directionCode,
			lat,
			lon,
			detailUrl,
			app,
			languageIsGerman
		);
		if (dirText) text += " " + dirText;
	}

	return text;
}

function formatDirectionCode(
	directionCode,
	lat,
	lon,
	detailUrl,
	app,
	languageIsGerman
) {
	if (!directionCode) return "";
	if (directionMap[directionCode]) {
		return languageIsGerman
			? directionMap[directionCode].de
			: directionMap[directionCode].en;
	} else {
		if (languageIsGerman) {
			app.debug(
				`Unbekannter directionCode: ${directionCode}, Koordinaten: ${
					lat?.toFixed?.(5) || "n/a"
				}, ${lon?.toFixed?.(5) || "n/a"} URL: ${detailUrl}`
			);
			return directionCode + " - UNBEKANNT";
		} else {
			app.debug(
				`Unknown directionCode: ${directionCode}, Coordinates: ${
					lat?.toFixed?.(5) || "n/a"
				}, ${lon?.toFixed?.(5) || "n/a"} URL: ${detailUrl}`
			);
			return directionCode + " - UNKNOWN";
		}
	}
}

function formatReferenceCode(
	referenceCode,
	lat,
	lon,
	detailUrl,
	app,
	languageIsGerman
) {
	if (!referenceCode) return "";
	const entry = referenceSystems[referenceCode];
	if (entry) {
		return languageIsGerman ? entry.de : entry.en;
	} else {
		const fallback = languageIsGerman ? "UNBEKANNT" : "UNKNOWN";
		if (languageIsGerman) {
			app.debug(
				`Unbekannter referenceCode: ${referenceCode}, Koordinaten: ${
					lat?.toFixed?.(5) || "n/a"
				}, ${lon?.toFixed?.(5) || "n/a"} URL: ${detailUrl}`
			);
		} else {
			app.debug(
				`Unknown referenceCode: ${referenceCode}, Coordinates: ${
					lat?.toFixed?.(5) || "n/a"
				}, ${lon?.toFixed?.(5) || "n/a"} URL: ${detailUrl}`
			);
		}
		return referenceCode + " - " + fallback;
	}
}

function formatIndicationCode(
	indicationCode,
	lat,
	lon,
	detailUrl,
	app,
	languageIsGerman
) {
	if (!indicationCode) return "";
	const entry = indicationCodes[indicationCode];
	if (entry) {
		return languageIsGerman ? entry.de : entry.en;
	} else {
		const fallback = languageIsGerman ? "UNBEKANNT" : "UNKNOWN";

		// Koordinaten nur ausgeben, wenn beide Werte vorhanden und numerisch sind
		let coordsText = "";
		if (
			lat !== null &&
			lon !== null &&
			typeof lat === "number" &&
			typeof lon === "number"
		) {
			coordsText = languageIsGerman
				? `, Koordinaten: ${lat.toFixed(5)}, ${lon.toFixed(5)}`
				: `, Coordinates: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
		}

		if (languageIsGerman) {
			app.debug(
				`Unbekannter indicationCode: ${indicationCode}${coordsText} URL: ${detailUrl}`
			);
		} else {
			app.debug(
				`Unknown indicationCode: ${indicationCode}${coordsText} URL: ${detailUrl}`
			);
		}

		return indicationCode + " - " + fallback;
	}
}

export {
    communicationCodes,
    limitationLabels,
    reasonCodeLabels,
    intervalMap,
    intervalExcludeMap,
    targetGroupMap,
    directionMap,
    indicationCodes,
    referenceSystems,
    getLimitationCode,
    getReasonCode, 
    getIntervalCode,
    formatTargetGroup,
    formatDirectionCode,
    formatReferenceCode,
    formatIndicationCode,
};