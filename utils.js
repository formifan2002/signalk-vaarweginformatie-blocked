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
  CLEHEI:   { de: "Max. Schiffslänge", en: "clearance height" },
  VESHEI:   { de: "Schiffshöhe über Wasser", en: "vessel air draught" },
  AVALEN:   { de: "Durchfahrtshöhe", en: "available length" },
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

function formatBlockageDescription(blockages, languageIsGerman) {
  return (blockages || []).map(block => {
    const startStr = formatDateTime(block.startDate);
    const endStr = block.endDate ? formatDateTime(block.endDate) : null;

    if (!endStr) {
      return languageIsGerman ? `ab ${startStr}` : `from ${startStr}`;
    }

    const startDay = startStr.split(' ')[0];
    const endDay = endStr.split(' ')[0];
    const startTime = startStr.split(' ')[1];
    const endTime = endStr.split(' ')[1];

    if (startDay === endDay) {
      return languageIsGerman
        ? `von ${startDay} ${startTime} bis ${endTime}`
        : `from ${startDay} ${startTime} to ${endTime}`;
    } else {
      return languageIsGerman
        ? `von ${startStr} bis ${endStr}`
        : `from ${startStr} to ${endStr}`;
    }
  }).join(" | ");
}

function movePointEast(lat, lon, meters) {
  const latRad = lat * Math.PI / 180;
  const metersPerDegree = 111320 * Math.cos(latRad);
  const deltaLon = meters / metersPerDegree;
  return [lat, lon + deltaLon, ];
}

