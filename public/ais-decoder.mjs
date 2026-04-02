// AIS Message Decoder
class AISDecoder {
    constructor() {
        this.vessels = new Map();
        this.lastCleanup = Date.now();
        this.fragmentBuffer = new Map(); // Für mehrteilige Nachrichten
        this.fragmentTimeout = new Map();
    }

    // Entferne veraltete Schiffe (älter als 1 Stunde)
    cleanup() {
        const now = Date.now();
        const oneHour = 15 * 60 * 1000;

        for (const [mmsi, vessel] of this.vessels.entries()) {
            if (now - vessel.lastUpdate > oneHour) {
                this.vessels.delete(mmsi);
            }
        }

        this.lastCleanup = now;
        for (const [key, timeout] of this.fragmentTimeout.entries()) {
            clearTimeout(timeout);
        }
        this.fragmentTimeout.clear();
        this.fragmentBuffer.clear();
    }

    // Dekodiere AIS Payload (6-bit ASCII zu Bits)
    decodeAISPayloadCharsToBits(payload) {
        let bits = "";
        for (let char of payload) {
            let val = char.charCodeAt(0) - 48;
            if (val > 40) {
                val -= 8;
            }
            bits += val.toString(2).padStart(6, "0");
        }
        return bits;
    }

    // Extrahiere Bits
    getBits(bits, start, length) {
        return parseInt(bits.substr(start, length), 2);
    }

    // Extrahiere Bits mit Vorzeichen (Two's Complement)
    getSignedBits(bits, start, length) {
        const val = parseInt(bits.substr(start, length), 2);
        const signBit = 1 << (length - 1);
        if (val & signBit) {
            return val - (1 << length);
        }
        return val;
    }

    // Dekodiere Text (6-bit ASCII)
    decodeText(bits, start, length) {
        const chars =
            "@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_ !\"#$%&'()*+,-./0123456789:;<=>?";
        let text = "";

        for (let i = 0; i < length; i += 6) {
            const val = this.getBits(bits, start + i, 6);
            const char = chars[val] || "";
            if (char === "@") break; // @ ist Terminierungszeichen
            text += char;
        }

        return text.trim();
    }

    // Dekodiere AIS Type 1/2/3 (Position Report)
    decodeType123(bits) {
        const mmsi = this.getBits(bits, 8, 30);
        const navStatus = this.getBits(bits, 38, 4);
        const rot = this.getSignedBits(bits, 42, 8); // AIS ROT (signed int -128..127)
        const sog = this.getBits(bits, 50, 10) / 10.0; // knots
        const lon = this.getSignedBits(bits, 61, 28) / 600000.0;
        const lat = this.getSignedBits(bits, 89, 27) / 600000.0;
        const cog = this.getBits(bits, 116, 12) / 10.0; // degrees
        const heading = this.getBits(bits, 128, 9); // degrees
        const timestamp = this.getBits(bits, 137, 6);

        //
        // ROT Dekodierung (ITU‑R M.1371)
        //
        let rateDegPerMin = null;

        if (rot === -128) {
            rateDegPerMin = null; // unavailable
        } else if (rot === 0) {
            rateDegPerMin = 0; // no turn
        } else {
            const sign = rot < 0 ? -1 : 1;
            const rotAbs = Math.abs(rot);

            // ROT in Grad pro Minute
            rateDegPerMin = sign * Math.pow(rotAbs / 4.733, 2);

            // Begrenzung auf ±708°/min
            if (rateDegPerMin > 708) rateDegPerMin = 708;
            if (rateDegPerMin < -708) rateDegPerMin = -708;
        }

        //
        // Ausgabe in Grad pro Sekunde
        //
        let rateDegPerSec = null;
        if (rateDegPerMin !== null) {
            rateDegPerSec = rateDegPerMin / 60;
        }

        return {
            mmsi,
            latitude: lat > 90 || lat < -90 ? null : lat,
            longitude: lon > 180 || lon < -180 ? null : lon,
            sog: sog >= 102.2 ? null : sog,
            cog: cog >= 360 ? null : cog,
            heading: heading === 511 ? null : heading,
            navStatus: navStatus === 15 ? null : navStatus,
            rot: rateDegPerSec, // <-- jetzt in °/s
            positionTimestamp: null,
            aisClass: "A",
            lastUpdate: Date.now(),
        };
    }

