function clampDays(days) {
	const n = Number(days);
	if (!Number.isFinite(n) || n <= 0) return 1;
	return Math.min(60, Math.max(1, Math.floor(n)));
}

function buildApiUrl(validFromMs, validUntilMs, selectedAreas) {
	const base =
		"https://www.vaarweginformatie.nl/frp/api/messages/nts/summaries";
	const url = new URL(base);
	url.searchParams.set("validFrom", String(validFromMs));
	url.searchParams.set("validUntil", String(validUntilMs));
	url.searchParams.set("ntsTypes", "FTM");
	url.searchParams.set("limitationGroup", "BLOCKED");

	// Nur wenn nicht "All areas" ausgewählt wurde
	if (Array.isArray(selectedAreas) && selectedAreas.length > 0) {
		selectedAreas.forEach((id) =>
			url.searchParams.append("ftmAreas", String(id))
		);
	}

	return url.toString();
}

export { clampDays, buildApiUrl };