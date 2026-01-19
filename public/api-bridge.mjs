class VaarweginformatieApiBridge {
	constructor() {
		this.configUrl = "/plugins/signalk-vaarweginformatie-blocked/config";
		this.restartUrl = "/plugins/signalk-vaarweginformatie-blocked/restart";
		const port = window.location.port ? `:${window.location.port}` : "";
		this.baseUrl = `${window.location.protocol}//${window.location.hostname}${port}`;
		this.apiBase = `${this.baseUrl}/signalk/v1/api`; // für Positionsdaten
		this.apiBaseResources = `${this.baseUrl}/signalk/v2/api/resources`; // für Resources
	}

	async getConfig() {
		try {
			const response = await fetch(this.configUrl);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			return await response.json();
		} catch (err) {
			console.error("Config load error:", err);
			return {
				configuration: {},
				enabled: true,
				enableLogging: false,
				enableDebug: false,
			};
		}
	}

	async saveConfig(payload) {
		try {
			const response = await fetch(this.configUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			return await response.json();
		} catch (err) {
			console.error("Config save error:", err);
			throw err;
		}
	}

	async restartPlugin() {
		try {
			const response = await fetch(this.restartUrl, { method: "POST" });
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			return await response.json();
		} catch (err) {
			console.error("Plugin restart error:", err);
			throw err;
		}
	}

	async getClosures(language = "de") {
		try {
			const resourceType = language === "de" ? "Sperrungen" : "Closures";
			const url = `${this.apiBaseResources}/${resourceType}`;
			const response = await fetch(url);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			return await response.json();
		} catch (err) {
			console.error("Closures load error:", err);
			return [];
		}
	}

	async getWaterways() {
		try {
			const url = `${this.apiBaseResources}/routes`;
			const response = await fetch(url);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			return await response.json();
		} catch (err) {
			console.error("Waterways load error:", err);
			return [];
		}
	}

	async getAllData(language = "de") {
		try {
			const [closures, waterways] = await Promise.all([
				this.getClosures(language),
				this.getWaterways(),
			]);
			return { closures, waterways };
		} catch (err) {
			console.error("Data load error:", err);
			return { closures: [], waterways: [] };
		}
	}

	async getLatLon(ownVesselCache = null) {
		try {
			// Cache-Prüfung: Wenn Delta-Handler bereits Daten hat, verwende diese
			if (ownVesselCache?.position && ownVesselCache?.positionTimestamp) {
				const now = Date.now();
				const age = now - ownVesselCache.positionTimestamp;
				// Cache ist max 5 Sekunden alt -> verwende Cache
				if (age < 5000) {
					return ownVesselCache.position;
				}
			}

			const url = `${this.apiBase}/vessels/self/navigation/position`;
			const response = await fetch(url);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const data = await response.json();

			// Timestamp aus API-Response extrahieren
			const timestamp = data.timestamp
				? new Date(data.timestamp).getTime()
				: Date.now();

			if (
				data.value &&
				typeof data.value.latitude === "number" &&
				typeof data.value.longitude === "number"
			) {
				const returned = {
					lat: data.value.latitude,
					lon: data.value.longitude,
				};
				if (ownVesselCache) {
					ownVesselCache.position = returned;
					ownVesselCache.positionTimestamp = timestamp;
				}
				return returned;
			}

			if (data.values) {
				for (const source of Object.values(data.values)) {
					const val = source.value || {};
					if (
						typeof val.latitude === "number" &&
						typeof val.longitude === "number"
					) {
						const returned = { lat: val.latitude, lon: val.longitude };
						if (ownVesselCache) {
							ownVesselCache.position = returned;
							ownVesselCache.positionTimestamp = timestamp;
						}
						return returned;
					}
				}
			}

			if (ownVesselCache) {
				ownVesselCache.position = null;
				ownVesselCache.positionTimestamp = null;
			}
			return null;
		} catch (err) {
			console.error("Lat/Lon load error:", err);
			if (ownVesselCache) {
				ownVesselCache.position = null;
				ownVesselCache.positionTimestamp = null;
			}
			return null;
		}
	}

	async getVesselData(mmsi = "", ownVesselCache = null) {
		try {
			// Cache nur für eigenes Schiff (mmsi === "")
			if (!mmsi && ownVesselCache?.data && ownVesselCache?.initialized) {
				// Wenn Delta-Handler bereits Daten hat, verwende diese
				const now = Date.now();
				const age = now - (ownVesselCache.dataTimestamp || 0);
				// Cache ist max 10 Sekunden alt -> verwende Cache
				if (age < 10000) {
					return ownVesselCache.data;
				}
			}

			const url = `${this.apiBase}/vessels/${
				mmsi ? `urn:mrn:imo:mmsi:${mmsi}` : "self"
			}/`;
			const response = await fetch(url);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const data = await response.json();

			const result = {
				name: data.name || null,
				mmsi: data.mmsi || null,
				communication: data.communication || null,
				design: data.design || null,
				sensors: data.sensors || null,
				electrical: data.electrical || null,
				navigation: data?.navigation || null,
			};

			// Cache nur für eigenes Schiff speichern
			if (!mmsi && ownVesselCache) {
				ownVesselCache.data = result;
				ownVesselCache.dataTimestamp = Date.now();
				// NICHT initialized setzen - das macht nur der Delta-Handler
			}

			return result;
		} catch (err) {
			console.error("Vessel data load error:", err);
			return null;
		}
	}
}

export { VaarweginformatieApiBridge };
