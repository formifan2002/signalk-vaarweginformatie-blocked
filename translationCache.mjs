import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_FILE = path.join(__dirname, "translation-cache.json");
const MANUAL_TRANSLATIONS_FILE = path.join(
	__dirname,
	"manual-translations.json",
);
const CACHE_MAX_AGE_MS = 28 * 24 * 60 * 60 * 1000; // 28 Tage

class TranslationCache {
	constructor() {
		this.cache = {};
		this.manualTranslations = {};
		this.initialized = false;
		this._initPromise = this._init();
	}
	async _init() {
		await this.load(); // ⭐ auch async
		await this.loadManualTranslations();
		this.initialized = true;

		const manualCount = Object.keys(this.manualTranslations).reduce(
			(sum, key) =>
				sum + Object.keys(this.manualTranslations[key] || {}).length,
			0,
		);
		console.log(
			`✅ TranslationCache initialized: ${Object.keys(this.cache).length} cached, ${manualCount} manual translations`,
		);
	}

	async load() {
		return new Promise((resolve) => {
			try {
				if (fs.existsSync(CACHE_FILE)) {
					const data = fs.readFileSync(CACHE_FILE, "utf8");
					this.cache = JSON.parse(data);
					this.cleanup();
				}
				resolve();
			} catch (err) {
				console.error("Error loading translation cache:", err);
				this.cache = {};
				resolve();
			}
		});
	}

	async loadManualTranslations() {
		return new Promise((resolve) => {
			try {
				if (fs.existsSync(MANUAL_TRANSLATIONS_FILE)) {
					const data = fs.readFileSync(MANUAL_TRANSLATIONS_FILE, "utf8");
					this.manualTranslations = JSON.parse(data);
				}
				resolve();
			} catch (err) {
				console.error("Error loading manual translations:", err);
				this.manualTranslations = {};
				resolve();
			}
		});
	}

	// ⭐ Hilfsmethode: Warte bis initialisiert
	async ensureInitialized() {
		if (!this.initialized) {
			await this._initPromise;
		}
	}

	save() {
		try {
			fs.writeFileSync(CACHE_FILE, JSON.stringify(this.cache, null, 2), "utf8");
		} catch (err) {
			console.error("Error saving translation cache:", err);
		}
	}

	saveManualTranslations() {
		try {
			fs.writeFileSync(
				MANUAL_TRANSLATIONS_FILE,
				JSON.stringify(this.manualTranslations, null, 2),
				"utf8",
			);
		} catch (err) {
			console.error("Error saving manual translations:", err);
		}
	}

	cleanup() {
		const now = Date.now();
		let removed = 0;

		for (const key in this.cache) {
			const entry = this.cache[key];

			// Manuelle Übersetzungen nicht löschen
			if (entry.manual) continue;

			if (now - entry.timestamp > CACHE_MAX_AGE_MS) {
				delete this.cache[key];
				removed++;
			}
		}

		if (removed > 0) {
			console.log(`Translation cache: removed ${removed} old entries`);
			this.save();
		}
	}