function formatDateTime(dateString) {
  if (!dateString) return 'unbekannt';
  const d = new Date(dateString);
  if (!isFinite(d)) return 'unbekannt';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function formatDateForOpenCPN(dateString, languageIsGerman) {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (!isFinite(d)) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const separator = languageIsGerman ? '.' : '/';
  return `${day}${separator}${month}${separator}${year}`;
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
    if (languageIsGerman) {
      app.debug(
        `Unbekannter targetGroupCode: ${tg.targetGroupCode}, Koordinaten: ${lat?.toFixed?.(5) || 'n/a'}, ${lon?.toFixed?.(5) || 'n/a'} URL: ${detailUrl}`
      );
    } else {
      app.debug(
        `Unknown targetGroupCode: ${tg.targetGroupCode}, Coordinates: ${lat?.toFixed?.(5) || 'n/a'}, ${lon?.toFixed?.(5) || 'n/a'} URL: ${detailUrl}`
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

function getLimitationCode(codeText, limitationCode, lat, lon, detailUrl, app, languageIsGerman) {
  const lang = languageIsGerman ? 'de' : 'en';
  let type = "";

  if (limitationCode) {
    if (limitationLabels[limitationCode]) {
      // Sprache auswählen: "de" oder "en"
      type = limitationLabels[limitationCode][lang];
    } else {
      type = limitationCode + " - " + (languageIsGerman ? "UNBEKANNT" : "UNKNOWN");

      if (languageIsGerman) {
        app.debug(
          `Unbekannter ${codeText}: ${limitationCode}, Koordinaten: ${lat?.toFixed?.(5) || 'n/a'}, ${lon?.toFixed?.(5) || 'n/a'} URL: ${detailUrl}`
        );
      } else {
        app.debug(
          `Unknown ${codeText}: ${limitationCode}, Coordinates: ${lat?.toFixed?.(5) || 'n/a'}, ${lon?.toFixed?.(5) || 'n/a'} URL: ${detailUrl}`
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

function createGroupBlockages(locationGroup,details, validUntilMs, detailUrl,app,languageIsGerman) {
 const lat=locationGroup.lat;
 const lon=locationGroup.lon;
 const bericht=`${details.ntsNumber.year},${details.ntsNumber.number}`;
 const allLimitations = [];
  if (details && Array.isArray(details.subjectLimitations)) {
    details.subjectLimitations.forEach(subject => {
      if (Array.isArray(subject.limitations) && subject.geoObject.coordinates[0].lat === lat && subject.geoObject.coordinates[0].lon === lon) {
        subject.limitations.forEach(lim => {
          if (Array.isArray(lim.limitationPeriods)) {
            lim.limitationPeriods.forEach(period => {
              const startDate = period.startDate ?? 0;
              const startTime = period.startTimeMs ?? 0;
              const startTs   = startDate + startTime;

              const endDate = period.endDate ?? 0;
              const endTime = period.endTimeMs ?? 0;
              const endTs   = endDate + endTime;

              // "now" = 0:00 Uhr des heutigen Tages
              const nowDate = new Date();
              nowDate.setHours(0, 0, 0, 0);
              const nowMs = nowDate.getTime();

              // Bedingungen:
              const startValid = startTs >= nowMs && startTs <= validUntilMs;
              const endValid   = endTs   >= nowMs && endTs   <= validUntilMs;

              // Intervall-Überschneidung: [startTs, endTs] schneidet [nowMs, validUntilMs]
              const overlaps   = startTs <= validUntilMs && endTs >= nowMs;

              if (startValid || endValid || overlaps) {
                allLimitations.push({ lim, period, subject });
              }
            });
          }
        });
      }
    });
  }
  // Sortierung nach startDate + startTimeMs
  allLimitations.sort((a, b) => {
    const aKey = (a.period.startDate || 0) + (a.period.startTimeMs || 0);
    const bKey = (b.period.startDate || 0) + (b.period.startTimeMs || 0);
    return aKey - bKey;
  });

  allLimitations.forEach(record => {
      if (!locationGroup.berichte[bericht]) {
        locationGroup.berichte[bericht] = {
          bericht: bericht.replace(',', '-'),
          reasonCode: getLimitationCode('reasonCode', details.reasonCode, lat, lon, detailUrl, app,languageIsGerman),
          subjectCode: details.subjectCode,
          detailUrl: detailUrl,
          communication: formatCommunications(details.communications, languageIsGerman),
          blockages: []
        };
      }
      locationGroup.berichte[bericht].blockages.push({
          startDate: record.period.startDate,
          startTimeMs: record.period.startTimeMs,
          endDate: record.period.endDate,
          endTimeMs: record.period.endTimeMs,
          status: record.lim.limitationCode,
          targetGroups: record.lim.targetGroups,
          indicationCode: record.lim.indicationCode,
          unit: record.lim.unit,
          value: record.lim.value,
          referenceCode: record.lim.referenceCode
    });
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
    if (languageIsGerman) {
      app.debug(
        `Unbekannter indicationCode: ${indicationCode}, Koordinaten: ${lat?.toFixed?.(5) || 'n/a'}, ${lon?.toFixed?.(5) || 'n/a'} URL: ${detailUrl}`
      );
    } else {
      app.debug(
        `Unknown indicationCode: ${indicationCode}, Coordinates: ${lat?.toFixed?.(5) || 'n/a'}, ${lon?.toFixed?.(5) || 'n/a'} URL: ${detailUrl}`
      );
    }
    return indicationCode + " - " + fallback;
  }
}

function formatDescription(locationGroup, app, languageIsGerman) {
  const lat = locationGroup.lat;
  const lon = locationGroup.lon;
  const berichtValues = Object.values(locationGroup.berichte);

  const texts = berichtValues.map((berichtGroup, bIndex) => {
    let berichtHeader = `${berichtGroup.bericht} - ${berichtGroup.reasonCode}: `;

    const blockagesText = berichtGroup.blockages.map((blockage) => {
      const startDateObj = blockage.startDate ? new Date(blockage.startDate) : null;
      const endDateObj   = blockage.endDate   ? new Date(blockage.endDate)   : null;
      const locale = languageIsGerman ? "de-DE" : "en-US";

      // Wochentag und Datum getrennt formatieren
      const weekdayOpts = { weekday: "long" };
      const dateOpts    = { day: "2-digit", month: "2-digit", year: "2-digit" };

      const dateStr = startDateObj && isFinite(startDateObj)
        ? `${startDateObj.toLocaleDateString(locale, weekdayOpts)} ${startDateObj.toLocaleDateString(locale, dateOpts)}`
        : '';

      const endDateStr = endDateObj && isFinite(endDateObj)
        ? `${endDateObj.toLocaleDateString(locale, weekdayOpts)} ${endDateObj.toLocaleDateString(locale, dateOpts)}`
        : '';

      const msToTime = ms => {
        if (ms === undefined || ms === null) return '';
        const d = new Date(ms);
        if (!isFinite(d)) return '';
        return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
      };

      const startTime = msToTime(blockage.startTimeMs);
      const endTime   = blockage.endTimeMs !== undefined ? msToTime(blockage.endTimeMs) : "";

      let type = getLimitationCode('limitationCode', blockage.status, lat, lon, blockage.detailUrl, app, languageIsGerman);

      let tgText = "";
      if (Array.isArray(blockage.targetGroups) && blockage.targetGroups.length > 0) {
        tgText = formatTargetGroup(blockage.targetGroups[0], lat, lon, blockage.detailUrl, app, languageIsGerman);
      }

      const indication = formatIndicationCode(blockage.indicationCode, lat, lon, blockage.detailUrl, app, languageIsGerman);
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
        }
      }

      const refText = formatReferenceCode(blockage.referenceCode, lat, lon, blockage.detailUrl, app, languageIsGerman);
      const extraParts = [];
      if (indication) extraParts.push(indication);
      if (value) extraParts.push(value);
      if (unitText) extraParts.push(unitText);
      if (refText) extraParts.push(refText);

      const extra = extraParts.length ? ` (${extraParts.join(" ")})` : "";

      const hasEndDate = endDateObj !== null;
      const sameDay =
        startDateObj && endDateObj &&
        startDateObj.getDate() === endDateObj.getDate() &&
        startDateObj.getMonth() === endDateObj.getMonth() &&
        startDateObj.getFullYear() === endDateObj.getFullYear();

      let text = "";
      if (!hasEndDate) {
        text = `${type}${tgText ? " " + tgText : ""} ab ${dateStr}${startTime ? " " + startTime : ""}${endTime ? "-" + endTime : ""}${extra}`;
      } else if (sameDay) {
        text = `${type}${tgText ? " " + tgText : ""} ${dateStr}${startTime ? " " + startTime : ""}${endTime ? "-" + endTime : ""}${extra}`;
      } else {
        // mehrere Tage: Datumsspanne + Zeitspanne am Ende
        const dateRange = `${dateStr} – ${endDateStr}`;
        let timeRange = "";
        if (startTime || endTime) {
          timeRange = ` ${startTime}${endTime ? "-" + endTime : ""}`;
        }
        text = `${type}${tgText ? " " + tgText : ""} ${dateRange}${timeRange}${extra}`;
      }

      return text.trim();
    }).join(", ");

    let result = berichtHeader + blockagesText;
    if (bIndex < berichtValues.length - 1) {
      result += " #";
    }
    return result;
  });

  return texts.join(" ");
}


// Generiere GPX für Routes
function generateRoutesGPX(routes, colorHex, languageIsGerman) {
  let gpx = `<?xml version="1.0"?>\n<gpx version="1.1" creator="OpenCPN" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/GpxExtensionsv3.xsd http://www8.garmin.com/xmlschemas/GpxExtensionsv3.xsd" xmlns:opencpn="http://www.opencpn.org">\n`;

  routes.forEach(route => {
    const startDateFormatted = formatDateForOpenCPN(route.startDate, languageIsGerman);
    const endDateFormatted = route.endDate ? formatDateForOpenCPN(route.endDate, languageIsGerman) : '';
    const startISO = formatDateISO(route.startDate);

    // Bestimme "bis" oder "to" Text
    let endText = '';
    if (route.endDate) {
      endText = languageIsGerman ? `bis ${endDateFormatted}` : `to ${endDateFormatted}`;
    }

    gpx += `  <rte>\n    <name>${escapeXml(route.name)}</name>\n    <extensions>\n      <opencpn:start>${startDateFormatted}</opencpn:start>\n      <opencpn:end>${endText}</opencpn:end>\n      <opencpn:planned_departure>${startISO}</opencpn:planned_departure>\n      <opencpn:time_display>GLOBAL SETTING</opencpn:time_display>\n      <opencpn:style style="100" />\n      <gpxx:RouteExtension>\n        <gpxx:IsAutoNamed>false</gpxx:IsAutoNamed>\n        <gpxx:DisplayColor>Red</gpxx:DisplayColor>\n      </gpxx:RouteExtension>\n    </extensions>\n`;

    // Waypoints der Route
    route.coordinates.forEach((coord, index) => {
      const [lon, lat] = coord;
      const isFirstOrLast = index === 0 || index === route.coordinates.length - 1;
      const sym = isFirstOrLast ? '1st-Active-Waypoint' : 'Symbol-Diamond-Red';

      gpx += `    <rtept lat="${lat}" lon="${lon}">\n      <time>${startISO}</time>\n      <name>${index + 1}</name>\n      <sym>${sym}</sym>\n      <type>WPT</type>\n      <extensions>\n        <opencpn:waypoint_range_rings visible="false" number="0" step="1" units="0" colour="${colorHex}" />\n        <opencpn:scale_min_max UseScale="false" ScaleMin="2147483646" ScaleMax="0" />\n      </extensions>\n    </rtept>\n`;
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

    gpx += `  <wpt lat="${lat}" lon="${lon}">\n    <name>${name}</name>\n    <desc>${desc}</desc>\n    <sym>Symbol-X-Large-Red</sym>\n    <extensions>\n      <opencpn:scale_min_max UseScale="True" ScaleMin="160000" ScaleMax="0"></opencpn:scale_min_max>\n    </extensions>\n  </wpt>\n`;
  });

  gpx += `</gpx>`;
  return gpx;
}

module.exports = {
  buildApiUrl,
  calculateDistance,
  calculateRouteDistance,
  clampDays,
  createGroupBlockages,
  escapeXml,
  formatBlockageDescription,
  formatDateForOpenCPN,
  formatDateISO,
  formatDateTime,
  formatDescription,
  formatDirectionCode,
  formatTargetGroup,
  generateRoutesGPX,
  generateWaypointsGPX,
  getLimitationCode,
  movePointEast
};
