// utils.js - helper functions 
const limitationLabels = {
  OBSTRU:   { de: "Sperrung", en: "blockage" },
  PAROBS:   { de: "Teilweise Blockierung", en: "partial obstruction" },
  NOSERV:   { de: "Kein Service", en: "no service" },
  SERVIC:   { de: "Geänderte Öffnungszeiten", en: "changed service" },
  VESDRA:   { de: "Schiffstiefgang", en: "vessel draught" },
  VESBRE:   { de: "Schiffsbreite", en: "vessel breadth" },
  CONBRE:   { de: "Konvoibreite", en: "convoy breadth" },
  VESLEN:   { de: "Schiffslänge", en: "vessel length" },
  CONLEN:   { de: "Konvoilänge", en: "convoy length" },
  CLEHEI:   { de: "Durchfahrtshöhe", en: "clearance height" },
  VESHEI:   { de: "Schiffshöhe über Wasser", en: "vessel air draught" },
  AVALEN:   { de: "verfügbare Länge", en: "available length" },
  CLEWID:   { de: "Durchfahrtsbreite", en: "clearance width" },
  AVADEP:   { de: "Verfügbare Tiefe", en: "available depth" },
  LEADEP:   { de: "Geringste gemessene Tiefe", en: "least depth sounded" },
  DELAY:    { de: "Verzögerung", en: "delay" },
  ALTER:    { de: "Wechselnde Verkehrsrichtung", en: "alternate traffic direction" },
  TURNIN:   { de: "Wenden verboten", en: "no turning" },
  PASSIN:   { de: "Überholen verboten", en: "no passing" },
  OVRTAK:   { de: "Überholen verboten", en: "no overtaking" },
  NOBERT:   { de: "Anlegen verboten", en: "no berthing" },
  NOMOOR:   { de: "Festmachen verboten", en: "no mooring" },
  ANCHOR:   { de: "Ankern verboten", en: "no anchoring" },
  SPEED:    { de: "Geschwindigkeitsbegrenzung", en: "speed limit" },
  WAVWAS:   { de: "Störende Wasserbewegungen vermeiden", en: "no wash of waves" },
  NOSHORE:  { de: "An Land gehen verboten", en: "not allowed to go ashore" },
  MINPWR:   { de: "Mindestleistung", en: "minimum power" },
  CAUTIO:   { de: "Besondere Vorsicht", en: "special caution" },
  NOLIM:    { de: "Keine Einschränkungen", en: "no limitation" },
  REPAIR:   { de: "Reparatur", en: "repair" },
  CALAMEIT: { de: "Notfall", en: "calamity" },
  WORK:     { de: "Bauarbeiten", en: "work" },
  CALAMI:   { de: "Notfall", en: "calamity" },
  EVENT:    { de: "Veranstaltung", en: "event" },
  BLDWRK:   { de: "Bauarbeiten", en: "building works" },
  INSPEC:   { de: "Inspektionsarbeiten", en: "inspection" },
  FIRWRK:   { de: "Feuerwerk", en: "fireworks" },
  OTHER:    { de: "Sonstige Fälle", en: "other" },
  WERMCO:   { de: "Wetterbedingt", en: "weather-related" },
  WATLEV:   { de: "Wasserstand", en: "water level" },
  CURR:     { de: "Strömung", en: "current" },
  FLOOD:    { de: "Hochwasser", en: "flood" },
  ICE:      { de: "Eis", en: "ice" },
  ICEDRI:   { de: "Treibendes Eis", en: "ice drift" },
  ICEBRE:   { de: "Eisbrecherdienst", en: "ice breaker service" },
  WIND:     { de: "Wind", en: "wind" },
  VISI:     { de: "Sicht", en: "visibility" },
  TEMP:     { de: "Temperatur", en: "temperature" },
  DIVING:   { de: "Taucharbeiten", en: "diving operations" },
  PRECIP:   { de: "Niederschlag", en: "precipitation" }
};

