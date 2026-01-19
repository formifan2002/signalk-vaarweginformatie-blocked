import path from "path";
import { fileURLToPath } from "url";
import { translationCache } from "./translationCache.mjs";

function registerRouterEndpoints(router, plugin, app) {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);

	// Express route
	router.get("/openapi", (req, res) => {
		res.sendFile(path.join(__dirname, "openApi.json"));
	});

	// ⭐ Config endpoint - liefert aktuelle Konfiguration
	router.get("/config", (req, res) => {
		res.json({
			configuration: plugin.lastOptions || {},
		});
	});

	// ⭐ Configure endpoint - speichert neue Konfiguration
	router.post("/configure", (req, res) => {
		const newConfig = req.body.configuration;
		if (!newConfig) {
			return res.status(400).json({ error: "No configuration provided" });
		}

		plugin.lastOptions = newConfig;
		app.savePluginOptions(newConfig, (err) => {
			if (err) {
				return res.status(500).json({ error: err.message });
			}
			res.json({ message: "Configuration saved!" });
		});
	});

	// ⭐ Restart endpoint - startet Plugin neu
	router.post("/restart", (req, res) => {
		res.json({ message: "Plugin restarting..." });

		setTimeout(() => {
			plugin.stop();
			setTimeout(() => {
				if (plugin.lastOptions) {
					plugin.start(plugin.lastOptions);
				}
			}, 500);
		}, 100);
	});

	// In plugin.registerWithRouter hinzufügen:

	// ⭐ Manuelle Übersetzung hinzufügen
	router.post("/addtranslation", (req, res) => {
		const { original, translation, sourceLang, targetLang } = req.body;

		if (!original || !translation) {
			return res.status(400).json({
				error: "Missing required fields: original and translation",
			});
		}

		const source = sourceLang || "nl";
		const target = targetLang || "de";

		try {
			translationCache.addManualTranslation(
				original,
				translation,
				source,
				target
			);

			res.json({
				message: "Manual translation added successfully",
				original,
				translation,
				sourceLang: source,
				targetLang: target,
				stats: translationCache.getStats(),
			});
		} catch (err) {
			app.error("Error adding manual translation:", err);
			res.status(500).json({
				error: "Failed to add manual translation",
				details: err.message,
			});
		}
	});

	// ⭐ Manuelle Übersetzung löschen
	router.delete("/addtranslation", (req, res) => {
		const { original, sourceLang, targetLang } = req.body;

		if (!original) {
			return res.status(400).json({
				error: "Missing required field: original",
			});
		}

		const source = sourceLang || "nl";
		const target = targetLang || "de";

		try {
			const removed = translationCache.removeManualTranslation(
				original,
				source,
				target
			);

			if (removed) {
				res.json({
					message: "Manual translation removed successfully",
					original,
					sourceLang: source,
					targetLang: target,
				});
			} else {
				res.status(404).json({
					error: "Manual translation not found",
				});
			}
		} catch (err) {
			app.error("Error removing manual translation:", err);
			res.status(500).json({
				error: "Failed to remove manual translation",
				details: err.message,
			});
		}
	});

	// ⭐ Alle manuellen Übersetzungen abrufen
	router.get("/addtranslation", (req, res) => {
		const sourceLang = req.query.sourceLang || "nl";
		const targetLang = req.query.targetLang || "de";

		try {
			const manualTranslations = translationCache.getManualTranslations(
				sourceLang,
				targetLang
			);

			res.json({
				sourceLang,
				targetLang,
				count: Object.keys(manualTranslations).length,
				translations: manualTranslations,
			});
		} catch (err) {
			app.error("Error getting manual translations:", err);
			res.status(500).json({
				error: "Failed to get manual translations",
				details: err.message,
			});
		}
	});

	// ⭐ Text übersetzen (mit manuellen Ersetzungen)
	router.get("/translate", async (req, res) => {
		const text = req.query.text;
		const to = req.query.to || "de";
		const from = req.query.from || "nl";
		if (!text) {
			return res.status(400).json({ error: "Missing text parameter" });
		}
		try {
			const translatedText = await plugin.translate(text, from, to);
			res.json({
				translated: translatedText,
			});
		} catch (err) {
			res.status(500).json({
				error: "Translation failed",
				details: err.message,
			});
		}
	});

	// ⭐ Translation Stats mit manuellen Übersetzungen
	router.get("/translation-stats", (req, res) => {
		try {
			const stats = translationCache.getStats();
			res.json(stats);
		} catch (err) {
			app.error("Error getting translation stats:", err);
			res.status(500).json({
				error: "Failed to get stats",
				details: err.message,
			});
		}
	});
}

export { registerRouterEndpoints };
