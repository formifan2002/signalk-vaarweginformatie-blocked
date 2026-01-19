import {batchPromises } from "./utils.mjs";
import {calculateRouteDistance,movePointEast} from "./geoHelpers.mjs"
import {fetchDetailWithFallback,createBlockages} from "./blockageProcessor.mjs"
import { formatDescription } from "./descriptionFormatter.mjs";
import { translateAllBerichte } from "./translation.mjs";

async function toGeoJSON(
    messages,
    movePointMeters,
    validUntilMs,
    languageIsGerman,
    app,
    plugin,
    pointClosuresCache,
) {
    const locationGroups = {};
    const routes = [];

    // ⭐ Schritt 1: Nachrichten verarbeiten und gruppieren
    for (const msg of messages || []) {
        if (!Array.isArray(msg.location) || msg.location.length === 0) continue;

        const validPoints = msg.location.filter(
            (p) => typeof p.lon === "number" && typeof p.lat === "number"
        );

        if (validPoints.length === 0) continue;

        // ⭐ Wenn mehr als 1 Punkt: Route
        if (validPoints.length > 1) {
            const coordinates = validPoints.map((p) => [p.lon, p.lat]);
            const distance = calculateRouteDistance(coordinates);
            const berichtKey = `${msg.ntsNumber.year}-${msg.ntsNumber.number}`;

            let existingRoute = routes.find(
                (r) =>
                    r.locationName === msg.locationName &&
                    r.coordinates.length === coordinates.length &&
                    r.coordinates.every(
                        (c, i) =>
                            Math.abs(c[0] - coordinates[i][0]) < 0.00001 &&
                            Math.abs(c[1] - coordinates[i][1]) < 0.00001
                    )
            );

            if (!existingRoute) {
                existingRoute = {
                    name:
                        msg.locationName +
                        (msg.fairwayName &&
                        msg.fairwayName !== "" &&
                        !msg.locationName.includes(msg.fairwayName)
                            ? ` (${msg.fairwayName})`
                            : ""),
                    distance: distance,
                    coordinates: coordinates,
                    fairway: msg.fairwayName,
                    startDate: msg.startDate,
                    status: msg.limitationCode,
                    berichte: {},
                };
                if (msg.startTimesMs) {
                    existingRoute.startTimeMs = msg.startTimeMs;
                }
                if (msg.endDate) {
                    existingRoute.endDate = msg.endDate;
                }
                if (msg.endTimesMs) {
                    existingRoute.endTimeMs = msg.endTimeMs;
                }
                if (msg.contents) {
                    existingRoute.contents = msg.contents;
                }
                routes.push(existingRoute);
            }
            if (!existingRoute.berichte[berichtKey]) {
                existingRoute.berichte[berichtKey] = {
                    bericht: berichtKey,
                    organisation: msg.ntsNumber.organisation,
                    ntsType: msg.ntsType,
                    startDate: msg.startDate,
                    endDate: msg.endDate,
                    locationName: msg.locationName,
                    fairway: msg.fairwayName,
                    status: msg.limitationCode,
                    blockages: [],
                    detailUrl: null,
                    serialNumber: msg.ntsNumber.serialNumber,
                };

                if (msg.startTimeMs) {
                    existingRoute.berichte[berichtKey].startTimeMs = msg.startTimeMs;
                }
                if (msg.endTimeMs) {
                    existingRoute.berichte[berichtKey].endTimeMs = msg.endTimeMs;
                }
            }
        } else {
            const firstPoint = validPoints[0];
            const lat = firstPoint.lat;
            const lon = firstPoint.lon;
            const key = `${lat},${lon}`;

            if (!locationGroups[key]) {
                locationGroups[key] = {
                    lat: parseFloat(lat),
                    lon: parseFloat(lon),
                    locationName:
                        msg.locationName ||
                        msg.title ||
                        (languageIsGerman ? "Gesperrte Wasserstraße" : "Blocked waterway"),
                    fairway: msg.fairwayName,
                    berichte: {},
                };
            }
            const berichtKey = `${msg.ntsNumber.year}-${msg.ntsNumber.number}`;
            if (!locationGroups[key].berichte[berichtKey]) {
                locationGroups[key].berichte[berichtKey] = {
                    bericht: berichtKey.replace(",", "-"),
                    organisation: msg.ntsNumber.organisation,
                    ntsType: msg.ntsType,
                    startDate: msg.startDate,
                    endDate: msg.endDate,
                    locationName: msg.locationName,
                    fairway: msg.fairwayName,
                    status: msg.limitationCode,
                    blockages: [],
                    detailUrl: null,
                    serialNumber: msg.ntsNumber.serialNumber,
                };

                if (msg.startTimeMs) {
                    locationGroups[key].berichte[berichtKey].startTimeMs =
                        msg.startTimeMs;
                }
                if (msg.endTimeMs) {
                    locationGroups[key].berichte[berichtKey].endTimeMs = msg.endTimeMs;
                }
            }
        }
    }

    // ⭐ Schritt 2: Detail-Daten für Routen abrufen
    app.debug(`Processing ${routes.length} routes for detail data`);
    const routeFetchPromises = [];

    for (let i = 0; i < routes.length; i++) {
        const route = routes[i];

        if (!route.berichte || Object.keys(route.berichte).length === 0) {
            continue;
        }

        for (const berichtKey in route.berichte) {
            const bericht = route.berichte[berichtKey];

            const fetchPromise = fetchDetailWithFallback(bericht, app)
                .then(async (resp) => {
                    if (!resp || !resp.data) {
                        app.debug(`Kein Detailbericht für ${berichtKey} verfügbar`);
                        return { routeIndex: i, shouldRemove: false }; // ⭐ Return-Wert
                    }

                    const detailUrl = resp.url;
                    bericht.detailUrl = detailUrl;
                    const detailData = resp.data;

                    if (detailData) {
                        try {
                            await createBlockages(
                                route,
                                detailData,
                                validUntilMs,
                                detailUrl,
                                app,
                                languageIsGerman,
                                true
                            );
                        } catch (err) {
                            app.error(
                                `createBlockages failed for ${berichtKey}: ${err.message}`
                            );
                        }
                    }

                    // ⭐ Prüfen ob alle Berichte cancelled sind
                    const allCancelled = Object.values(route.berichte).every(
                        (b) => b.cancelled === true
                    );

                    return { routeIndex: i, shouldRemove: allCancelled }; // ⭐ Return-Wert
                })
                .catch((e) => {
                    app.error(
                        `Unexpected error in fetch promise for ${berichtKey}: ${e.message}`
                    );
                    return { routeIndex: i, shouldRemove: false }; // ⭐ Return-Wert auch bei Error
                });

            routeFetchPromises.push(fetchPromise);
        }
    }

    // ⭐ Alle Route-Fetches in Batches ausführen und Ergebnisse speichern
    app.debug(
        `Fetching ${routeFetchPromises.length} route detail reports in batches of 5...`
    );
    const routeResults = await batchPromises(routeFetchPromises, 5, 100); // ⭐ routeResults speichern
    app.debug(`All route detail reports fetched`);

    // ⭐ Cleanup: Cancelled routes entfernen (von hinten nach vorne!)
    const routesToRemove = new Set(
        routeResults.filter((r) => r && r.shouldRemove).map((r) => r.routeIndex)
    );

    for (let i = routes.length - 1; i >= 0; i--) {
        if (routesToRemove.has(i)) {
            app.debug(`Route ${i + 1} wird entfernt, da alle Berichte CANCEL sind`);
            routes.splice(i, 1);
        }
    }

    app.debug(`Processing completed for ${routes.length} remaining routes`);

    // ⭐ Schritt 3: Detail-Daten für Punkte abrufen
    const groupKeys = Object.keys(locationGroups);
    app.debug(`Processing ${groupKeys.length} object closures for detail data`);
    const fetchPromises = [];

    for (const key of groupKeys) {
        const group = locationGroups[key];

        for (const berichtKey in group.berichte) {
            const bericht = group.berichte[berichtKey];

            const fetchPromise = fetchDetailWithFallback(bericht, app)
                .then(async (resp) => {
                    if (!resp || !resp.data) {
                        app.debug(`Kein Detailbericht für ${berichtKey} verfügbar`);
                        return;
                    }

                    const detailUrl = resp.url;
                    bericht.detailUrl = detailUrl;
                    const detailData = resp.data;

                    if (detailData) {
                        try {
                            await createBlockages(
                                group,
                                detailData,
                                validUntilMs,
                                detailUrl,
                                app,
                                languageIsGerman,
                                false
                            );
                        } catch (err) {
                            app.error(
                                `createBlockages failed for ${berichtKey}: ${err.message}`
                            );
                        }
                    }
                })
                .catch((e) => {
                    app.error(
                        `Unexpected error in fetch promise for ${berichtKey}: ${e.message}`
                    );
                });

            fetchPromises.push(fetchPromise);
        }
    }

    // ⭐ Alle Fetches in Batches ausführen
    app.debug(
        `Fetching ${fetchPromises.length} detail reports in batches of 5...`
    );
    await batchPromises(fetchPromises, 5, 100);
    app.debug(`All detail reports fetched`);

    // ⭐ Cleanup: Cancelled groups entfernen
    for (const key of groupKeys) {
        if (!locationGroups[key]) continue;

        const allCancelled = Object.values(locationGroups[key].berichte).every(
            (b) => b.cancelled === true
        );
        if (allCancelled) {
            delete locationGroups[key];
        }
    }

    // ⭐ Batch-Übersetzung
    app.debug("Starting batch translation...");
    await translateAllBerichte(
        locationGroups,
        routes,
        languageIsGerman,
        app,
        plugin
    );
    app.debug("Batch translation completed");

    // ⭐ Beschreibungen für Routes erzeugen (NACH Übersetzung!)
    for (const route of routes) {
        const description = formatDescription(route, app, languageIsGerman);
        route.description = description;
    }

    // ⭐ Schritt 4: Features aus Punkten erstellen
    const features = [];
    for (const key in locationGroups) {
        const group = locationGroups[key];

        try {
            const description = formatDescription(group, app, languageIsGerman);
            const [shiftedLat, shiftedLon] = movePointEast(
                group.lat,
                group.lon,
                movePointMeters
            );

            const feature = {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [shiftedLon, shiftedLat],
                },
                properties: {
                    name: group.locationName,
                    description: description,
                    fairway: group.fairway,
                    limitationCode: group.status,
                    blockageCount: Object.values(group.berichte).reduce(
                        (sum, bericht) => sum + (bericht?.blockages?.length || 0),
                        0
                    ),
                    berichte: group.berichte,
                    position: `https://www.google.com/maps?q=${group.lat.toFixed(
                        5
                    )},${group.lon.toFixed(5)}`,
                    source: "vaarweginformatie.nl",
                },
            };

            features.push(feature);

            // Notes erstellen
            const id = `${plugin.id}-${group.locationName.replace(/\s+/g, "-")}`;
            pointClosuresCache.set(id, {
                ...group,
                descriptionFormatted: description,
            });
        } catch (e) {
            app.error(`Failed to create feature for ${key}: ${e.message}`);
        }
    }

    app.debug(`Created ${features.length} features and ${routes.length} routes`);
    return { points: features, routes: routes };
}

export { toGeoJSON };