const fs = require('fs');
const axios = require('axios');

const {
  buildApiUrl,
  calculateRouteDistance,
  clampDays,
  createBlockages,
  formatDescription,
  generateRoutesGPX,
  generateWaypointsGPX,
  movePointEast
} = require('./utils');


// Mapping von Namen auf fmtArea IDs
const AREA_MAP = {
  "Algemeen Nederland": 409359,
  "Noordzee": 4577709,
  "Eems": 539759,
  "Waddenzee": 496785,
  "Groningen": 409357,
  "Fryslan": 409362,
  "Drenthe": 409358,
  "Overijssel": 409356,
  "Gelderland": 409353,
  "Ijsselmeer": 409354,
  "Flevoland": 409355,
  "Utrecht": 409366,
  "Noord-Holland": 409361,
  "Zuid-Holland": 409360,
  "Zeeland": 409363,
  "Noord-Brabant": 409364,
  "Limburg": 409365
};


async function toGeoJSON(messages, movePointMeters, validUntilMs, languageIsGerman, app) {
  const locationGroups = {};
  const routes = [];

  // Schritt 1: Nachrichten verarbeiten und gruppieren
  for (const msg of messages || []) {
    if (!Array.isArray(msg.location) || msg.location.length === 0) continue;

    const validPoints = msg.location.filter(p =>
      typeof p.lon === 'number' && typeof p.lat === 'number'
    );

    if (validPoints.length === 0) continue;

    // Wenn mehr als 1 Punkt: Route
    if (validPoints.length > 1) {
      const coordinates = validPoints.map(p => [p.lon, p.lat]);
      const distance = calculateRouteDistance(coordinates);
      const berichtKey = `${msg.ntsNumber.year}-${msg.ntsNumber.number}`;

      let existingRoute = routes.find(r =>
        r.coordinates.length === coordinates.length &&
        r.coordinates.every((c, i) =>
          c[0] === coordinates[i][0] && c[1] === coordinates[i][1]
        )
      );

      if (!existingRoute) {
        existingRoute = {
          name: msg.locationName +
            (msg.fairwayName &&
            msg.fairwayName !== "" &&
            !msg.locationName.includes(msg.fairwayName)
              ? ` (${msg.fairwayName})`
              : ''),
          distance: distance,
          coordinates: coordinates,
          fairway: msg.fairwayName,
          ntsNumber: berichtKey,
          organisation: msg.ntsNumber.organisation,
          startDate: msg.startDate,
          ntsType: msg.ntsType,
          berichte: {}
        };
        if (msg.startTimesMs){
          existingRoute.startTimeMs=msg.startTimeMs;
        }
        if (msg.endDate){
          existingRoute.endDate=msg.endDate;
        }
        if (msg.endTimesMs){
          existingRoute.endTimeMs=msg.endTimeMs
        }
        routes.push(existingRoute);
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
          locationName: msg.locationName || msg.title || (languageIsGerman ? 'Gesperrte Wasserstraße' : 'Blocked waterway'),
          fairway: msg.fairwayName,
          status: msg.limitationCode,
          ntsNumber: `${msg.ntsNumber.year}-${msg.ntsNumber.number}`,
          organisation: msg.ntsNumber.organisation,
          ntsType: msg.ntsType,
          startDate: msg.startDate,
          endDate: msg.endDate,
          berichte: {}
        };
      }
    }
  }

  // Schritt 2: Detail-Daten für Routen abrufen
  app.debug(`Processing ${routes.length} routes for detail data`);

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const detailUrl = `https://vaarweginformatie.nl/frp/api/messages/${String(route.ntsType).toLowerCase()}/${route.organisation}-${route.ntsNumber}`;
    route.detailUrl = detailUrl;
    try {
      const resp = await axios.get(detailUrl, { 
        headers: { Accept: "application/json" },
        timeout: 10000
      });
      
      const detailData = resp && resp.data ? resp.data : null;
      
      if (detailData) {
        createBlockages(route, detailData, validUntilMs, detailUrl, app, languageIsGerman, true); // ✅ true für Routen!
      } else {
        app.debug(`No detail data for route ${i+1}/${routes.length}`);
      }
    } catch (e) {
      app.error(`Detail fetch failed for route ${detailUrl}: ${e.message}`);
    }
  }
    
   // Beschreibungen für Routes erzeugen
  for (const route of routes) {
    const description = formatDescription(route, app, languageIsGerman);
    route.description = description; 
  }

  // Schritt 3: Detail-Daten für Punkte abrufen
  const groupKeys = Object.keys(locationGroups);
  app.debug(`Processing ${groupKeys.length} location groups`);

  for (let i = 0; i < groupKeys.length; i++) {
    const key = groupKeys[i];
    const group = locationGroups[key];
    const detailUrl = `https://vaarweginformatie.nl/frp/api/messages/${String(group.ntsType).toLowerCase()}/${group.organisation}-${group.ntsNumber}`;
    
    try {
      const resp = await axios.get(detailUrl, { 
        headers: { Accept: "application/json" },
        timeout: 10000
      });
      
      const detailData = resp && resp.data ? resp.data : null;
      
      if (detailData) {
        createBlockages(group, detailData, validUntilMs, detailUrl, app, languageIsGerman, false);
      } else {
        app.debug(`No detail data for group ${i+1}/${groupKeys.length}`);
      }
    } catch (e) {
      app.error(`Detail fetch failed for ${detailUrl}: ${e.message}`);
    }
  }

  // Schritt 4: Features aus Punkten erstellen
  const features = [];
  for (const key in locationGroups) {
    const group = locationGroups[key];
    
    try {
      const description = formatDescription(group, app, languageIsGerman);
      const [shiftedLat, shiftedLon] = movePointEast(group.lat, group.lon, movePointMeters);

      const feature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [shiftedLon, shiftedLat]
        },
        properties: {
          name: group.locationName,
          description: description,
          fairway: group.fairway,
          limitationCode: group.status,
          blockageCount: Object.values(group.berichte).reduce((sum, bericht) => sum + (bericht.blockages?.length || 0), 0),
          berichte: group.berichte,
          position: `https://www.google.com/maps?q=${group.lat.toFixed(5)},${group.lon.toFixed(5)}`,
          source: 'vaarweginformatie.nl'
        }
      };

      features.push(feature);
    } catch (e) {
      app.error(`Failed to create feature for ${key}: ${e.message}`);
    }
  }
  
  app.debug(`Created ${features.length} features and ${routes.length} routes`);
  return { points: features, routes: routes };
}