    // Dekodiere AIS Type 5 (Static and Voyage Data)
    decodeType5(bits) {
        const mmsi = this.getBits(bits, 8, 30);
        const imoRaw = this.getBits(bits, 40, 30);

        // IMO kann 0 sein (nicht vergeben) oder 0x3FFFFFFF (nicht verfügbar)
        const imo = imoRaw === 0 || imoRaw === 0x3fffffff ? null : imoRaw;

        const callsign = this.decodeText(bits, 70, 42);
        const shipname = this.decodeText(bits, 112, 120);
        const shiptype = this.getBits(bits, 232, 8);

        // Dimensionen
        const toBow = this.getBits(bits, 240, 9);
        const toStern = this.getBits(bits, 249, 9);
        const toPort = this.getBits(bits, 258, 6);
        const toStarboard = this.getBits(bits, 264, 6);

        const draught = this.getBits(bits, 294, 8) / 10; // meters
        const destination = this.decodeText(bits, 302, 120);

        // Berechne Gesamtlänge und -breite
        const length = toBow + toStern;
        const width = toPort + toStarboard;

        // ETA (Estimated Time of Arrival)
        const etaMonth = this.getBits(bits, 274, 4);
        const etaDay = this.getBits(bits, 278, 5);
        const etaHour = this.getBits(bits, 283, 5);
        const etaMinute = this.getBits(bits, 288, 6);

        // ETA zu Datum konvertieren (falls gültig)
        let eta = null;
        if (
            etaMonth > 0 &&
            etaMonth <= 12 &&
            etaDay > 0 &&
            etaDay <= 31 &&
            etaHour < 24 &&
            etaMinute < 60
        ) {
            const now = new Date();
            const nowUTC = Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate(),
                now.getUTCHours(),
                now.getUTCMinutes(),
                now.getUTCSeconds()
            );

            let year = now.getUTCFullYear();

            let etaUTC = Date.UTC(year, etaMonth - 1, etaDay, etaHour, etaMinute);

            // Wenn ETA in der Vergangenheit liegt → nächstes Jahr
            if (etaUTC < nowUTC) {
                etaUTC = Date.UTC(year + 1, etaMonth - 1, etaDay, etaHour, etaMinute);
            }

            eta = new Date(etaUTC);
        }

