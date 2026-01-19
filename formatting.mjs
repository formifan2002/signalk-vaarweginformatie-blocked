import { communicationCodes } from "./codeMappings.mjs";

function escapeXml(unsafe) {
    if (unsafe === undefined || unsafe === null) return "";
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function formatDateISO(dateString) {
	if (!dateString) return "";
	const d = new Date(dateString);
	if (!isFinite(d)) return "";
	return d.toISOString();
}

function formatDate(ms, hasTime, languageIsGerman, toTime = false) {
	if (!ms) return "";

	// Locale abhängig vom Parameter
	const locale = !languageIsGerman ? "en-GB" : "de-DE";
	if (!hasTime) {
		if (!toTime) {
			return new Date(ms)
				.toLocaleString("de-DE", {
					weekday: "long",
					day: "2-digit",
					month: "2-digit",
					year: "2-digit",
				})
				.replace(",", "");
		} else {
			return new Date(ms).toLocaleString(locale, {
				hour: "2-digit",
				minute: "2-digit",
			});
		}
	}
	const ts = ms < 1e12 ? ms * 1000 : ms;
	const date = new Date(ts);
	const offsetHours = 1;
	const localDate = new Date(date.getTime() + offsetHours * 3600 * 1000);
	if (toTime === true) {
		const hh = String(localDate.getHours()).padStart(2, "0");
		const mm = String(localDate.getMinutes()).padStart(2, "0");
		return `${hh}:${mm}`;
	}
	const weekdayOpts = { weekday: "long" };
	const dateOpts = { day: "2-digit", month: "2-digit", year: "numeric" };
	return `${localDate.toLocaleDateString(
		locale,
		weekdayOpts
	)} ${localDate.toLocaleDateString(locale, dateOpts)}`;
}

function formatBlockageTime(blockage, languageIsGerman) {
    if (!blockage) return "";

    const lang = languageIsGerman ? "de-DE" : "en-GB";

    const weekdayNames = languageIsGerman
        ? [
                "Sonntag",
                "Montag",
                "Dienstag",
                "Mittwoch",
                "Donnerstag",
                "Freitag",
                "Samstag",
          ]
        : [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
          ];

    function formatDate(ts) {
        if (!ts) return "";
        const d = new Date(ts);
        const day = weekdayNames[d.getDay()];
        const date = d.toLocaleDateString(lang);
        return `${day} ${date}`;
    }

    function formatTime(t) {
        if (!t) return "";
        // t is "22:00" or "06:00"
        return t;
    }

    let parts = [];

    // --- Startdatum ---
    if (blockage.startDate) {
        const start = formatDate(blockage.startDate);
        parts.push(languageIsGerman ? `ab ${start}` : `from ${start}`);
    }

    // --- Enddatum ---
    if (blockage.endDate) {
        const end = formatDate(blockage.endDate);
        parts.push(languageIsGerman ? `bis ${end}` : `until ${end}`);
    }

    // --- Tägliche Zeiten ---
    if (blockage.dailyStartTime && blockage.dailyEndTime) {
        const startT = formatTime(blockage.dailyStartTime);
        const endT = formatTime(blockage.dailyEndTime);

        parts.push(
            languageIsGerman ? `täglich ${startT}–${endT}` : `daily ${startT}–${endT}`
        );
    }

    // --- Wochentage (z. B. werktags) ---
    if (blockage.weekdays && Array.isArray(blockage.weekdays)) {
        const days = blockage.weekdays.map((i) => weekdayNames[i]).join(", ");

        parts.push(days);
    }

    // --- Maximalverzögerung ---
    if (blockage.maxDelay) {
        parts.push(
            languageIsGerman
                ? `(höchstens ${blockage.maxDelay})`
                : `(maximum ${blockage.maxDelay})`
        );
    }

    return parts.join(" ");
}

function formatCommunications(communications, languageIsGerman = true) {
	if (!communications || !Array.isArray(communications)) return "";

	const label = languageIsGerman ? "Kommunikation" : "Communication";

	const parts = communications.map((item) => {
		const code = communicationCodes[item.communicationCode];
		const labelCode = code
			? languageIsGerman
				? code.de
				: code.en
			: item.communicationCode;
		return `${labelCode} ${item.numberAddress}`;
	});
	if (parts.length === 0) {
		return ""; // wenn keine Teile vorhanden sind → leerer String
	}
	return `${label}: ${parts.join(", ")}`;
}

function transformDetailUrl(original) {
    const apiPrefix = "https://vaarweginformatie.nl/frp/api/messages/";
    const mainPrefix = "https://vaarweginformatie.nl/frp/main/#/nts/";

    if (!original.startsWith(apiPrefix)) return original;

    const rest = original.slice(apiPrefix.length);
    const firstSlash = rest.indexOf("/");
    if (firstSlash === -1) return original;

    const partToUpper = rest.slice(0, firstSlash).toUpperCase();
    const remainder = rest.slice(firstSlash);

    return mainPrefix + partToUpper + remainder;
}

export { escapeXml, formatDateISO, formatDate, formatBlockageTime, formatCommunications, transformDetailUrl };