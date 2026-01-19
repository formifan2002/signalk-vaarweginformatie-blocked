import {
    getLimitationCode,
    formatIndicationCode,
    formatReferenceCode,
    formatTargetGroup,
    getIntervalCode
} from "./codeMappings.mjs";
import { formatDate } from "./formatting.mjs";

function formatDescription(locationGroup, app, languageIsGerman) {
    const lat = locationGroup.lat ?? null;
    const lon = locationGroup.lon ?? null;
    const berichtValues = Object.values(locationGroup.berichte);

    // Prüfen, ob Start- und Enddatum derselbe lokale Tag sind
    const isSameLocalDay = (aMs, aHasTime, bMs, bHasTime, languageIsGerman) => {
        if (!aMs || !bMs) return false;
        return (
            formatDate(aMs, aHasTime, languageIsGerman) ===
            formatDate(bMs, bHasTime, languageIsGerman)
        );
    };

    const texts = berichtValues.map((berichtGroup, bIndex) => {
        let berichtHeader = `${berichtGroup.bericht}${
            berichtGroup.reasonCode ? " - " + berichtGroup.reasonCode : ""
        }: `.trim();
        let limitationCode = "";
        const blockagesText = berichtGroup.blockages
            .map((blockage) => {
                let limitationText = "";
                if (
                    blockage.limitationCode &&
                    blockage.limitationCode != limitationCode
                ) {
                    let type = getLimitationCode(
                        blockage.limitationCode,
                        lat,
                        lon,
                        berichtGroup.detailUrl,
                        app,
                        languageIsGerman
                    );
                    if (type && type !== "") {
                        limitationText = ` -- ${type}: -- `;
                    }
                    limitationCode = blockage.limitationCode;
                }
                const startDateLocal =
                    (blockage.startDate ?? 0) + (blockage.startTimeMs ?? 0);
                const endDateLocal =
                    (blockage.endDate ?? 0) + (blockage.endTimeMs ?? 0);
                const hasEndDate = blockage.endDate !== undefined;
                const hasStartTime = blockage.startTimeMs !== undefined;
                const hasEndTime = blockage.endTimeMs !== undefined;

                const dateStr =
                    startDateLocal != 0
                        ? formatDate(startDateLocal, hasStartTime, languageIsGerman)
                        : "";
                const endDateStr =
                    endDateLocal != 0
                        ? formatDate(
                                endDateLocal + (!hasEndDate ? blockage.startDate : 0),
                                hasEndTime,
                                languageIsGerman
                          )
                        : "";

                const startTime = hasStartTime
                    ? formatDate(startDateLocal, hasStartTime, languageIsGerman, true)
                    : "";
                const endTime = hasEndTime
                    ? formatDate(
                            endDateLocal + (!hasEndDate ? blockage.startDate : 0),
                            hasEndTime,
                            languageIsGerman,
                            true
                      )
                    : "";

                let tgText = "";
                if (
                    Array.isArray(blockage.targetGroups) &&
                    blockage.targetGroups.length > 0
                ) {
                    tgText = formatTargetGroup(
                        blockage.targetGroups[0],
                        lat,
                        lon,
                        berichtGroup.detailUrl,
                        app,
                        languageIsGerman
                    );
                }

                const indication = formatIndicationCode(
                    blockage.indicationCode,
                    lat,
                    lon,
                    berichtGroup.detailUrl,
                    app,
                    languageIsGerman
                );
                let value = blockage.value !== undefined ? String(blockage.value) : "";
                let unitText = "";
                if (blockage.unit) {
                    const valNum = blockage.value ?? 0;
                    if (blockage.unit === "H") {
                        unitText = languageIsGerman
                            ? valNum === 1
                                ? "Stunde"
                                : "Stunden"
                            : valNum === 1
                            ? "hour"
                            : "hours";
                    } else if (blockage.unit === "M") {
                        unitText = languageIsGerman
                            ? valNum === 1
                                ? "Minute"
                                : "Minuten"
                            : valNum === 1
                            ? "minute"
                            : "minutes";
                    } else if (blockage.unit === "D") {
                        unitText = languageIsGerman
                            ? valNum === 1
                                ? "Tag"
                                : "Tage"
                            : valNum === 1
                            ? "day"
                            : "days";
                    } else {
                        unitText = blockage.unit.toLowerCase();
                    }
                }

                const refText = formatReferenceCode(
                    blockage.referenceCode,
                    lat,
                    lon,
                    berichtGroup.detailUrl,
                    app,
                    languageIsGerman
                );
                const extraParts = [];
                if (indication) extraParts.push(indication);
                if (value) extraParts.push(value);
                if (unitText) extraParts.push(unitText);
                if (refText) extraParts.push(refText);

                const extra = extraParts.length ? ` (${extraParts.join(" ")})` : "";

                const interval = getIntervalCode(
                    "interval",
                    blockage.interval,
                    lat,
                    lon,
                    blockage.detailUrl,
                    app,
                    languageIsGerman
                );
                const sameDay = isSameLocalDay(
                    startDateLocal,
                    hasStartTime,
                    endDateLocal,
                    hasEndTime
                );

                let text = "";
                const intervalPrefix =
                    interval && !interval.includes("#") ? " " + interval : "";

                if (!hasEndDate) {
                    text =
                        `${tgText ? " " + tgText : ""} ab ${dateStr}` +
                        intervalPrefix +
                        (hasStartTime && startTime ? " " + startTime : "") +
                        (hasEndTime && endTime ? "-" + endTime : "") +
                        extra;
                } else if (sameDay) {
                    text =
                        `${tgText ? " " + tgText : ""} ${dateStr}` +
                        intervalPrefix +
                        (hasStartTime && startTime ? " " + startTime : "") +
                        (hasEndTime && endTime ? "-" + endTime : "") +
                        extra;
                } else {
                    if (interval !== "") {
                        const dateRange = `${dateStr} – ${endDateStr}`;
                        let timeRange = "";
                        if (hasStartTime && startTime) {
                            timeRange += ` ${startTime}`;
                        }
                        if (hasEndTime && endTime) {
                            timeRange += (timeRange ? "-" : " ") + endTime;
                        }
                        text = `${
                            tgText ? " " + tgText : ""
                        } ${dateRange}${intervalPrefix}${timeRange}${extra}`;
                    } else {
                        text =
                            `${tgText ? " " + tgText : ""} ${dateStr}` +
                            intervalPrefix +
                            (hasStartTime && startTime ? " " + startTime : "") +
                            ` - ${endDateStr}` +
                            (hasEndTime && endTime ? " " + endTime : "") +
                            extra;
                    }
                }
                return `${limitationText}${text.trim()}`;
            })
            .join(", ");

        let result = berichtHeader + blockagesText;
        if (bIndex < berichtValues.length - 1) {
            result += " #";
        }
        return result;
    });

    return texts.join(" ");
}

export { formatDescription };