	/**
	 * Wendet manuelle Ersetzungen auf einen Text an
	 * URLs werden geschützt und nicht verändert
	 */
async applyManualReplacements(text, sourceLang, targetLang) {
    await this.ensureInitialized(); 
    const key = `${sourceLang}-${targetLang}`;
    const replacements = this.manualTranslations[key];

    if (!replacements) return text;

    // Begriffe, die NIEMALS übersetzt werden dürfen
	const protectedTerms = [
		"RWS", "KLPD", "VTS", "HHD" , "RAC", "KNRM", "ANWB", "VP", "SP", "BP", "AP", "KP", "MP",
		"HW", "LW", "SOG", "COG", "BPR", "NPR", "NWB", "MCC", "OC", "VC", "KWC", "SAR", "BBK", "NTS", "EM"
];

    // 1. URLs, E-Mail-Adressen und feste Begriffe schützen
    const urlRegex = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/gi;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

    const protectedItems = [];

    let protectedText = text
        // URLs schützen
        .replace(urlRegex, (match) => {
            const index = protectedItems.length;
            protectedItems.push(match);
            return `__PROTECTED_PLACEHOLDER_${index}__`;
        })
        // E-Mails schützen
        .replace(emailRegex, (match) => {
            const index = protectedItems.length;
            protectedItems.push(match);
            return `__PROTECTED_PLACEHOLDER_${index}__`;
        });

    // feste Begriffe schützen
    protectedTerms.forEach((term) => {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\b${escaped}\\b`, "gi");

        protectedText = protectedText.replace(regex, (match) => {
            const index = protectedItems.length;
            protectedItems.push(match);
            return `__PROTECTED_PLACEHOLDER_${index}__`;
        });
    });

    let result = protectedText;

    // 2. Längste Suchbegriffe zuerst
    const sortedEntries = Object.entries(replacements).sort(
        (a, b) => b[0].length - a[0].length
    );

    for (const [search, replace] of sortedEntries) {
        if (!search) continue;

        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "gi");

        result = result.replace(regex, (match) => {
            if (match[0] === match[0].toUpperCase()) {
                return replace.charAt(0).toUpperCase() + replace.slice(1);
            }
            return replace;
        });
    }

    // 3. Alles wiederherstellen
    protectedItems.forEach((item, index) => {
        result = result.replace(`__PROTECTED_PLACEHOLDER_${index}__`, item);
    });

    return result;
}



	/**
	 * Fügt eine manuelle Übersetzung hinzu
	 */
	addManualTranslation(
		original,
		translation,
		sourceLang = "nl",
		targetLang = "de",
	) {
		const key = `${sourceLang}-${targetLang}`;

		if (!this.manualTranslations[key]) {
			this.manualTranslations[key] = {};
		}

		this.manualTranslations[key][original] = translation;
		this.saveManualTranslations();

		// Cache aktualisieren: Alle existierenden Übersetzungen neu berechnen
		this.updateExistingTranslations(sourceLang, targetLang);

		console.log(
			`Manual translation added: "${original}" -> "${translation}" (${sourceLang}-${targetLang})`,
		);
	}

	/**
	 * Aktualisiert alle existierenden Cache-Einträge mit neuen manuellen Übersetzungen
	 */
	async updateExistingTranslations(sourceLang, targetLang) {
		const key = `${sourceLang}-${targetLang}`;
		const replacements = this.manualTranslations[key];

		if (!replacements) return;

		let updated = 0;

		for (const textKey in this.cache) {
			const entry = this.cache[textKey];

			// Prüfe ob dieser Eintrag die richtige Sprachrichtung hat
			if (entry[targetLang]) {
				const originalText = textKey;

				// Prüfe ob manuelle Ersetzungen anwendbar sind
				let shouldUpdate = false;
				for (const original in replacements) {
					if (originalText.includes(original)) {
						shouldUpdate = true;
						break;
					}
				}

				if (shouldUpdate) {
					// Wende manuelle Ersetzungen auf Original-Text an
					const replacedText = await this.applyManualReplacements(
						originalText,
						sourceLang,
						targetLang,
					);

					// Wenn sich etwas geändert hat, aktualisiere die Übersetzung
					if (replacedText !== originalText) {
						// Behalte die alte Übersetzung als Basis und ersetze nur die manuellen Begriffe
						const oldTranslation = entry[targetLang];
						const newTranslation = await this.applyManualReplacements(
							oldTranslation,
							sourceLang,
							targetLang,
						);

						if (newTranslation !== oldTranslation) {
							entry[targetLang] = newTranslation;
							entry.timestamp = Date.now();
							updated++;
						}
					}
				}
			}
		}

		if (updated > 0) {
			console.log(
				`Updated ${updated} existing translations with new manual replacements`,
			);
			this.save();
		}
	}

	async get(text, targetLang) {
		await this.ensureInitialized(); // ⭐ Warte bis fertig

		const entry = this.cache[text];
		if (!entry) return null;

		if (!entry.manual) {
			if (Date.now() - entry.timestamp > CACHE_MAX_AGE_MS) {
				delete this.cache[text];
				return null;
			}
		}

		return entry[targetLang] || null;
	}

	set(text, targetLang, translation, isManual = false) {
		if (!this.cache[text]) {
			this.cache[text] = { timestamp: Date.now() };
		}
		this.cache[text][targetLang] = translation;
		this.cache[text].timestamp = Date.now();

		if (isManual) {
			this.cache[text].manual = true;
		}
	}

	/**
	 * Liefert alle manuellen Übersetzungen für eine Sprachrichtung
	 */
	getManualTranslations(sourceLang = "nl", targetLang = "de") {
		const key = `${sourceLang}-${targetLang}`;
		return this.manualTranslations[key] || {};
	}

	/**
	 * Löscht eine manuelle Übersetzung
	 */
	removeManualTranslation(original, sourceLang = "nl", targetLang = "de") {
		const key = `${sourceLang}-${targetLang}`;

		if (
			this.manualTranslations[key] &&
			this.manualTranslations[key][original]
		) {
			delete this.manualTranslations[key][original];
			this.saveManualTranslations();
			console.log(
				`Manual translation removed: "${original}" (${sourceLang}-${targetLang})`,
			);
			return true;
		}

		return false;
	}

	getStats() {
		const manualCount = Object.values(this.manualTranslations).reduce(
			(sum, translations) => sum + Object.keys(translations).length,
			0,
		);

		return {
			totalEntries: Object.keys(this.cache).length,
			manualEntries: Object.values(this.cache).filter((e) => e.manual).length,
			manualReplacements: manualCount,
			oldestEntry:
				Object.values(this.cache).length > 0
					? Math.min(...Object.values(this.cache).map((e) => e.timestamp))
					: null,
			newestEntry:
				Object.values(this.cache).length > 0
					? Math.max(...Object.values(this.cache).map((e) => e.timestamp))
					: null,
		};
	}
}

export const translationCache = new TranslationCache();