const reasonCodeLabels = {
  EVENT:   { de: "Veranstaltung", en: "event" },
  WORK:    { de: "Arbeiten", en: "work" },
  DREDGE:  { de: "Baggerarbeiten", en: "dredging" },
  EXERC:   { de: "Übungen", en: "exercises" },
  HIGWAT:  { de: "Hochwasser", en: "high water" },
  HIWAI:   { de: "Marke I.", en: "water level of cautious navigation" },
  HIWAII:  { de: "Marke II oder Marke III", en: "prohibitory water level" },
  LOWWAT:  { de: "Niedrigwasser", en: "low water" },
  SHALLO:  { de: "Versandung", en: "siltation" },
  CALAMI:  { de: "Havarie", en: "calamity" },
  LAUNCH:  { de: "Stapellauf", en: "launching" },
  DECLEV:  { de: "Senken des Wasserspiegels", en: "lowering water level" },
  FLOMEA:  { de: "Strömungsmessung", en: "flow measurement" },
  BLDWRK:  { de: "Bauarbeiten", en: "building work" },
  REPAIR:  { de: "Reparaturarbeiten", en: "repair" },
  INSPEC:  { de: "Inspektion", en: "inspection" },
  FIRWRK:  { de: "Feuerwerk", en: "fireworks" },
  LIMITA:  { de: "Einschränkungen", en: "limitations" },
  CHGFWY:  { de: "Änderungen des Fahrwassers", en: "changes of the fairway" },
  CONSTR:  { de: "Einengung des Fahrwassers", en: "constriction of fairway" },
  DIVING:  { de: "Taucher unter Wasser", en: "diver under the water" },
  SPECTR:  { de: "Sondertransport", en: "special transport" },
  EXT:     { de: "extreme Dotierung", en: "extensive sluicing" },
  MIN:     { de: "minimale Dotierung", en: "minimum sluicing" },
  SOUND:   { de: "Peilarbeiten", en: "sounding works" },
  OTHER:   { de: "andere", en: "others" },
  INFSER:  { de: "Informationsservice", en: "info service" },
  STRIKE:  { de: "Streik", en: "strike" },
  FLOMAT:  { de: "Treibgut", en: "floating material" },
  EXPLOS:  { de: "Bombenräumung", en: "explosives clearing operation" },
  OBUNWA:  { de: "Einschränkung unter Wasser", en: "obstruction under water" },
  FALMAT:  { de: "herabfallende Gegenstände", en: "falling material" },
  DAMMAR:  { de: "beschädigte Zeichen", en: "damaged marks/signs" },
  HEARIS:  { de: "Gesundheitsgefahr", en: "health risk" },
  ICE:     { de: "Eis", en: "ice" },
  OBSTAC:  { de: "Schifffahrtshindernis", en: "obstacle" },
  CHGMAR:  { de: "Schifffahrtszeichen geändert", en: "change marks" },
  HIGVOL:  { de: "Hochspannungsleitung", en: "high voltage cable" },
  ECDISU:  { de: "Inland ECDIS Update", en: "Inland ECDIS update" },
  LOCRUL:  { de: "lokal gültige Verkehrsvorschriften", en: "local rules of traffic" },
  NEWOBJ:  { de: "neues Objekt", en: "new object" },
  MISECH:  { de: "Geisterechos", en: "false radar echos" },
  VHFCOV:  { de: "Funkabdeckung", en: "radio coverage" },
  REMOBJ:  { de: "Bergungsarbeiten", en: "removal of object" },
  LEVRIS:  { de: "steigender Wasserstand", en: "rising water level" },
  SPCMAR:  { de: "besondere Zeichen", en: "special marks" },
  WERMCO:  { de: "Wetterbedingungen", en: "weather conditions" }
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
  RVI: { en: "in case of restricted visibility", de: "bei beschränkten Sichtverhältnissen" },
  EXC: { en: "with the exception of", de: "mit Ausnahme von" },
  WRD: { en: "Monday to Friday except public holidays", de: "Montag bis Freitag ausgenommen Feiertage" }
};

const intervalExcludeMap = {
  SUN: { en: "Sunday", de: "Sonntag" },
  MON: { en: "Monday", de: "Montag" },
  TUE: { en: "Tuesday", de: "Dienstag" },
  WED: { en: "Wednesday", de: "Mittwoch" },
  THU: { en: "Thursday", de: "Donnerstag" },
  FRI: { en: "Friday", de: "Freitag" },
  SAT: { en: "Saturday", de: "Samstag" }
};

const targetGroupMap = {
   PLE: { de: "Freizeitschifffahrt", en: "Pleasure craft" },
   COM: { de: "Berufsschifffahrt",   en: "Commercial shipping" },
   ALL: { de: "Gesamte Schifffahrt", en: "All shipping" }
 };

