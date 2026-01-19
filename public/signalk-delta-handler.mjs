// SignalK Delta WebSocket Handler für Position-Updates
class SignalKDeltaHandler {
	constructor() {
		this.ws = null;
		this.reconnectTimer = null;
		this.aisCache = null;
		this.ownVesselCache = {
			position: null,
			data: null,
			positionTimestamp: null,
			dataTimestamp: null,
			initialized: false,
		};
		this.subscribers = new Set();
	}

	setAISCache(aisDecoder) {
		this.aisCache = aisDecoder;
	}

	subscribe(callback) {
		this.subscribers.add(callback);
		return () => this.subscribers.delete(callback);
	}

	notifySubscribers(type, data) {
		this.subscribers.forEach((callback) => callback(type, data));
	}

	async connect() {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const host = window.location.hostname;
		const port = window.location.port || "3000";
		const wsUrl = `${protocol}//${host}:${port}/signalk/v1/stream?subscribe=none`;

		try {
			this.ws = new WebSocket(wsUrl);

			this.ws.onopen = () => {
				console.log("SignalK Delta WebSocket connected");

				// Subscribe NUR für eigenes Schiff (vessels.self)
				this.ws.send(
					JSON.stringify({
						context: "vessels.self",
						subscribe: [
							{
								path: "navigation.position",
								period: 1000,
								format: "delta",
								policy: "instant",
							},
							{
								path: "navigation.*",
								period: 2000,
								format: "delta",
								policy: "instant",
							},
							{
								path: "design.*",
								period: 10000,
								format: "delta",
								policy: "ideal",
							},
							{
								path: "communication.*",
								period: 10000,
								format: "delta",
								policy: "ideal",
							},
							{
								path: "communication.*",
								period: 10000,
								format: "delta",
								policy: "ideal",
							},
							{
								path: "electrical.*",
								period: 10000,
								format: "delta",
								policy: "ideal",
							},	
							{
								path: "sensors.*",
								period: 10000,
								format: "delta",
								policy: "ideal",
							},															
						],
					})
				);
			};

			this.ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					this.handleDelta(data);
				} catch (err) {
					console.error("Delta parse error:", err);
				}
			};

			this.ws.onerror = (err) => {
				console.error("SignalK Delta WebSocket error:", err);
			};

			this.ws.onclose = () => {
				console.log("SignalK Delta WebSocket closed, reconnecting in 5s...");
				this.reconnectTimer = setTimeout(() => this.connect(), 5000);
			};
		} catch (err) {
			console.error("SignalK Delta connection failed:", err);
			this.reconnectTimer = setTimeout(() => this.connect(), 5000);
		}
	}

	handleDelta(data) {
		if (!data.updates) return;

		const context = data.context;
		const isSelf = context === "vessels.self";

		// NUR eigenes Schiff verarbeiten (AIS-Schiffe kommen über anderen WebSocket)
		if (!isSelf) return;

		data.updates.forEach((update) => {
			if (!update.values) return;

			update.values.forEach((value) => {
				const path = value.path;
				const val = value.value;
				const timestamp = update.timestamp
					? new Date(update.timestamp).getTime()
					: Date.now();

				// Position Updates für eigenes Schiff
				if (path === "navigation.position" && val?.latitude && val?.longitude) {
					if (
						!this.ownVesselCache.positionTimestamp ||
						timestamp > this.ownVesselCache.positionTimestamp
					) {
						this.ownVesselCache.position = {
							lat: val.latitude,
							lon: val.longitude,
						};
						this.ownVesselCache.positionTimestamp = timestamp;
						this.notifySubscribers("ownPosition", this.ownVesselCache.position);
					}
				}

				// Alle anderen Daten für eigenes Schiff
				this.updateOwnVesselData(path, val, timestamp);
			});
		});
	}

	updateOwnVesselData(path, value, timestamp) {
		if (!this.ownVesselCache.data) {
			this.ownVesselCache.data = {
				navigation: {},
				design: {},
				communication: {},
			};
			this.ownVesselCache.dataTimestamp = 0;
		}

		// Pfad in verschachteltes Objekt umwandeln
		const parts = path.split(".");
		let current = this.ownVesselCache.data;

		for (let i = 0; i < parts.length - 1; i++) {
			if (!current[parts[i]]) {
				current[parts[i]] = {};
			}
			current = current[parts[i]];
		}

		// Wert mit Metadata speichern
		const lastKey = parts[parts.length - 1];
		if (typeof value === "object" && value !== null) {
			current[lastKey] = value;
		} else {
			current[lastKey] = { value, timestamp };
		}

		// Timestamp nur aktualisieren wenn neuer
		if (timestamp > this.ownVesselCache.dataTimestamp) {
			this.ownVesselCache.dataTimestamp = timestamp;
		}

		this.notifySubscribers("ownData", this.ownVesselCache.data);
	}

	// ENTFERNEN: extractMMSI wird nicht mehr benötigt
	// extractMMSI(context) { ... }

	getOwnPosition() {
		return this.ownVesselCache.position;
	}

	getOwnVesselData() {
		return this.ownVesselCache.data;
	}

	// NEU: Initiale Daten setzen
	setInitialOwnVesselData(vesselData) {
		if (this.ownVesselCache.initialized) {
			console.log("Own vessel data already initialized via Delta");
			return;
		}

		this.ownVesselCache.data = vesselData;
		this.ownVesselCache.dataTimestamp = Date.now();
		this.ownVesselCache.initialized = true;
		console.log("Initial own vessel data loaded from API");
	}

	setInitialPosition(position, timestamp) {
		if (!this.ownVesselCache.positionTimestamp) {
			this.ownVesselCache.position = position;
			this.ownVesselCache.positionTimestamp = timestamp || Date.now();
			console.log("Initial own vessel position loaded from API");
		}
	}

	disconnect() {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}
}

export { SignalKDeltaHandler };
