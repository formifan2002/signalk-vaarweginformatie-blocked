let translateCache = new Map();

// Cache-Konfiguration
const CACHE_MAX_SIZE = 1000; // Maximale Anzahl Einträge
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 Stunden
const CACHE_CLEANUP_INTERVAL = 60 * 60 * 1000; // Cleanup alle 60 Minuten

// Batch-Translation Konfiguration
let translationQueue = [];
let translationQueueTimer = null;
const BATCH_DELAY = 1000; // Warte 1 Sekunde um Anfragen zu sammeln
const BATCH_SIZE = 20; // Max. 20 Texte pro Anfrage

// Cache-Eintrag mit Timestamp
class CacheEntry {
    constructor(value) {
        this.value = value;
        this.timestamp = Date.now();
    }
}

// Automatische Cache-Bereinigung
function cleanupTranslateCache() {
    const now = Date.now();
    const keysToDelete = [];

    // Entferne abgelaufene Einträge
    for (const [key, entry] of translateCache.entries()) {
        if (now - entry.timestamp > CACHE_MAX_AGE) {
            keysToDelete.push(key);
        }
    }

    keysToDelete.forEach((key) => translateCache.delete(key));

    // Falls Cache noch zu groß: Älteste Einträge löschen (LRU)
    if (translateCache.size > CACHE_MAX_SIZE) {
        const entries = Array.from(translateCache.entries()).sort(
            (a, b) => a[1].timestamp - b[1].timestamp
        );

        const toDelete = entries.slice(0, translateCache.size - CACHE_MAX_SIZE);
        toDelete.forEach(([key]) => translateCache.delete(key));
    }

    console.log(
        `Cache cleanup: ${keysToDelete.length} expired entries removed, ${translateCache.size} entries remaining`
    );
}

// Starte automatische Bereinigung
let cacheCleanupTimer = setInterval(
    cleanupTranslateCache,
    CACHE_CLEANUP_INTERVAL
);

// Bereinigung beim Schließen der Seite
window.addEventListener("beforeunload", () => {
    if (cacheCleanupTimer) {
        clearInterval(cacheCleanupTimer);
    }
    if (translationQueueTimer) {
        clearTimeout(translationQueueTimer);
    }
    translateCache.clear();
    translationQueue = [];
});

function chunkString(str, maxLength) {
    const chunks = [];
    let current = "";

    for (const part of str.split(" ||| ")) {
        if ((current + part).length > maxLength) {
            chunks.push(current);
            current = part;
        } else {
            current = current ? current + " ||| " + part : part;
        }
    }

    if (current) chunks.push(current);
    return chunks;
}

// Batch-Translation Verarbeitung
async function processBatchTranslation() {
    if (translationQueue.length === 0) return;

    // Hole aktuelle Queue und leere sie
    const batch = translationQueue.splice(0, BATCH_SIZE);
    translationQueueTimer = null;

    // Gruppiere nach Zielsprache
    const byLang = {};
    batch.forEach((item) => {
        if (!byLang[item.targetLang]) {
            byLang[item.targetLang] = [];
        }
        byLang[item.targetLang].push(item);
    });

    // Verarbeite jede Sprache separat
    for (const [targetLang, items] of Object.entries(byLang)) {
        try {
            const separator = " ||| ";
            const texts = items.map((i) => i.text);
            const combinedText = texts.join(separator);

            // In Chunks < 1000 Zeichen zerlegen
            const chunks = let translateCache = new Map();(combinedText, 900); // 900 = Sicherheitsabstand

            const { protocol, hostname, port } = window.location;
            const effectivePort = port || (protocol === "https:" ? "3000" : "3000");
            const baseUrl = `${protocol}//${hostname}:${effectivePort}`;

            const translatedChunks = [];

            // Jeden Chunk einzeln übersetzen
            for (const chunk of chunks) {
                const url = `${baseUrl}/plugins/signalk-vaarweginformatie-blocked/translate?text=${encodeURIComponent(
                    chunk
                )}&to=${encodeURIComponent(targetLang)}`;

                const response = await fetch(url, { method: "GET" });

                if (!response.ok) {
                    console.error("Translation API error:", response.status);
                    items.forEach((item) => item.resolve(item.text));
                    continue;
                }

                const data = await response.json();
                const translated = data.translated?.text || data.translated || chunk;

                translatedChunks.push(translated);
            }

            // Alle übersetzten Chunks wieder zusammenfügen
            const translatedCombined = translatedChunks.join(separator);

            // Wieder in Einzeltexte zerlegen
            const translatedParts = translatedCombined.split(separator);

            items.forEach((item, index) => {
                const translated = translatedParts[index] || item.text;

                translateCache.set(item.cacheKey, new CacheEntry(translated));
                item.resolve(translated);
            });

            console.log(
                `Batch translated ${items.length} texts to ${targetLang} in ${chunks.length} chunk(s)`
            );
        } catch (err) {
            console.error("Batch translation failed:", err);
            items.forEach((item) => item.resolve(item.text));
        }
    }

    // Trigger Cleanup wenn Cache zu groß wird
    if (translateCache.size > CACHE_MAX_SIZE * 1.2) {
        cleanupTranslateCache();
    }

    // Falls noch Einträge in Queue: nächsten Batch starten
    if (translationQueue.length > 0) {
        translationQueueTimer = setTimeout(processBatchTranslation, BATCH_DELAY);
    }
}

// Hauptfunktion für Übersetzung
async function translate(text, targetLang) {
    // Cache-Key
    const cacheKey = `${text}:${targetLang}`;

    // Prüfe Cache
    if (translateCache.has(cacheKey)) {
        const entry = translateCache.get(cacheKey);
        if (Date.now() - entry.timestamp < CACHE_MAX_AGE) {
            return entry.value;
        } else {
            translateCache.delete(cacheKey);
        }
    }

    // Füge zur Queue hinzu und warte auf Batch-Verarbeitung
    return new Promise((resolve) => {
        translationQueue.push({
            text,
            targetLang,
            cacheKey,
            resolve,
        });

        // Starte Timer für Batch-Verarbeitung
        if (!translationQueueTimer) {
            translationQueueTimer = setTimeout(processBatchTranslation, BATCH_DELAY);
        }

        // Verarbeite sofort wenn Queue voll ist
        if (translationQueue.length >= BATCH_SIZE) {
            clearTimeout(translationQueueTimer);
            translationQueueTimer = null;
            processBatchTranslation();
        }
    });
}

export { translate };