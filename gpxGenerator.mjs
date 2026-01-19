import { escapeXml, formatDateISO, formatDate, transformDetailUrl } from "./formatting.mjs";

// Generiere GPX für Routes
function generateRoutesGPX(routes, colorHex, languageIsGerman) {
    let gpx = `<?xml version="1.0"?>\n<gpx version="1.1" creator="OpenCPN" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/GpxExtensionsv3.xsd http://www8.garmin.com/xmlschemas/GpxExtensionsv3.xsd" xmlns:opencpn="http://www.opencpn.org">\n`;

    routes.forEach((route) => {
        const berichte = Object.values(route.berichte || {});
        if (
            berichte.length === 0 ||
            !berichte[0].blockages ||
            berichte[0].blockages.length === 0
        ) {
            return; // Route ohne Blockages → kein GPX-Eintrag
        }
        const ersterBlockage = berichte[0].blockages[0];
        const totalBlockages = berichte.reduce(
            (sum, bericht) => sum + (bericht.blockages?.length || 0),
            0
        );
        const start =
            (ersterBlockage.startDate ?? 0) + (ersterBlockage.startTimeMs ?? 0);
        const end = (ersterBlockage.endDate ?? 0) + (ersterBlockage.endTimeMs ?? 0);
        let startText =
            totalBlockages > 1 ? (languageIsGerman ? "nächste " : "next ") : "";
        startText += languageIsGerman ? "ab: " : "from: ";
        startText += formatDate(
            start,
            (ersterBlockage.startTimeMs ?? 0) != 0,
            languageIsGerman,
            false
        );
        startText +=
            (ersterBlockage.startTimeMs ?? 0) != 0
                ? " " +
                  formatDate(
                        start,
                        (ersterBlockage.startTimeMs ?? 0) != 0,
                        languageIsGerman,
                        true
                  )
                : "";
        let endText = "";
        if (end === 0) {
            endText = languageIsGerman ? "bis auf weiteres" : "until further notice";
        } else {
            endText +=
                totalBlockages > 1 ? (languageIsGerman ? "nächste " : "next ") : "";
            endText += languageIsGerman ? "bis: " : "until: ";
            endText += formatDate(
                end,
                (ersterBlockage.startTimeMs ?? 0) != 0,
                languageIsGerman,
                false
            );
            endText +=
                (ersterBlockage.endTimeMs ?? 0) != 0
                    ? " " +
                      formatDate(
                            end,
                            (ersterBlockage.endTimeMs ?? 0) != 0,
                            languageIsGerman,
                            true
                      )
                    : "";
        }
        endText = escapeXml(endText);
        startText = escapeXml(startText);
        const startISO = formatDateISO(start + 3600000);

        gpx += `  <rte>\n    <name>${escapeXml(route.name)}</name>\n    `;
        let links = "";
        Object.values(route.berichte).forEach((bericht) => {
            links += `<link href="${escapeXml(
                transformDetailUrl(bericht.detailUrl)
            )}">\n      <text>${
                languageIsGerman
                    ? "Details siehe Bericht Nr. "
                    : "details see report no. "
            }${escapeXml(bericht.bericht)}</text>\n    </link>\n    `;
        });
        gpx += links;
        gpx += `<desc>${route.description}</desc>\n    `;
        gpx += `<extensions>\n      <opencpn:start>${startText}</opencpn:start>\n      <opencpn:end>${endText}</opencpn:end>\n      <opencpn:planned_departure>${startISO}</opencpn:planned_departure>\n      <opencpn:time_display>GLOBAL SETTING</opencpn:time_display>\n      <opencpn:style style="100" />\n      <gpxx:RouteExtension>\n        <gpxx:IsAutoNamed>false</gpxx:IsAutoNamed>\n        <gpxx:DisplayColor>Red</gpxx:DisplayColor>\n      </gpxx:RouteExtension>\n    </extensions>\n`;

        // Waypoints der Route
        route.coordinates.forEach((coord, index) => {
            const [lon, lat] = coord;
            const isFirstOrLast =
                index === 0 || index === route.coordinates.length - 1;
            const sym = isFirstOrLast ? "1st-Active-Waypoint" : "Symbol-Diamond-Red";
            gpx += `    <rtept lat="${lat}" lon="${lon}">\n      <time>${startISO}</time>\n      `;
            gpx += `<name>${route.name}-${index + 1}</name>\n      `;
            gpx += `<desc>${route.description}</desc>\n    `;
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
    const title = languageIsGerman ? "Sperrungen" : "Closures";
    const description = languageIsGerman
        ? "Sperrungen von Objekten (Schleusen, Brücken,...)"
        : "Closures of objects (locks, bridges,...)";

    let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:opencpn="http://www.opencpn.org" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd" version="1.1" creator="vwi_waypoints_generator.py -- https://github.com/marcelrv/OpenCPN-Waypoints">\n  <metadata>\n    <name>${title}</name>\n    <desc>${description}</desc>\n    <time>${now}</time>\n  </metadata>\n`;

    points.forEach((point) => {
        // point.geometry.coordinates is expected as [lon, lat]
        const coords = point.geometry && point.geometry.coordinates;
        const [lon, lat] = Array.isArray(coords) ? coords : [undefined, undefined];
        const name = escapeXml(point.properties && point.properties.name);
        const desc = escapeXml(point.properties && point.properties.description);

        gpx += `  <wpt lat="${lat}" lon="${lon}">\n    <name>${name}</name>\n    `;
        Object.values(point.properties.berichte).forEach((bericht) => {
            gpx += `<link href="${escapeXml(
                transformDetailUrl(bericht.detailUrl)
            )}">\n      <text>${
                languageIsGerman
                    ? "Details siehe Bericht Nr. "
                    : "details see report no. "
            }${escapeXml(bericht.bericht)}</text>\n    </link>\n    `;
        });
        gpx += `<desc>${desc}</desc>\n    <sym>Symbol-X-Large-Red</sym>\n    <extensions>\n      <opencpn:scale_min_max UseScale="True" ScaleMin="160000" ScaleMax="0"></opencpn:scale_min_max>\n    </extensions>\n  </wpt>\n`;
    });

    gpx += `</gpx>`;
    return gpx;
}

export { generateRoutesGPX, generateWaypointsGPX };