module.exports = function(app) {
  let timer = null;
  let cachedResourceSet = null;
  let cachedRoutes = {};
  let pluginRouteIds = new Set();
  let RESOURCESET_NAME='';
  const RESOURCE_ID = 'blocked-waterways-nl';

  const plugin = {
    id: 'signalk-vaarweginformatie-blocked',
    name: 'Vaarweginformatie BLOCKED (GeoJSON for Freeboard-SK & OpenCPN)',
    description: 'Fetches blocked waterways from vaarweginformatie.nl and provides them via SignalK Resource Provider API.',
    schema: {
      type: 'object',
      properties: {
        language: {
          type: 'boolean',
          title: 'Sprache: Deutsch (Language: German / Taal: Duits)',
          default: true,
          description: 'Wenn deaktiviert: Englisch (If disabled: English / Indien uitgeschakeld: Engels)'
        },
        "All areas": { type: 'boolean', title: 'Alle Gebiete (All areas / Alle gebieden)', default: true },
        "Algemeen Nederland": { type: 'boolean', title: 'Allgemein Niederlande (General Netherlands / Algemeen Nederland)', default: false },
        "Noordzee": { type: 'boolean', title: 'Nordsee (North Sea / Noordzee)', default: false },
        "Eems": { type: 'boolean', title: 'Ems (Ems / Eems)', default: false },
        "Waddenzee": { type: 'boolean', title: 'Wattenmeer (Wadden Sea / Waddenzee)', default: false },
        "Groningen": { type: 'boolean', title: 'Groningen (Groningen / Groningen)', default: false },
        "Fryslan": { type: 'boolean', title: 'Friesland (Friesland / Fryslan)', default: false },
        "Drenthe": { type: 'boolean', title: 'Drenthe (Drenthe / Drenthe)', default: false },
        "Overijssel": { type: 'boolean', title: 'Overijssel (Overijssel / Overijssel)', default: false },
        "Gelderland": { type: 'boolean', title: 'Gelderland (Gelderland / Gelderland)', default: false },
        "Ijsselmeer": { type: 'boolean', title: 'IJsselmeer (IJsselmeer / IJsselmeer)', default: false },
        "Flevoland": { type: 'boolean', title: 'Flevoland (Flevoland / Flevoland)', default: false },
        "Utrecht": { type: 'boolean', title: 'Utrecht (Utrecht / Utrecht)', default: false },
        "Noord-Holland": { type: 'boolean', title: 'Nordholland (North Holland / Noord-Holland)', default: false },
        "Zuid-Holland": { type: 'boolean', title: 'Südholland (South Holland / Zuid-Holland)', default: false },
        "Zeeland": { type: 'boolean', title: 'Zeeland (Zeeland / Zeeland)', default: false },
        "Noord-Brabant": { type: 'boolean', title: 'Nordbrabant (North Brabant / Noord-Brabant)', default: false },
        "Limburg": { type: 'boolean', title: 'Limburg (Limburg / Limburg)', default: false },
        pollIntervalHours: { type: 'number', title: 'Abfrageintervall in Stunden (Polling interval in hours)', default: 24 },
        daysSpan: { type: 'number', title: 'Anzahl Tage (Number of days)', default: 120 },
        openCpnGeoJsonPathRoutes: { type: 'string', title: 'Pfad + Dateiname der GPX Datei mit gesperrten Strecken für OpenCpn (Path + filename of GPX file with closed routes for OpenCPN)' },
        openCpnGeoJsonPathWaypoints: { type: 'string', title: 'Pfad + Dateiname der GPX Datei mit gesperrten Objekten für OpenCpn (Path + filename of GPX file with closed objects for OpenCPN)' },
        movePointMeters: { type: 'number', title: 'Punktverschiebung in Metern (Point offset in meters)', default: 5 },
        pointSize: { type: 'number', title: 'Größe der Punkte (Size of points in map)', default: 10 },
        colorHex: { type: 'string', title: 'Farbe der Punkte (Color of points in map - hex value)', default: '#FF0000' }
      }
    },

    start: function(options) {
      // Speichere Optionen für späteren Zugriff
      plugin.lastOptions = options;
      const languageIsGerman = options.language !== false;
      RESOURCESET_NAME = languageIsGerman ? 'Sperrungen' : 'Closures';

      const selectedIds = options["All areas"] ? [] : Object.keys(AREA_MAP)
        .filter((name) => options[name])
        .map((name) => AREA_MAP[name]);

      const pollHours = Number(options.pollIntervalHours) || 24;
      const days = clampDays(options.daysSpan ?? 7);
      const colorHex = options.colorHex || '#FF0000';
      const pointSize = options.pointSize || 10;
      const movePointMeters = Number(options.movePointMeters) || 5;

      const doFetch = async () => {
        try {
          const now = new Date();
          const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
          const validFromMs = midnight.getTime();
          const validUntilMs = validFromMs + days * 24 * 60 * 60 * 1000;
          const url = buildApiUrl(validFromMs, validUntilMs, selectedIds);
          app.debug(`Fetching data: ${url}`);
          const { data } = await axios.get(url, { headers: { Accept: 'application/json' } });

          const messages = Array.isArray(data)
            ? data
            : Array.isArray(data.messages)
            ? data.messages
            : Array.isArray(data.summaries)
            ? data.summaries
            : [];

          app.debug(`Found ${messages.length} messages in API response`);

          const geoData = await toGeoJSON(messages, movePointMeters, validUntilMs, languageIsGerman, app);

          app.debug(`Messages transformed to ${geoData.points.length} objects and ${geoData.routes.length} routes`);

          for (const routeId of pluginRouteIds) {
            delete cachedRoutes[routeId];
          }
          pluginRouteIds.clear();

          // ResourceSet für Punkte erstellen und cachen
          const resourceDescription = languageIsGerman
            ? 'Gesperrte Objekte (Brücken, Schleusen,..) und Wasserstraßen von vaarweginformatie.nl'
            : 'Blocked objects (bridges, sluices,...) and waterways from vaarweginformatie.nl';

          cachedResourceSet = {
            type: 'ResourceSet',
            name: RESOURCESET_NAME,
            description: resourceDescription,
            styles: {
              default: {
                width: pointSize,
                stroke: colorHex,
                fill: colorHex + '80'
              }
            },
            values: {
              features: geoData.points
            }
          };

          // Routen cachen (für routes Provider)
          geoData.routes.forEach((route, index) => {
            const routeId = `blocked-route-${index}`;
            pluginRouteIds.add(routeId);
            cachedRoutes[routeId] = {
              name: route.name,
              description: route.description,
              distance: route.distance,
              contents: route.contents,
              detailUrl: route.detailUrl,
              startDate: route.startDate,
              startTimeMs: route.startTimeMs,
              endDate: route.endDate,
              endTimeMs: route.endTimeMs,
              feature: {
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: route.coordinates
                },
                properties: {
                  fairway: route.fairway
                }
              }
            };
          });

          app.debug(`ResourceSet updated for ${geoData.points.length} objects and ${geoData.routes.length} routes`);

          // SignalK über Änderungen benachrichtigen (wenn möglich)
          if (typeof app.handleMessage === 'function') {
            app.handleMessage('resources', {
              updates: [{
                source: { label: plugin.id },
                timestamp: new Date().toISOString(),
                values: [{ path: 'resources.update', value: Date.now() }]
              }]
            });
          }

          // Optional: OpenCPN GPX Dateien schreiben
          if (options.openCpnGeoJsonPathRoutes && geoData.routes.length > 0) {
            const routesGPX = generateRoutesGPX(geoData.routes, colorHex, languageIsGerman);
            fs.writeFileSync(options.openCpnGeoJsonPathRoutes, routesGPX, 'utf8');
            app.debug(`Routes GPX file written: ${options.openCpnGeoJsonPathRoutes}`);
          }

          if (options.openCpnGeoJsonPathWaypoints && geoData.points.length > 0) {
            const waypointsGPX = generateWaypointsGPX(geoData.points, languageIsGerman);
            fs.writeFileSync(options.openCpnGeoJsonPathWaypoints, waypointsGPX, 'utf8');
            app.debug(`Objects/waypoints GPX file written: ${options.openCpnGeoJsonPathWaypoints}`);
          }
        } catch (err) {
          if (app && typeof app.error === 'function') app.error(`Fetch error: ${err.message}`);
        }
      };

      // Resource Provider für Sperrungen (Punkte) registrieren
      const sperrungProvider = {
        type: RESOURCESET_NAME,
        methods: {
          listResources: (params) => {
            return new Promise((resolve, reject) => {
              if (cachedResourceSet) {
                const result = {};
                result[RESOURCE_ID] = cachedResourceSet;
                resolve(result);
              } else {
                resolve({});
              }
            });
          },
          getResource: (id, property) => {
            return new Promise((resolve, reject) => {
              if (id === RESOURCE_ID && cachedResourceSet) {
                if (property) {
                  resolve(cachedResourceSet[property]);
                } else {
                  resolve(cachedResourceSet);
                }
              } else {
                reject(new Error('Resource not found'));
              }
            });
          },
          setResource: (id, value) => {
            return Promise.reject(new Error('setResource not supported - resources are read-only'));
          },
          deleteResource: (id) => {
            return new Promise((resolve, reject) => {
              if (id === RESOURCE_ID && cachedResourceSet) {
                cachedResourceSet = null;
                resolve();
              } else {
                reject(new Error('Resource not found'));
              }
            });
          }
        }
      };

      // Resource Provider für Routes (Linien) registrieren
      const routeProvider = {
        type: 'routes',
        methods: {
          listResources: (params) => {
            return new Promise((resolve, reject) => {
              resolve(cachedRoutes);
            });
          },
          getResource: (id, property) => {
            return new Promise((resolve, reject) => {
              if (cachedRoutes[id]) {
                if (property) {
                  resolve(cachedRoutes[id][property]);
                } else {
                  resolve(cachedRoutes[id]);
                }
              } else {
                reject(new Error('Route not found'));
              }
            });
          },
          setResource: (id, value) => {
            return Promise.reject(new Error('setResource not supported - resources are read-only'));
          },
          deleteResource: (id) => {
            return new Promise((resolve, reject) => {
              // Nur vom Plugin erstellte Routes können gelöscht werden
              if (pluginRouteIds.has(id) && cachedRoutes[id]) {
                delete cachedRoutes[id];
                pluginRouteIds.delete(id);
                resolve();
              } else {
                reject(new Error('Route not found or not deletable'));
              }
            });
          }
        }
      };

      try {
        app.registerResourceProvider(sperrungProvider);
        app.registerResourceProvider(routeProvider);
        if (app && typeof app.debug === 'function') app.debug('Resource providers registered');
      } catch (error) {
        if (app && typeof app.error === 'function') app.error(`Failed to register resource providers: ${error.message}`);
        return;
      }

      // Initiales Fetch und dann regelmäßig
      doFetch();
      timer = setInterval(doFetch, pollHours * 60 * 60 * 1000);
    },

    stop: function() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      // Explizit Cache leeren um Memory Leak zu vermeiden
      cachedResourceSet = null;
      cachedRoutes = {};
      pluginRouteIds.clear();
    },

    registerWithRouter: function(router) {
      // Config endpoint - liefert aktuelle Konfiguration
      router.get('/config', (req, res) => {
        res.json({
          configuration: plugin.lastOptions || {}
        });
      });

      // Configure endpoint - speichert neue Konfiguration
      router.post('/configure', (req, res) => {
        const newConfig = req.body.configuration;
        if (!newConfig) {
          return res.status(400).json({ error: 'No configuration provided' });
        }

        // Speichere Konfiguration
        plugin.lastOptions = newConfig;
        app.savePluginOptions(newConfig, (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({ message: 'Configuration saved!' });
        });
      });

      // Restart endpoint - startet Plugin neu
      router.post('/restart', (req, res) => {
        res.json({ message: 'Plugin restarting...' });

        // Plugin stoppen und neu starten
        setTimeout(() => {
          plugin.stop();
          setTimeout(() => {
            if (plugin.lastOptions) {
              plugin.start(plugin.lastOptions);
            }
          }, 500);
        }, 100);
      });
    },

    // Speichere letzte Optionen
    lastOptions: null
  };

  return plugin;
};
