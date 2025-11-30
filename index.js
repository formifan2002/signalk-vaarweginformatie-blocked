// SignalK Plugin: signalk-vaarweginformatie-blocked
// Fetches BLOCKED waterways from vaarweginformatie.nl and provides them as GeoJSON
// via SignalK Resource Provider API for automatic Freeboard-SK integration

const fs = require('fs');
const axios = require('axios');

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
  if (selectedAreas.length > 0) {
    selectedAreas.forEach((id) => url.searchParams.append('ftmAreas', String(id)));
  }
  
  return url.toString();
}

// Hilfsfunktion für führende Nullen
function formatDateTime(dateString) {
  if (!dateString) return 'unbekannt';
  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

// Formatiere Datum für OpenCPN (DD.MM.YYYY oder DD/MM/YYYY)
function formatDateForOpenCPN(dateString, languageIsGerman) {
  if (!dateString) return '';
  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const separator = languageIsGerman ? '.' : '/';
  return `${day}${separator}${month}${separator}${year}`;
}

// Formatiere Datum für OpenCPN ISO Format (2025-11-26T15:41:40Z)
function formatDateISO(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toISOString();
}

// Generiere GPX für Routes
function generateRoutesGPX(routes, colorHex, languageIsGerman) {
  let gpx = `<?xml version="1.0"?>
<gpx version="1.1" creator="OpenCPN" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/GpxExtensionsv3.xsd http://www8.garmin.com/xmlschemas/GpxExtensionsv3.xsd" xmlns:opencpn="http://www.opencpn.org">
`;

  routes.forEach(route => {
    const startDateFormatted = formatDateForOpenCPN(route.startDate, languageIsGerman);
    const endDateFormatted = route.endDate ? formatDateForOpenCPN(route.endDate, languageIsGerman) : '';
    const startISO = formatDateISO(route.startDate);
    
    // Bestimme "bis" oder "to" Text
    let endText = '';
    if (route.endDate) {
      endText = languageIsGerman ? `bis ${endDateFormatted}` : `to ${endDateFormatted}`;
    }
    
    gpx += `  <rte>
    <name>${escapeXml(route.name)}</name>
    <extensions>
      <opencpn:start>${startDateFormatted}</opencpn:start>
      <opencpn:end>${endText}</opencpn:end>
      <opencpn:planned_departure>${startISO}</opencpn:planned_departure>
      <opencpn:time_display>GLOBAL SETTING</opencpn:time_display>
      <opencpn:style style="100" />
      <gpxx:RouteExtension>
        <gpxx:IsAutoNamed>false</gpxx:IsAutoNamed>
        <gpxx:DisplayColor>Red</gpxx:DisplayColor>
      </gpxx:RouteExtension>
    </extensions>
`;

    // Waypoints der Route
    route.coordinates.forEach((coord, index) => {
      const [lon, lat] = coord;
      const isFirstOrLast = index === 0 || index === route.coordinates.length - 1;
      const sym = isFirstOrLast ? '1st-Active-Waypoint' : 'Symbol-Diamond-Red';
      
      gpx += `    <rtept lat="${lat}" lon="${lon}">
      <time>${startISO}</time>
      <name>${index + 1}</name>
      <sym>${sym}</sym>
      <type>WPT</type>
      <extensions>
        <opencpn:waypoint_range_rings visible="false" number="0" step="1" units="0" colour="${colorHex}" />
        <opencpn:scale_min_max UseScale="false" ScaleMin="2147483646" ScaleMax="0" />
      </extensions>
    </rtept>
`;
    });

    gpx += `  </rte>
`;
  });

  gpx += `</gpx>`;
  return gpx;
}

// Generiere GPX für Waypoints (Sperrungen)
function generateWaypointsGPX(points, languageIsGerman) {
  const now = new Date().toISOString();
  const title = languageIsGerman ? 'Sperrungen' : 'Closures';
  const description = languageIsGerman 
    ? 'Sperrungen von Objekten (Schleusen, Brücken,...)'
    : 'Closures of objects (locks, bridges,...)';
  
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:opencpn="http://www.opencpn.org" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd" version="1.1" creator="vwi_waypoints_generator.py -- https://github.com/marcelrv/OpenCPN-Waypoints">
  <metadata>
    <name>${title}</name>
    <desc>${description}</desc>
    <time>${now}</time>
  </metadata>
`;

  points.forEach(point => {
    const [lon, lat] = point.geometry.coordinates;
    const name = escapeXml(point.properties.name);
    const desc = escapeXml(point.properties.description);
    
    gpx += `  <wpt lat="${lat}" lon="${lon}">
    <name>${name}</name>
    <desc>${desc}</desc>
    <sym>Symbol-X-Large-Red</sym>
    <extensions>
      <opencpn:scale_min_max UseScale="True" ScaleMin="160000" ScaleMax="0"></opencpn:scale_min_max>
    </extensions>
  </wpt>
`;
  });

  gpx += `</gpx>`;
  return gpx;
}

// XML Escape Funktion
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Berechne Distanz zwischen zwei Koordinaten in Metern (Haversine-Formel)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Erdradius in Metern
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

// Berechne Gesamtdistanz einer Route
function calculateRouteDistance(coordinates) {
  let totalDistance = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];
    totalDistance += calculateDistance(lat1, lon1, lat2, lon2);
  }
  return Math.round(totalDistance);
}

// Formatiere Beschreibung für von/bis oder ab
function formatBlockageDescription(blockages, languageIsGerman) {
  return blockages.map(block => {
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

// Verschiebe Punkt um X Meter nach Osten (rechts)
function movePointEast(lat, lon, meters) {
  // 1 Grad Longitude ≈ 111320 * cos(lat) Meter
  const latRad = lat * Math.PI / 180;
  const metersPerDegree = 111320 * Math.cos(latRad);
  const deltaLon = meters / metersPerDegree;
  return [lon + deltaLon, lat];
}

function toGeoJSON(messages, movePointMeters, languageIsGerman) {
  const locationGroups = {};
  const routes = [];
  
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
      const description = formatBlockageDescription([{
        startDate: msg.startDate,
        endDate: msg.endDate
      }], languageIsGerman);
      
      const routeName = languageIsGerman 
        ? `Sperrung - ${msg.locationName || msg.title || 'Unbekannt'}`
        : `Closure - ${msg.locationName || msg.title || 'Unknown'}`;
      
      routes.push({
        name: routeName,
        description: description,
        distance: distance,
        coordinates: coordinates,
        fairway: msg.fairwayName,
        startDate: msg.startDate,
        endDate: msg.endDate
      });
      continue;
    }
    
    // Einzelner Punkt: gruppieren
    const firstPoint = validPoints[0];
    const lat = firstPoint.lat.toFixed(5);
    const lon = firstPoint.lon.toFixed(5);
    const key = `${lat},${lon}`;
    
    if (!locationGroups[key]) {
      locationGroups[key] = {
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        locationName: msg.locationName || msg.title || (languageIsGerman ? 'Gesperrte Wasserstraße' : 'Blocked waterway'),
        fairway: msg.fairwayName,
        blockages: []
      };
    }
    
    locationGroups[key].blockages.push({
      startDate: msg.startDate,
      endDate: msg.endDate,
      id: msg.ntsSummaryId || msg.id
    });
  }
  
  // Erstelle Features aus gruppierten Daten (Punkte)
  const features = [];
  for (const key in locationGroups) {
    const group = locationGroups[key];
    const descriptions = formatBlockageDescription(group.blockages, languageIsGerman);

    // Punkt nach rechts verschieben um Überlagerung zu vermeiden
    const [shiftedLon, shiftedLat] = movePointEast(group.lat, group.lon, movePointMeters);

    const feature = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [shiftedLon, shiftedLat]
      },
      properties: {
        name: group.locationName,
        description: descriptions,
        fairway: group.fairway || undefined,
        status: 'BLOCKED',
        blockageCount: group.blockages.length,
		blockages: group.blockages,
        source: 'vaarweginformatie.nl'
      }
    };
    
    features.push(feature);
  }
  
  return { points: features, routes: routes };
}

module.exports = function(app) {
  let timer = null;
  let cachedResourceSet = null;
  let cachedRoutes = {};
  let pluginRouteIds = new Set();
  let RESOURCESET_NAME = 'Sperrungen';
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
        daysSpan: { type: 'number', title: 'Anzahl Tage (max 60) (Number of days)', default: 7 },
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
      
      // Sprache bestimmen
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

          app.debug(`Raw API response type: ${typeof data}, isArray: ${Array.isArray(data)}`);
          
          const messages = Array.isArray(data)
            ? data
            : Array.isArray(data.messages)
            ? data.messages
            : Array.isArray(data.summaries)
            ? data.summaries
            : [];

          app.debug(`Found ${messages.length} messages in API response`);

          const geoData = toGeoJSON(messages, movePointMeters, languageIsGerman);

          app.debug(`GeoData: ${geoData.points.length} points, ${geoData.routes.length} routes`);

          // Alte Daten löschen
          cachedResourceSet = null;
          pluginRouteIds.clear();
          cachedRoutes = {};

          // ResourceSet für Punkte erstellen und cachen
          const resourceDescription = languageIsGerman 
            ? 'Gesperrte Wasserstraßen von vaarweginformatie.nl'
            : 'Blocked waterways from vaarweginformatie.nl';
            
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
            const routeId = `blocked-route-${index}-${Date.now()}`;
            pluginRouteIds.add(routeId);
            cachedRoutes[routeId] = {
              name: route.name,
              description: route.description,
              distance: route.distance,
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
          
          app.debug(`ResourceSet updated (${geoData.points.length} points, ${geoData.routes.length} routes)`);

          // Optional: OpenCPN GPX Dateien schreiben
          if (options.openCpnGeoJsonPathRoutes && geoData.routes.length > 0) {
            const routesGPX = generateRoutesGPX(geoData.routes, colorHex, languageIsGerman);
            fs.writeFileSync(options.openCpnGeoJsonPathRoutes, routesGPX, 'utf8');
            app.debug(`Routes GPX file written: ${options.openCpnGeoJsonPathRoutes}`);
          }
          
          if (options.openCpnGeoJsonPathWaypoints && geoData.points.length > 0) {
            const waypointsGPX = generateWaypointsGPX(geoData.points, languageIsGerman);
            fs.writeFileSync(options.openCpnGeoJsonPathWaypoints, waypointsGPX, 'utf8');
            app.debug(`Waypoints GPX file written: ${options.openCpnGeoJsonPathWaypoints}`);
          }
        } catch (err) {
          app.error(`Fetch error: ${err.message}`);
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
        app.debug('Resource providers registered');
      } catch (error) {
        app.error(`Failed to register resource providers: ${error.message}`);
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