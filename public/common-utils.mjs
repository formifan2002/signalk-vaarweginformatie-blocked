async function descriptionToHtml(description, berichte, currentLang = "de") {
	if (!description || typeof description !== "string") return "";
	
	// ⭐ Übersetzungen
	const T =
		currentLang === "de"
			? {
					report: "Bericht",
					reason: "Grund",
					blockage: "Sperrung",
					misc: "Sonstiges",
					communication: "Kommunikation",
					original: "Original",
			  }
			: {
					report: "Report",
					reason: "Reason",
					blockage: "Blockage",
					misc: "Miscellaneous",
					communication: "Communication",
					original: "Original",
			  };
	
	const reports = description
		.split(" #")
		.map((s) => s.trim())
		.filter(Boolean);

	let html = "";

	for (let i = 0; i < reports.length; i++) {
		const rep = reports[i];
		const isLast = i === reports.length - 1;
		const colonIdx = rep.indexOf(":");
		if (colonIdx === -1) {
			html += `<br><strong>${T.bericht}</strong><ul><li>${escapeHtml(
				rep
			)}</li></ul>`;
			continue;
		}

		const header = rep.slice(0, colonIdx).trim();
		const body = rep.slice(colonIdx + 1).trim();

		let headerHtml = escapeHtml(header);
		let communicationText = "";
		let contentsText = "";
		let communicationOriginal = "";
		let contentsOriginal = "";

		// ⭐ EINHEITLICHES HANDLING FÜR ROUTES UND SPERRUNGEN
		if (berichte && typeof berichte === "object") {
			const found = Object.values(berichte).find((b) => {
				if (!b || typeof b.bericht !== "string") return false;

				const key = b.bericht.trim();
				const h = header.trim();

				return h === key || h.startsWith(key) || key.startsWith(h);
			});

			if (found?.detailUrl) {
				const url = transformDetailUrl(found.detailUrl);
				headerHtml = `<strong>${T.report}: </strong><a href="${escapeHtml(encodeURI(url))}" target="_blank">${found.bericht}</a>`;
				headerHtml += `<strong> ${T.reason}: </strong> ${found.reasonCode}`;
			}

			communicationText = found?.communicationTranslated || found?.communication || "";
			contentsText = found?.contentsTranslated || found?.contents || "";
			
			// ⭐ Original-Texte für Tooltips
			communicationOriginal = found?.communication || "";
			contentsOriginal = found?.contents || "";
		}

		// ⭐ MARKER-ERKENNUNG
		const markerRegex = /--\s*([^-\n]+?)\s*:?\s*--/g;
		const markers = [];
		let m;
		while ((m = markerRegex.exec(body)) !== null) {
			markers.push({
				name: m[1].trim(),
				start: m.index,
				end: m.index + m[0].length,
			});
		}

		html += `<br><strong>${headerHtml}</strong>`;

		// ⭐ KEINE MARKER → einfache Liste
		if (markers.length === 0) {
			const items = body
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
			html += `<ul>`;
			items.forEach((item) => {
				html += `<li>${escapeHtml(item)}</li>`;
			});
			html += `</ul>`;
		} else {
			// ⭐ TEXT VOR DEM ERSTEN MARKER
			const pre = body.slice(0, markers[0].start).trim();
			if (pre) {
				const preItems = pre
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean);
				if (preItems.length) {
					html += `<ul>`;
					preItems.forEach((item) => {
						html += `<li>${escapeHtml(item)}</li>`;
					});
					html += `</ul>`;
				}
			}

			// ⭐ MARKER-SEKTIONEN
			for (let i = 0; i < markers.length; i++) {
				const cur = markers[i];
				const next = markers[i + 1];
				const sectionText = body
					.slice(cur.end, next ? next.start : body.length)
					.trim();

				html += `<ul><li><strong>${escapeHtml(cur.name)}</strong><ul>`;

				const items = sectionText
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean);
				items.forEach((item) => {
					const cleaned = item.replace(markerRegex, "").trim();
					if (cleaned) {
						html += `<li>${escapeHtml(cleaned)}</li>`;
					}
				});

				html += `</ul></li></ul>`;
			}
		}

		// ⭐ COMMUNICATION MIT TOOLTIP
		if (communicationText) {
			const hasOriginal = communicationOriginal && communicationOriginal !== communicationText;
			const tooltipAttr = hasOriginal 
				? ` title="${T.original}: ${escapeHtml(communicationOriginal).replace(/"/g, '&quot;')}"` 
				: '';
			
			html += `<div><strong> ${T.communication}: </strong><br><small><span${tooltipAttr} style="cursor: help; ${hasOriginal ? 'border-bottom: 1px dotted #666;' : ''}">${linkify(
				escapeHtml(communicationText)
			)}</span></small></div>`;
		}

		// ⭐ CONTENTS MIT TOOLTIP
		if (contentsText) {
			const hasOriginal = contentsOriginal && contentsOriginal !== contentsText;
			const tooltipAttr = hasOriginal 
				? ` title="${T.original}: ${escapeHtml(contentsOriginal).replace(/"/g, '&quot;')}"` 
				: '';
			
			html += `<p><div><strong> ${T.misc}: </strong><br><small><span${tooltipAttr} style="cursor: help; ${hasOriginal ? 'border-bottom: 1px dotted #666;' : ''}">${linkify(
				escapeHtml(contentsText)
			)}</span></small></div>`;
		}
		
		if (!isLast) {
			html += `<p><hr><p>`;
		}
	}
	return html;
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

function linkify(text) {
	if (!text || typeof text !== "string") return text;

	// Regex erkennt http://, https:// und www.
	const urlRegex = /((https?:\/\/|www\.)[^\s]+)/gi;

	return text.replace(urlRegex, (url) => {
		let href = url;

		// www. → https://www.
		if (href.startsWith("www.")) {
			href = "https://" + href;
		}

		return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
	});
}

function escapeHtml(str) {
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

export {
	descriptionToHtml,
	escapeHtml,
};