const directionMap = {
    DWN: { de: "Talfahrt",        en: "downstream" },
    UPS: { de: "Bergfahrt",       en: "upstream" },
    ALL: { de: "Alle Richtungen", en: "All directions" }
  };

const indicationCodes = {
    MAX: { de: "höchstens", en: "maximum" },
    MIN: { de: "mindestens", en: "minimum" },
    RED: { de: "verringert um", en: "reduced by" }
  };

const referenceSystems = {
  NAP: {
    de: "NAP",
    en: "NAP"
  },
  KP: {
    de: "Kanalpegel",
    en: "Channel level"
  },
  FZP: {
    de: "FZP",
    en: "FZP"
  },
  ADR: {
    de: "Adria",
    en: "Adriatic Sea"
  },
  TAW_DNG: {
    de: "TAW",
    en: "TAW/DNG"
  },
  LDC: {
    de: "Niedrigwasserstand (Donaukommission)",
    en: "Low navigable water level (Danube Commission)"
  },
  HDC: {
    de: "Hochwasserstand (Donaukommission)",
    en: "High navigable water level (Danube Commission)"
  },
  ETRS: {
    de: "ETRS89",
    en: "ETRS89"
  }
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
  EI: { de: "EDI Mailbox Nummer", en: "EDI mailbox number" }
};

function escapeXml(unsafe) {
  if (unsafe === undefined || unsafe === null) return '';
  return unsafe.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function calculateRouteDistance(coordinates) {
  let totalDistance = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];
    totalDistance += calculateDistance(lat1, lon1, lat2, lon2);
  }
  return Math.round(totalDistance);
}

function movePointEast(lat, lon, meters) {
  const latRad = lat * Math.PI / 180;
  const metersPerDegree = 111320 * Math.cos(latRad);
  const deltaLon = meters / metersPerDegree;
  return [lat, lon + deltaLon, ];
}


function formatDateISO(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (!isFinite(d)) return '';
  return d.toISOString();
}