        return {
            mmsi,
            imo,
            callsign: callsign || null,
            name: shipname || null,
            shipType: shiptype,
            draught: draught === 0 ? null : draught,
            length: length === 0 ? null : length,
            width: width === 0 ? null : width,
            destination: destination || null,
            eta: eta,
            aisClass: "A",
            lastUpdate: Date.now(),
        };
    }

    // Type 19 - Extended Position Report Class B
    decodeType19(bits) {
        const mmsi = this.getBits(bits, 8, 30);

        const sog = this.getBits(bits, 46, 10) / 10.0;

        const lon = this.getSignedBits(bits, 57, 28) / 600000.0;
        const lat = this.getSignedBits(bits, 85, 27) / 600000.0;

        const cog = this.getBits(bits, 112, 12) / 10.0;
        const heading = this.getBits(bits, 124, 9);
        const timestamp = this.getBits(bits, 133, 6);

        // Skip 4-bit reserved region
        const name = this.decodeText(bits, 143, 120);

        const shiptype = this.getBits(bits, 263, 8);

        const toBow = this.getBits(bits, 271, 9);
        const toStern = this.getBits(bits, 280, 9);
        const toPort = this.getBits(bits, 289, 6);
        const toStarboard = this.getBits(bits, 295, 6);

        const length = toBow + toStern;
        const width = toPort + toStarboard;

        return {
            mmsi,
            latitude: lat > 90 || lat < -90 ? null : lat,
            longitude: lon > 180 || lon < -180 ? null : lon,
            sog: sog >= 102.2 ? null : sog,
            cog: cog >= 360 ? null : cog,
            heading: heading === 511 ? null : heading,
            shipType: shiptype,
            name: name || null,
            length: length === 0 ? null : length,
            width: width === 0 ? null : width,
            positionTimestamp: null,
            aisClass: "B",
            lastUpdate: Date.now(),
        };
    }

    // Type 24 - Static Data Report (Part A & B)
    decodeType24(bits) {
        const mmsi = this.getBits(bits, 8, 30);
        const partNumber = this.getBits(bits, 38, 2);

        if (partNumber === 0) {
            // Part A: Name
            const name = this.decodeText(bits, 40, 120);
            return {
                mmsi,
                name: name || null,
                partA: true,
                aisClass: "B",
                lastUpdate: Date.now(),
            };
        } else if (partNumber === 1) {
            // Part B: Ship Type & Dimensions
            const shiptype = this.getBits(bits, 40, 8);
            const callsign = this.decodeText(bits, 90, 42);

            const toBow = this.getBits(bits, 132, 9);
            const toStern = this.getBits(bits, 141, 9);
            const toPort = this.getBits(bits, 150, 6);
            const toStarboard = this.getBits(bits, 156, 6);

            const length = toBow + toStern;
            const width = toPort + toStarboard;

            return {
                mmsi,
                shipType: shiptype,
                callsign: callsign || null,
                length: length === 0 ? null : length,
                width: width === 0 ? null : width,
                partB: true,
                aisClass: "B",
                lastUpdate: Date.now(),
            };
        }

        return null;
    }

    decodeAISBits(bits) {
        const msgType = this.getBits(bits, 0, 6);

        if (msgType >= 1 && msgType <= 3) {
            const data = this.decodeType123(bits);
            if (data?.mmsi) this.updateVessel(data);
            return data;
        } else if (msgType === 5) {
            const data = this.decodeType5(bits);
            if (data?.mmsi) this.updateVessel(data);
            return data;
        } else if (msgType === 19) {
            const data = this.decodeType19(bits);
            if (data?.mmsi) this.updateVessel(data);
            return data;
        } else if (msgType === 24) {
            const data = this.decodeType24(bits);
            const mmsi = data.mmsi;

            const vessel = this.vessels.get(mmsi) || {};

            if (data.partA) {
                vessel.name = data.name;
            }

            if (data.partB) {
                vessel.callsign = data.callsign;
                vessel.shipType = data.shipType;
                vessel.length = data.length;
                vessel.width = data.width;
            }

            vessel.mmsi = mmsi;
            vessel.aisClass = "B";
            vessel.lastUpdate = Date.now();

            this.vessels.set(mmsi, vessel);

            return data;
        }
        return null;
    }

    // Neue Methode: Update Position Timestamp von WebSocket
    updatePositionTimestamp(mmsi, timestampStr) {
        const vessel = this.vessels.get(Number(mmsi));
        if (!vessel) return;

        // Konvertiere ISO-String zu Timestamp
        const timestamp = new Date(timestampStr).getTime();

        // Update vessel mit echtem Timestamp
        vessel.positionTimestamp = timestamp;
        this.vessels.set(mmsi, vessel);
    }

    // Verarbeite NMEA Sentence
    processNMEA(sentence) {
        if (!sentence.startsWith("!AIVDM")) return null;

        const parts = sentence.split(",");
        if (parts.length < 7) return null;

        const fragmentCount = parseInt(parts[1], 10);
        const fragmentNumber = parseInt(parts[2], 10);
        const messageId = parts[3] || ""; // Message ID für Fragmentierung
        const channel = parts[4] || "A"; // Kanal (A oder B)
        const payload = parts[5];
        const fillBits = parseInt(parts[6].split("*")[0], 10) || 0;

        // Payload in Bits umwandeln
        const fragmentBits = this.decodeAISPayloadCharsToBits(payload);

        if (fragmentCount > 1) {
            // Eindeutiger Key für Fragment-Buffer
            // Wenn messageId leer ist, verwende Kanal als Key (Type 5 hat oft keine messageId)
            const bufferKey = messageId || channel;

            // Buffer initialisieren
            if (!this.fragmentBuffer.has(bufferKey)) {
                this.fragmentBuffer.set(bufferKey, []);

                // NEU: Auto-Cleanup nach 30 Sekunden für unvollständige Fragmente
                const timeout = setTimeout(() => {
                    if (this.fragmentBuffer.has(bufferKey)) {
                        this.fragmentBuffer.delete(bufferKey);
                        this.fragmentTimeout.delete(bufferKey);
                        console.warn(
                            `Fragment timeout for key: ${bufferKey} - incomplete message discarded`
                        );
                    }
                }, 30000);

                this.fragmentTimeout.set(bufferKey, timeout);
            }

            // Fillbits nur beim letzten Fragment entfernen
            const effectiveBits =
                fragmentNumber === fragmentCount && fillBits > 0
                    ? fragmentBits.slice(0, fragmentBits.length - fillBits)
                    : fragmentBits;

            this.fragmentBuffer
                .get(bufferKey)
                .push({ num: fragmentNumber, bits: effectiveBits });

            // Erst verarbeiten, wenn alle Fragmente da sind
            if (fragmentNumber !== fragmentCount) return null;

            // NEU: Clear timeout wenn alle Fragmente empfangen wurden
            const timeout = this.fragmentTimeout.get(bufferKey);
            if (timeout) {
                clearTimeout(timeout);
                this.fragmentTimeout.delete(bufferKey);
            }

            // Alle Fragmente sortiert zusammenfügen
            const allBits = this.fragmentBuffer
                .get(bufferKey)
                .sort((a, b) => a.num - b.num)
                .map((x) => x.bits)
                .join("");

            this.fragmentBuffer.delete(bufferKey);

            return this.decodeAISBits(allBits);
        } else {
            // Einteilige Nachricht: Fillbits direkt entfernen
            const bits =
                fillBits > 0
                    ? fragmentBits.slice(0, fragmentBits.length - fillBits)
                    : fragmentBits;
            return this.decodeAISBits(bits);
        }
    }

    // Update Vessel Daten
    updateVessel(data) {
        if (!data || !data.mmsi) return;

        const existing = this.vessels.get(data.mmsi) || {};
        this.vessels.set(data.mmsi, { ...existing, ...data });

        if (Date.now() - this.lastCleanup > 2 * 60 * 1000) {
            this.cleanup();
        }
    }

    // Hole alle Schiffe
    getVessels() {
        return Array.from(this.vessels.values());
    }

    // Hole einzelnes Schiff
    getVessel(mmsi) {
        return this.vessels.get(mmsi);
    }
}

export { AISDecoder };