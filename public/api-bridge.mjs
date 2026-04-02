// ============================================================
// API BRIDGE mit SignalK Token-Authentifizierung
//
// Auth ist NUR aktiv bei HTTP (lokaler Zugriff).
// Bei HTTPS (Synology Reverse Proxy) übernimmt NGINX die Auth.
// ============================================================

const AUTH_STORAGE_KEY = "signalk_auth_token";
const AUTH_CLIENT_ID_KEY = "signalk_client_id";

class VaarweginformatieApiBridge {
	constructor() {
		this.configUrl = "/plugins/signalk-vaarweginformatie-blocked/config";
		this.restartUrl = "/plugins/signalk-vaarweginformatie-blocked/restart";
		const port = window.location.port ? `:${window.location.port}` : "";
		this.baseUrl = `${window.location.protocol}//${window.location.hostname}${port}`;
		this.apiBase = `${this.baseUrl}/signalk/v1/api`;
		this.apiBaseResources = `${this.baseUrl}/signalk/v2/api/resources`;

		// Auth ist nur bei HTTP nötig (lokal). Bei HTTPS regelt NGINX.
		this.authRequired = window.location.protocol === "http:";

		// Token aus localStorage laden
		this._token = this.authRequired
			? localStorage.getItem(AUTH_STORAGE_KEY) || null
			: null;

		// Stabile Client-ID erzeugen oder laden (bleibt pro Browser gespeichert)
		if (this.authRequired) {
			let clientId = localStorage.getItem(AUTH_CLIENT_ID_KEY);
			if (!clientId) {
				// crypto.randomUUID() ist nur in HTTPS-Kontexten verfügbar
			const uuid = crypto.randomUUID?.() ??
				"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
					const r = (Math.random() * 16) | 0;
					return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
				});
			clientId = "vaarweg-" + uuid;
				localStorage.setItem(AUTH_CLIENT_ID_KEY, clientId);
			}
			this._clientId = clientId;
		}

		// Laufende Auth-Anfrage
		this._authRequestHref = null;
		this._authPollTimer = null;

		// Callbacks für Auth-Zustandsänderungen
		this._onAuthRequired = null;   // () => void  – zeige Login-UI
		this._onAuthPending = null;    // () => void  – zeige "Warte auf Genehmigung"
		this._onAuthApproved = null;   // () => void  – Auth erfolgreich
		this._onAuthDenied = null;     // () => void  – Auth abgelehnt
	}

	// --------------------------------------------------------
	// Callbacks registrieren
	// --------------------------------------------------------
	onAuthRequired(cb)  { this._onAuthRequired = cb; }
	onAuthPending(cb)   { this._onAuthPending = cb; }
	onAuthApproved(cb)  { this._onAuthApproved = cb; }
	onAuthDenied(cb)    { this._onAuthDenied = cb; }

	// --------------------------------------------------------
	// Interner fetch-Wrapper mit Token und Timeout
	// --------------------------------------------------------
	async _fetch(url, options = {}, timeoutMs = 8000) {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

		const headers = { ...(options.headers || {}) };
		if (this._token) {
			headers["Authorization"] = `Bearer ${this._token}`;
		}

		try {
			const response = await fetch(url, {
				...options,
				headers,
				signal: controller.signal,
			});
			clearTimeout(timeoutId);
			return response;
		} catch (err) {
			clearTimeout(timeoutId);
			throw err;
		}
	}

	// --------------------------------------------------------
	// Prüft ob eine Response ein Auth-Fehler ist (HTML statt JSON)
	// --------------------------------------------------------
	async _isAuthError(response) {
		if (!this.authRequired) return false;
		if (response.status === 401 || response.status === 403) return true;
		// SignalK gibt bei fehlender Auth manchmal 200 mit HTML zurück
		const contentType = response.headers.get("content-type") || "";
		if (!contentType.includes("application/json")) return true;
		return false;
	}

	// --------------------------------------------------------
	// Auth-Fehler behandeln: Token löschen und Callback auslösen
	// --------------------------------------------------------
	_handleAuthError() {
		this._token = null;
		localStorage.removeItem(AUTH_STORAGE_KEY);
		if (this._onAuthRequired) this._onAuthRequired();
	}

	// --------------------------------------------------------
	// Token validieren (analog ValidateToken im C++-Plugin)
	// Gibt zurück: "valid" | "invalid" | "unknown" (Netzwerkfehler/Timeout)
	// --------------------------------------------------------
	async validateToken() {
		if (!this._token) return "invalid";
		try {
			const response = await this._fetch(`${this.baseUrl}/plugins/`, {}, 5000);
			// Explizit abgelehnt → Token ungültig
			if (response.status === 401 || response.status === 403) return "invalid";
			// Jede andere Antwort (auch HTML, 500 etc.) → Token im Zweifel behalten
			return "valid";
		} catch {
			// Netzwerkfehler / Timeout → unklar, Token nicht löschen
			return "unknown";
		}
	}

	// --------------------------------------------------------
	// Auth-Anfrage bei SignalK stellen
	// (analog RequestAuthorization im C++-Plugin)
	// --------------------------------------------------------
	async requestAuthorization() {
		try {
			const platform =
				navigator.userAgentData?.platform ||
				(/android/i.test(navigator.userAgent) ? "Android" :
				/iphone|ipad/i.test(navigator.userAgent) ? "iOS" :
				/mac/i.test(navigator.userAgent) ? "macOS" :
				/win/i.test(navigator.userAgent) ? "Windows" :
				/linux/i.test(navigator.userAgent) ? "Linux" : "Unknown");

			const body = JSON.stringify({
				clientId: this._clientId,
				description: `SignalK Vaarweginformatie Plugin @ ${window.location.hostname} (${platform})`,
			});
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 8000);
			const response = await fetch(
				`${this.baseUrl}/signalk/v1/access/requests`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body,
					signal: controller.signal,
				}
			);
			clearTimeout(timeoutId);

			if (!response.ok) return false;
			const data = await response.json();

			if (data.href) {
				this._authRequestHref = data.href;
				if (this._onAuthPending) this._onAuthPending();
				this._startAuthPolling();
				return true;
			}
			return false;
		} catch {
			return false;
		}
	}

	// --------------------------------------------------------
	// Auth-Status pollen (analog CheckAuthorizationStatus)
	// --------------------------------------------------------
	_startAuthPolling() {
		if (this._authPollTimer) clearInterval(this._authPollTimer);
		this._authPollTimer = setInterval(() => this._pollAuthStatus(), 2000);
	}

	stopAuthPolling() {
		if (this._authPollTimer) {
			clearInterval(this._authPollTimer);
			this._authPollTimer = null;
		}
		this._authRequestHref = null;
	}

	async _pollAuthStatus() {
		if (!this._authRequestHref) return;
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000);
			const response = await fetch(
				`${this.baseUrl}${this._authRequestHref}`,
				{ signal: controller.signal }
			);
			clearTimeout(timeoutId);
			if (!response.ok) return;

			const data = await response.json();
			const state = data.state || data.status || "";

			// PENDING → weiter warten
			if (state === "PENDING") return;

			// DENIED
			if (data.accessRequest?.permission === "DENIED") {
				this.stopAuthPolling();
				if (this._onAuthDenied) this._onAuthDenied();
				return;
			}

			// Token erhalten → speichern
			if (data.accessRequest?.token) {
				this._token = data.accessRequest.token;
				localStorage.setItem(AUTH_STORAGE_KEY, this._token);
				this.stopAuthPolling();
				if (this._onAuthApproved) this._onAuthApproved();
			}
		} catch {
			// Netzwerkfehler während Polling → ignorieren, weiter versuchen
		}
	}

	// --------------------------------------------------------
	// Token-Status beim Start prüfen
	// Gibt zurück: "ok" | "required"
	// --------------------------------------------------------
	async checkInitialAuthStatus() {
		if (!this.authRequired) return "ok";
		if (!this._token) return "required";
		const result = await this.validateToken();
		if (result === "invalid") {
			// Explizit abgelehnt → Token löschen
			this._token = null;
			localStorage.removeItem(AUTH_STORAGE_KEY);
			return "required";
		}
		// "valid" oder "unknown" (Netzwerkproblem) → Token behalten und versuchen
		return "ok";
	}

	// --------------------------------------------------------
	// API-Methoden
	// --------------------------------------------------------

	async getConfig() {
		try {
			const response = await this._fetch(this.configUrl);
			if (await this._isAuthError(response)) {
				this._handleAuthError();
				return null;
			}
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			return await response.json();
		} catch (err) {
			console.error("Config load error:", err);
			return null;
		}
	}

	async saveConfig(payload) {
		try {
			const response = await this._fetch(this.configUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (await this._isAuthError(response)) {
				this._handleAuthError();
				throw new Error("auth");
			}
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			return await response.json();
		} catch (err) {
			console.error("Config save error:", err);
			throw err;
		}
	}

	async restartPlugin() {
		try {
			const response = await this._fetch(this.restartUrl, { method: "POST" });
			if (await this._isAuthError(response)) {
				this._handleAuthError();
				throw new Error("auth");
			}
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
			const response = await this._fetch(url);
			if (await this._isAuthError(response)) {
				this._handleAuthError();
				return [];
			}
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
			const response = await this._fetch(url);
			if (await this._isAuthError(response)) {
				this._handleAuthError();
				return [];
			}
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
			if (ownVesselCache?.position && ownVesselCache?.positionTimestamp) {
				const age = Date.now() - ownVesselCache.positionTimestamp;
				if (age < 5000) return ownVesselCache.position;
			}
			const url = `${this.apiBase}/vessels/self/navigation/position`;
			const response = await this._fetch(url);
			if (await this._isAuthError(response)) {
				this._handleAuthError();
				return null;
			}
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const data = await response.json();

			const timestamp = data.timestamp
				? new Date(data.timestamp).getTime()
				: Date.now();

			if (
				data.value &&
				typeof data.value.latitude === "number" &&
				typeof data.value.longitude === "number"
			) {
				const pos = { lat: data.value.latitude, lon: data.value.longitude };
				if (ownVesselCache) {
					ownVesselCache.position = pos;
					ownVesselCache.positionTimestamp = timestamp;
				}
				return pos;
			}

			if (data.values) {
				for (const source of Object.values(data.values)) {
					const val = source.value || {};
					if (
						typeof val.latitude === "number" &&
						typeof val.longitude === "number"
					) {
						const pos = { lat: val.latitude, lon: val.longitude };
						if (ownVesselCache) {
							ownVesselCache.position = pos;
							ownVesselCache.positionTimestamp = timestamp;
						}
						return pos;
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
			if (!mmsi && ownVesselCache?.data && ownVesselCache?.initialized) {
				const age = Date.now() - (ownVesselCache.dataTimestamp || 0);
				if (age < 10000) return ownVesselCache.data;
			}
			const url = `${this.apiBase}/vessels/${
				mmsi ? `urn:mrn:imo:mmsi:${mmsi}` : "self"
			}/`;
			const response = await this._fetch(url);
			if (await this._isAuthError(response)) {
				this._handleAuthError();
				return null;
			}
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

			if (!mmsi && ownVesselCache) {
				ownVesselCache.data = result;
				ownVesselCache.dataTimestamp = Date.now();
			}
			return result;
		} catch (err) {
			console.error("Vessel data load error:", err);
			return null;
		}
	}
}

export { VaarweginformatieApiBridge };