// formatTargetGroup: builds text for target group and optionally direction
function formatTargetGroup(tg, lat, lon, detailUrl, app, languageIsGerman) {
  if (!tg || !tg.targetGroupCode) return '';
  let text = '';

  if (targetGroupMap[tg.targetGroupCode]) {
    text = languageIsGerman
      ? targetGroupMap[tg.targetGroupCode].de
      : targetGroupMap[tg.targetGroupCode].en;
  } else {
    text = tg.targetGroupCode + (languageIsGerman ? " - UNBEKANNT" : " - UNKNOWN");

    // Koordinaten nur ausgeben, wenn beide Werte vorhanden und numerisch sind
    let coordsText = "";
    if (lat !== null && lon !== null && typeof lat === "number" && typeof lon === "number") {
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
    const dirText = formatDirectionCode(tg.directionCode, lat, lon, detailUrl, app, languageIsGerman);
    if (dirText) text += " " + dirText;
  }

  return text;
}

function formatDirectionCode(directionCode, lat, lon, detailUrl, app, languageIsGerman) {
  if (!directionCode) return '';
  if (directionMap[directionCode]) {
    return languageIsGerman
      ? directionMap[directionCode].de
      : directionMap[directionCode].en;
  } else {
    if (languageIsGerman) {
      app.debug(
        `Unbekannter directionCode: ${directionCode}, Koordinaten: ${lat?.toFixed?.(5) || 'n/a'}, ${lon?.toFixed?.(5) || 'n/a'} URL: ${detailUrl}`
      );
      return directionCode + " - UNBEKANNT";
    } else {
      app.debug(
        `Unknown directionCode: ${directionCode}, Coordinates: ${lat?.toFixed?.(5) || 'n/a'}, ${lon?.toFixed?.(5) || 'n/a'} URL: ${detailUrl}`
      );
      return directionCode + " - UNKNOWN";
    }
  }
}

function getLimitationCode(limitationCode, lat, lon, detailUrl, app, languageIsGerman) {
  const lang = languageIsGerman ? 'de' : 'en';
  let type = "";

  if (limitationCode) {
    if (limitationLabels[limitationCode]) {
      // Sprache auswählen: "de" oder "en"
      type = limitationLabels[limitationCode][lang];
    } else {
      type = limitationCode + " - " + (languageIsGerman ? "UNBEKANNT" : "UNKNOWN");

      // Koordinaten nur ausgeben, wenn beide Werte vorhanden sind
      let coordsText = "";
      if (lat !== null && lon !== null && typeof lat === "number" && typeof lon === "number") {
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

function getReaseonCode(reasonCode, lat, lon, detailUrl, app, languageIsGerman) {
  const lang = languageIsGerman ? 'de' : 'en';
  let type = "";

  if (reasonCode) {
    if (reasonCodeLabels[reasonCode]) {
      // Sprache auswählen: "de" oder "en"
      type = reasonCodeLabels[reasonCode][lang];
    } else {
      type = reasonCode + " - " + (languageIsGerman ? "UNBEKANNT" : "UNKNOWN");

      // Koordinaten nur ausgeben, wenn beide Werte vorhanden sind
      let coordsText = "";
      if (lat !== null && lon !== null && typeof lat === "number" && typeof lon === "number") {
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

function getIntervalCode(codeText, intervalCode, lat, lon, detailUrl, app, languageIsGerman) {
  const lang = languageIsGerman ? 'de' : 'en';
  let type = "";

  if (intervalCode) {
    if (intervalMap[intervalCode]) {
      // Sprache auswählen: "de" oder "en"
      if (!intervalExcludeMap[intervalCode]) {
        type = intervalMap[intervalCode][lang];
      }
    } else {
      type = intervalCode + " - " + (languageIsGerman ? "UNBEKANNT" : "UNKNOWN");

      // Koordinaten nur ausgeben, wenn beide Werte vorhanden sind
      let coordsText = "";
      if (lat !== null && lon !== null && typeof lat === "number" && typeof lon === "number") {
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

function clampDays(days) {
  const n = Number(days);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(60, Math.max(1, Math.floor(n)));
}

function buildApiUrl(validFromMs, validUntilMs, selectedAreas) {
  const base = 'https://www.vaarweginformatie.nl/frp/api/messages/nts/summaries';
  const url = new URL(base);
  url.searchParams.set('validFrom', String(validFromMs));
  url.searchParams.set('validUntil', String(validUntilMs));
  url.searchParams.set('ntsTypes', 'FTM');
  url.searchParams.set('limitationGroup', 'BLOCKED');

  // Nur wenn nicht "All areas" ausgewählt wurde
  if (Array.isArray(selectedAreas) && selectedAreas.length > 0) {
    selectedAreas.forEach((id) => url.searchParams.append('ftmAreas', String(id)));
  }

  return url.toString();
}

function formatCommunications(communications, languageIsGerman = true) {
  if (!communications || !Array.isArray(communications)) return "";

  const label = languageIsGerman ? "Kommunikation" : "Communication";

  const parts = communications.map(item => {
    const code = communicationCodes[item.communicationCode];
    const labelCode = code ? (languageIsGerman ? code.de : code.en) : item.communicationCode;
    return `${labelCode} ${item.numberAddress}`;
  });
  if (parts.length === 0) {
    return ""; // wenn keine Teile vorhanden sind → leerer String
  }
  return `${label}: ${parts.join(", ")}`;
}

function findMatches(obj, app, detailUrl) {
  for (const [key, value] of Object.entries(obj)) {
    // Key enthält "interval"
    if (key.toLowerCase().includes("interval")) {
      app.debug(`Gefunden: key="${key}" in ${detailUrl}`);
    }

    // Wert ist "DAY" oder "CON"
    if (value === "DAY" || value === "CON") {
      app.debug(`Gefunden: key="${key}", value="${value}" in ${detailUrl}`);
    }

    // Wenn der Wert selbst ein Objekt ist → rekursiv weiter suchen
    if (value && typeof value === "object") {
      findMatches(value, app, detailUrl);
    }
  }
}

function createBlockages(target, details, validUntilMs, detailUrl, app, languageIsGerman, isRoute = false) {
  const lat = isRoute ? null : target.lat;
  const lon = isRoute ? null : target.lon;
  const bericht = `${details.ntsNumber.year}-${details.ntsNumber.number}`;
  const allLimitations = [];

  if (details && Array.isArray(details.subjectLimitations)) {
    details.subjectLimitations.forEach((subject, idx) => {
      let coordsMatch = false;

      if (isRoute) {
        // Route: Prüfe ob alle Koordinaten übereinstimmen
        if (Array.isArray(subject.limitations) && 
            subject.geoObject?.coordinates &&
            target.coordinates.length === subject.geoObject.coordinates.length) {
          
          coordsMatch = target.coordinates.every((coord, idx) => {
            const apiCoord = subject.geoObject.coordinates[idx];
            return apiCoord && 
                   Math.abs(coord[0] - apiCoord.lon) < 0.00001 && 
                   Math.abs(coord[1] - apiCoord.lat) < 0.00001;
          });
        }
      } else {
        // Punkt: Prüfe ob ein Punkt übereinstimmt
        coordsMatch = Array.isArray(subject.limitations) &&
                      subject.geoObject?.coordinates?.[0]?.lat === lat &&
                      subject.geoObject?.coordinates?.[0]?.lon === lon;
      }

      if (coordsMatch && Array.isArray(subject.limitations)) {
        subject.limitations.forEach(lim => {
          if (Array.isArray(lim.limitationPeriods)) {
            lim.limitationPeriods.forEach((period) => {
              const startDate = (period.startDate ?? 0)+ (period.startTimeMs ?? 0);
              const endDate = (period.endDate ?? 0) + (period.endTimeMs ?? 0);
              isRelevant = (endDate === 0 || endDate>= Date.now() || ((period.endDate ?? 0)===0 && (period.endTimeMs ?? 0)!=0))
              if (isRelevant) {
                const pushPeriod = {
                  startDate: period.startDate
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
                  subject
                });
              }
            });
          }
        });
      }
    });
  }

  allLimitations.forEach(record => {
    if (!target.berichte[bericht]) {
      const newBericht = {};
      newBericht.bericht = bericht.replace(',', '-');
      if (details.reasonCode) {
        newBericht.reasonCode = getReaseonCode( details.reasonCode, lat, lon, detailUrl, app, languageIsGerman);
      }
      if (record.lim.limitationCode) {
        newBericht.status = record.lim.limitationCode;
      }
      newBericht.subjectCode = details.subjectCode;
      newBericht.detailUrl = detailUrl;
      newBericht.communication = formatCommunications(details.communications, languageIsGerman);
      newBericht.contents= details.contents;
      newBericht.blockages = [];
      target.berichte[bericht] = newBericht;
    }
    if (isRoute && details.contents){
        target.contents= details.contents;
    }
    const blockage = {
      startDate: record.period.startDate
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

function formatReferenceCode(referenceCode, lat, lon, detailUrl, app, languageIsGerman) {
  if (!referenceCode) return '';
  const entry = referenceSystems[referenceCode];
  if (entry) {
    return languageIsGerman ? entry.de : entry.en;
  } else {
    const fallback = languageIsGerman ? "UNBEKANNT" : "UNKNOWN";
    if (languageIsGerman) {
      app.debug(
        `Unbekannter referenceCode: ${referenceCode}, Koordinaten: ${lat?.toFixed?.(5) || 'n/a'}, ${lon?.toFixed?.(5) || 'n/a'} URL: ${detailUrl}`
      );
    } else {
      app.debug(
        `Unknown referenceCode: ${referenceCode}, Coordinates: ${lat?.toFixed?.(5) || 'n/a'}, ${lon?.toFixed?.(5) || 'n/a'} URL: ${detailUrl}`
      );
    }
    return referenceCode + " - " + fallback;
  }
}


function formatIndicationCode(indicationCode, lat, lon, detailUrl, app, languageIsGerman) {
  if (!indicationCode) return '';
  const entry = indicationCodes[indicationCode];
  if (entry) {
    return languageIsGerman ? entry.de : entry.en;
  } else {
    const fallback = languageIsGerman ? "UNBEKANNT" : "UNKNOWN";

    // Koordinaten nur ausgeben, wenn beide Werte vorhanden und numerisch sind
    let coordsText = "";
    if (lat !== null && lon !== null && typeof lat === "number" && typeof lon === "number") {
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

function formatDate(ms, hasTime, languageIsGerman, toTime = false) {
  if (!ms) return "";

  // Locale abhängig vom Parameter
  const locale = !languageIsGerman ? "en-GB" : "de-DE";
  if (!hasTime){
    if (!toTime){
      return new Date(ms).toLocaleString("de-DE", {weekday: "long",day: "2-digit",month: "2-digit",year: "2-digit"}).replace(',','');
    }else{
      return new Date(ms).toLocaleString(locale,{hour: '2-digit', minute: '2-digit'})
    }
  }
  const ts = ms < 1e12 ? ms * 1000 : ms;
  const date = new Date(ts);
  const offsetHours = 1
  const localDate = new Date(date.getTime() + offsetHours * 3600 * 1000);
  if (toTime === true) {
    const hh = String(localDate.getHours()).padStart(2, "0");
    const mm = String(localDate.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
  const weekdayOpts = { weekday: "long" };
  const dateOpts    = { day: "2-digit", month: "2-digit", year: "numeric" };
  return `${localDate.toLocaleDateString(locale, weekdayOpts)} ${localDate.toLocaleDateString(locale, dateOpts)}`;
}

function formatDescription(locationGroup, app, languageIsGerman) {
  const lat = locationGroup.lat ?? null;
  const lon = locationGroup.lon ?? null;
  const berichtValues = Object.values(locationGroup.berichte);

  // Prüfen, ob Start- und Enddatum derselbe lokale Tag sind
  const isSameLocalDay = (aMs, aHasTime, bMs, bHasTime,languageIsGerman) => {
    if (!aMs || !bMs) return false;
    return formatDate(aMs,aHasTime,languageIsGerman) === formatDate(bMs,bHasTime,languageIsGerman);
  };


  const texts = berichtValues.map((berichtGroup, bIndex) => {
    let berichtHeader = `${berichtGroup.bericht}${berichtGroup.reasonCode ? ' - ' + berichtGroup.reasonCode : ''}: `.trim();
    let limitationCode=""
    const blockagesText = berichtGroup.blockages.map((blockage) => {
      let limitationText=""
      if (blockage.limitationCode && blockage.limitationCode!=limitationCode){
        let type = getLimitationCode(blockage.limitationCode, lat, lon, berichtGroup.detailUrl, app, languageIsGerman);
        if (type && type !== "") {
          limitationText= ` -- ${type}: -- `;
        }
        limitationCode=blockage.limitationCode;      
      }
      const startDateLocal = (blockage.startDate ?? 0) + (blockage.startTimeMs ?? 0);
      const endDateLocal   = (blockage.endDate ?? 0)   + (blockage.endTimeMs ?? 0);
      const hasEndDate   = blockage.endDate !== undefined;
      const hasStartTime = blockage.startTimeMs !== undefined;
      const hasEndTime   = blockage.endTimeMs   !== undefined;
      

      const dateStr    = startDateLocal!=0 ? formatDate(startDateLocal,hasStartTime,languageIsGerman) : "";
      const endDateStr = endDateLocal!=0   ? formatDate(endDateLocal+(!hasEndDate?blockage.startDate:0),hasEndTime,languageIsGerman) : "";

      const startTime = hasStartTime ? formatDate(startDateLocal,hasStartTime,languageIsGerman,true) : "";
      const endTime   = hasEndTime   ? formatDate(endDateLocal+(!hasEndDate?blockage.startDate:0),hasEndTime,languageIsGerman,true)   : "";

      let tgText = "";
      if (Array.isArray(blockage.targetGroups) && blockage.targetGroups.length > 0) {
        tgText = formatTargetGroup(blockage.targetGroups[0], lat, lon, berichtGroup.detailUrl, app, languageIsGerman);
      }

      const indication = formatIndicationCode(blockage.indicationCode, lat, lon, berichtGroup.detailUrl, app, languageIsGerman);
      let value = blockage.value !== undefined ? String(blockage.value) : "";
      let unitText = "";
      if (blockage.unit) {
        const valNum = blockage.value ?? 0;
        if (blockage.unit === "H") {
          unitText = languageIsGerman ? (valNum === 1 ? "Stunde" : "Stunden") : (valNum === 1 ? "hour" : "hours");
        } else if (blockage.unit === "M") {
          unitText = languageIsGerman ? (valNum === 1 ? "Minute" : "Minuten") : (valNum === 1 ? "minute" : "minutes");
        } else if (blockage.unit === "D") {
          unitText = languageIsGerman ? (valNum === 1 ? "Tag" : "Tage") : (valNum === 1 ? "day" : "days");
        } else {
          unitText = blockage.unit.toLowerCase();
        }
      }

      const refText = formatReferenceCode(blockage.referenceCode, lat, lon, berichtGroup.detailUrl, app, languageIsGerman);
      const extraParts = [];
      if (indication) extraParts.push(indication);
      if (value) extraParts.push(value);
      if (unitText) extraParts.push(unitText);
      if (refText) extraParts.push(refText);

      const extra = extraParts.length ? ` (${extraParts.join(" ")})` : "";

      const interval = getIntervalCode('interval', blockage.interval, lat, lon, blockage.detailUrl, app, languageIsGerman);
      const sameDay = isSameLocalDay(startDateLocal,hasStartTime, endDateLocal,hasEndTime);

      let text = "";
      const intervalPrefix = (interval && !interval.includes("#")) ? " "+interval : "";

      if (!hasEndDate) {
        text = `${tgText ? " " + tgText : ""} ab ${dateStr}`
             + intervalPrefix
             + (hasStartTime && startTime ? " " + startTime : "")
             + (hasEndTime && endTime ? "-" + endTime : "")
             + extra;
      } else if (sameDay) {
        text = `${tgText ? " " + tgText : ""} ${dateStr}`
             + intervalPrefix
             + (hasStartTime && startTime ? " " + startTime : "")
             + (hasEndTime && endTime ? "-" + endTime : "")
             + extra;
      } else {
        if (interval !== "") {
          const dateRange = `${dateStr} – ${endDateStr}`;
          let timeRange = "";
          if (hasStartTime && startTime) {
            timeRange += ` ${startTime}`;
          }
          if (hasEndTime && endTime) {
            timeRange += (timeRange ? "-" : " ") + endTime;
          }
          text = `${tgText ? " " + tgText : ""} ${dateRange}${intervalPrefix}${timeRange}${extra}`;
        } else {
          text = `${tgText ? " " + tgText : ""} ${dateStr}`
               + intervalPrefix
               + (hasStartTime && startTime ? " " + startTime : "")
               + ` - ${endDateStr}`
               + (hasEndTime && endTime ? " " + endTime : "")
               + extra;
        }
      }
      return `${limitationText}${text.trim()}`;
    }).join(", ");

    let result = berichtHeader + blockagesText;
    if (bIndex < berichtValues.length - 1) {
      result += " #";
    }
    return result;
  });

  return texts.join(" ");
}

function transformDetailUrl(original) {
  const apiPrefix = "https://vaarweginformatie.nl/frp/api/messages/";
  const mainPrefix = "https://vaarweginformatie.nl/frp/main/#/nts/";

  if (!original.startsWith(apiPrefix)) return original;

  const rest = original.slice(apiPrefix.length);
  const firstSlash = rest.indexOf("/");
  if (firstSlash === -1) return original;

  const partToUpper = rest.slice(0, firstSlash).toUpperCase();
  const remainder   = rest.slice(firstSlash);

  return mainPrefix + partToUpper + remainder;
}

// Generiere GPX für Routes
function generateRoutesGPX(routes, colorHex, languageIsGerman) {
  let gpx = `<?xml version="1.0"?>\n<gpx version="1.1" creator="OpenCPN" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/GpxExtensionsv3.xsd http://www8.garmin.com/xmlschemas/GpxExtensionsv3.xsd" xmlns:opencpn="http://www.opencpn.org">\n`;

  routes.forEach(route => {
    const ersterBlockage = Object.values(route.berichte)[0].blockages[0];
    const totalBlockages = Object.values(route.berichte).reduce((sum, bericht) => sum + bericht.blockages.length, 0)
    const start = (ersterBlockage.startDate ?? 0)+(ersterBlockage.startTimeMs ?? 0);
    const end = (ersterBlockage.endDate ?? 0)+(ersterBlockage.endTimeMs ?? 0);
    let startText=totalBlockages>1?languageIsGerman?'nächste ':'next ':'';
    startText+=languageIsGerman?'ab: ':'from: '
    startText+=formatDate(start,(ersterBlockage.startTimeMs ?? 0)!=0,languageIsGerman,false)
    startText+=(ersterBlockage.startTimeMs ?? 0)!=0?' '+formatDate(start,(ersterBlockage.startTimeMs ?? 0)!=0,languageIsGerman,true):''
    let endText='';
    if (end===0){
      endText=languageIsGerman?'bis auf weiteres':'until further notice';
    }else{
      endText+=totalBlockages>1?languageIsGerman?'nächste ':'next ':'';
      endText+=languageIsGerman?'bis: ':'until: ';
      endText+=formatDate(end,(ersterBlockage.startTimeMs ?? 0)!=0,languageIsGerman,false)
      endText+=(ersterBlockage.endTimeMs ?? 0)!=0?' '+formatDate(end,(ersterBlockage.endTimeMs ?? 0)!=0,languageIsGerman,true):''
    }
    endText=escapeXml(endText);
    startText=escapeXml(startText);
    const startISO = formatDateISO(start+3600000);

    gpx += `  <rte>\n    <name>${escapeXml(route.name)}</name>\n    `;
    let links='';
    Object.values(route.berichte).forEach((bericht) => {
      links+=`<link href="${escapeXml(transformDetailUrl(bericht.detailUrl))}">\n      <text>${languageIsGerman?'Details siehe Bericht Nr. ':'details see report no. '}${escapeXml(bericht.bericht)}</text>\n    </link>\n    `
    });
    gpx += links;
    gpx += `<desc>${route.description}</desc>\n    `
    gpx += `<extensions>\n      <opencpn:start>${startText}</opencpn:start>\n      <opencpn:end>${endText}</opencpn:end>\n      <opencpn:planned_departure>${startISO}</opencpn:planned_departure>\n      <opencpn:time_display>GLOBAL SETTING</opencpn:time_display>\n      <opencpn:style style="100" />\n      <gpxx:RouteExtension>\n        <gpxx:IsAutoNamed>false</gpxx:IsAutoNamed>\n        <gpxx:DisplayColor>Red</gpxx:DisplayColor>\n      </gpxx:RouteExtension>\n    </extensions>\n`;

    // Waypoints der Route
    route.coordinates.forEach((coord, index) => {
      const [lon, lat] = coord;
      const isFirstOrLast = index === 0 || index === route.coordinates.length - 1;
      const sym = isFirstOrLast ? '1st-Active-Waypoint' : 'Symbol-Diamond-Red';
      gpx += `    <rtept lat="${lat}" lon="${lon}">\n      <time>${startISO}</time>\n      `
      gpx += `<name>${route.name}-${index + 1}</name>\n      `
      gpx += `<desc>${route.description}</desc>\n    `
      gpx += links;
      gpx += `<sym>${sym}</sym>\n      <type>WPT</type>\n      <extensions>\n        <opencpn:waypoint_range_rings visible="false" number="0" step="1" units="0" colour="${colorHex}" />\n        <opencpn:scale_min_max UseScale="false" ScaleMin="2147483646" ScaleMax="0" />\n      </extensions>\n    </rtept>\n`;
    });

    gpx += `  </rte>\n`;
  });

  gpx += `</gpx>`;
  return gpx;
}

// Generiere GPX für Waypoints
function generateWaypointsGPX(points, languageIsGerman) {
  const now = new Date().toISOString();
  const title = languageIsGerman ? 'Sperrungen' : 'Closures';
  const description = languageIsGerman
    ? 'Sperrungen von Objekten (Schleusen, Brücken,...)'
    : 'Closures of objects (locks, bridges,...)';

  let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:opencpn="http://www.opencpn.org" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd" version="1.1" creator="vwi_waypoints_generator.py -- https://github.com/marcelrv/OpenCPN-Waypoints">\n  <metadata>\n    <name>${title}</name>\n    <desc>${description}</desc>\n    <time>${now}</time>\n  </metadata>\n`;

  points.forEach(point => {
    // point.geometry.coordinates is expected as [lon, lat]
    const coords = point.geometry && point.geometry.coordinates;
    const [lon, lat] = Array.isArray(coords) ? coords : [undefined, undefined];
    const name = escapeXml(point.properties && point.properties.name);
    const desc = escapeXml(point.properties && point.properties.description);

    gpx += `  <wpt lat="${lat}" lon="${lon}">\n    <name>${name}</name>\n    `
    Object.values(point.properties.berichte).forEach((bericht) => {
        gpx+=`<link href="${escapeXml(transformDetailUrl(bericht.detailUrl))}">\n      <text>${languageIsGerman?'Details siehe Bericht Nr. ':'details see report no. '}${escapeXml(bericht.bericht)}</text>\n    </link>\n    `
    });
    gpx += `<desc>${desc}</desc>\n    <sym>Symbol-X-Large-Red</sym>\n    <extensions>\n      <opencpn:scale_min_max UseScale="True" ScaleMin="160000" ScaleMax="0"></opencpn:scale_min_max>\n    </extensions>\n  </wpt>\n`;
  });

  gpx += `</gpx>`;
  return gpx;
}

module.exports = {
  buildApiUrl,
  calculateDistance,
  calculateRouteDistance,
  clampDays,
  createBlockages,
  formatDescription,
  generateRoutesGPX,
  generateWaypointsGPX,
  movePointEast
};
