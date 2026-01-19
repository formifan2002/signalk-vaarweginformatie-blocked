import { translationCache } from "./translationCache.mjs";
import * as deepl from "deepl-node";

async function translateTextByDeepl(
	text,
	sourceLanguage = null,
	targetLanguage = "de",
	app,
	options,
) {
	// 1. Prüfen, ob DeepL-Key existiert
	if (!options?.deeplApiKey || options.deeplApiKey.trim() === "") {
		return text;
	}

	// 2. DeepL-Client erzeugen
	const deeplClient = new deepl.Translator(options.deeplApiKey);

	try {
		// 3. Übersetzen
		const result = await deeplClient.translateText(
			text,
			sourceLanguage,
			targetLanguage,
			{ formality: "prefer_more" },
		);

		if (!result?.text) {
			app.debug(`DeepL returned no translation for text: "${text}"`);
			return text;
		}
		return result.text;
	} catch (err) {
		app.error(`DeepL error: ${err.message}`);
		return text;
	}
}

async function translateText(
	text,
	sourceLang = null,
	targetLang = "de",
	app,
	plugin,
) {
	try {
		// console.log(`🔄 translateText called for: "${text.substring(0, 50)}..."`);

		// 1. Cache prüfen
		const cached = await translationCache.get(text, targetLang);
		if (cached) {
			// console.log(`✅ Found in cache, returning: "${cached.substring(0, 50)}..."`);
			return cached;
		}

		// console.log(`📡 Not in cache, calling DeepL...`);

		// 2. DeepL-Übersetzung
		const translatedText = await translateTextByDeepl(
			text,
			sourceLang,
			targetLang,
			app,
			plugin.lastOptions || {},
		);

		// console.log(`📥 DeepL returned: "${translatedText.substring(0, 50)}..."`);

		// 3. Manuelle Ersetzungen
		// console.log(`🔧 Applying manual replacements...`);
		const finalText = await translationCache.applyManualReplacements(
			translatedText,
			sourceLang ?? "nl",
			targetLang,
		);

		// console.log(`✨ After replacements: "${finalText.substring(0, 50)}..."`);

		// 4. Ergebnis speichern
		translationCache.set(text, targetLang, finalText);
		translationCache.save();

		return finalText;
	} catch (err) {
		app.error("Translation failed:", err.message);
		return text;
	}
}

/**
 * Übersetzt alle contents und communications in einem Batch
 */
async function translateAllBerichte(
	locationGroups,
	routes,
	languageIsGerman,
	app,
	plugin,
) {
	const targetLang = languageIsGerman ? "de" : "en";

	// Sammle alle zu übersetzenden Texte mit Referenzen
	const textsToTranslate = [];
	const textMap = new Map(); // text -> array of references

	// Hilfsfunktion um Text zu registrieren
	async function registerText(text, reference) {
		if (!text || text.trim() === "") return;

		const normalized = text.trim();
		const cached = await translationCache.get(normalized, targetLang);
		// Map immer registrieren
		if (!textMap.has(normalized)) {
			textMap.set(normalized, []);
		}

		// Nur übersetzen, wenn NICHT im Cache
		if (!cached && !textsToTranslate.includes(normalized)) {
			textsToTranslate.push(normalized);
		}

		textMap.get(normalized).push(reference);
	}

	// Sammle Texte aus Points
	for (const key in locationGroups) {
		const group = locationGroups[key];
		for (const berichtKey in group.berichte) {
			const bericht = group.berichte[berichtKey];

			if (bericht.communication) {
				await registerText(bericht.communication, {
					type: "point-comm",
					group: key,
					bericht: berichtKey,
				});
			}

			if (bericht.contents) {
				await registerText(bericht.contents, {
					type: "point-content",
					group: key,
					bericht: berichtKey,
				});
			}
		}
	}

	// Sammle Texte aus Routes
	for (let routeIndex = 0; routeIndex < routes.length; routeIndex++) {
		const route = routes[routeIndex];
		for (const berichtKey in route.berichte) {
			const bericht = route.berichte[berichtKey];

			if (bericht.communication) {
				await registerText(bericht.communication, {
					type: "route-comm",
					routeIndex: routeIndex,
					bericht: berichtKey,
				});
			}

			if (bericht.contents) {
				await registerText(bericht.contents, {
					type: "route-content",
					routeIndex: routeIndex,
					bericht: berichtKey,
				});
			}
		}
	}

	// ⭐ Verteile gecachte Übersetzungen sofort
	for (const [text, references] of textMap.entries()) {
		const cached = await translationCache.get(text, targetLang);
		if (cached) {
			references.forEach((ref) => {
				if (ref.type === "point-comm") {
					locationGroups[ref.group].berichte[
						ref.bericht
					].communicationTranslated = cached;
				} else if (ref.type === "point-content") {
					locationGroups[ref.group].berichte[ref.bericht].contentsTranslated =
						cached;
				} else if (ref.type === "route-comm") {
					routes[ref.routeIndex].berichte[ref.bericht].communicationTranslated =
						cached;
				} else if (ref.type === "route-content") {
					routes[ref.routeIndex].berichte[ref.bericht].contentsTranslated =
						cached;
				}
			});
		}
	}
	app.debug(
		`Batch translation: ${textsToTranslate.length} unique texts to translate`,
	);

	if (textsToTranslate.length === 0) {
		app.debug("No texts to translate");
		return;
	}

	// Übersetze in Batches (max 10 gleichzeitig, mit Delays)
	const batchSize = 10; // 10 Texte pro Batch
	const delayMs = 200; // 0,2 Sekunden Pause zwischen Batches

	for (let i = 0; i < textsToTranslate.length; i += batchSize) {
		const batch = textsToTranslate.slice(i, i + batchSize);
		const batchNum = Math.floor(i / batchSize) + 1;
		const totalBatches = Math.ceil(textsToTranslate.length / batchSize);

		//app.debug(`Translating batch ${batchNum}/${totalBatches} (${batch.length} texts)...`);

		const promises = batch.map(async (text, idx) => {
			try {
				// Kurze Verzögerung zwischen einzelnen Requests im Batch
				await new Promise((resolve) => setTimeout(resolve, idx * 200));
				const translatedText = await plugin.translate(text, null, targetLang);

				return { original: text, translated: translatedText };
			} catch (err) {
				app.error(`Translation failed: ${err.message}`);
				return { original: text, translated: text }; // Fallback: Original
			}
		});

		const results = await Promise.all(promises);

		// Verteile Übersetzungen zurück
		results.forEach(({ original, translated }) => {
			const references = textMap.get(original);
			if (!references) return;

			references.forEach((ref) => {
				if (ref.type === "point-comm") {
					locationGroups[ref.group].berichte[
						ref.bericht
					].communicationTranslated = translated;
				} else if (ref.type === "point-content") {
					locationGroups[ref.group].berichte[ref.bericht].contentsTranslated =
						translated;
				} else if (ref.type === "route-comm") {
					routes[ref.routeIndex].berichte[ref.bericht].communicationTranslated =
						translated;
				} else if (ref.type === "route-content") {
					routes[ref.routeIndex].berichte[ref.bericht].contentsTranslated =
						translated;
				}
			});
		});

		// Pause zwischen Batches (außer beim letzten)
		if (i + batchSize < textsToTranslate.length) {
			app.debug(`Waiting ${delayMs}ms before next translation batch...`);
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}

	translationCache.save();
	const stats = translationCache.getStats();
	app.debug(
		`✅ Batch translation completed for ${textsToTranslate.length} texts. Cache: ${stats.totalEntries} entries`,
	);
}

export { translateText, translateAllBerichte };
