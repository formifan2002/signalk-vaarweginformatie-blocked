function calculateDistance(lat1, lon1, lat2, lon2) {
	const R = 6371000; // meters
	const φ1 = (lat1 * Math.PI) / 180;
	const φ2 = (lat2 * Math.PI) / 180;
	const Δφ = ((lat2 - lat1) * Math.PI) / 180;
	const Δλ = ((lon2 - lon1) * Math.PI) / 180;

	const a =
		Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
		Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return R * c;
}

function calculateRouteDistance(coordinates) {
    let totalDistance = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
        const [lon1, lat1] = coordinates[i];
        const [lon2, lat2] = coordinates[i + 1];
        totalDistance += calculateDistance(lat1, lon1, lat2, lon2);
    }
    return Math.round(totalDistance);
}

function movePointEast(lat, lon, meters) {
    const latRad = (lat * Math.PI) / 180;
    const metersPerDegree = 111320 * Math.cos(latRad);
    const deltaLon = meters / metersPerDegree;
    return [lat, lon + deltaLon];
}

function positionToBbox(position, distanceMeters) {
    const nwCoords = calculateNewPosition(
        position[0],
        position[1],
        -45,
        distanceMeters / 1000
    );
    const seCoords = calculateNewPosition(
        position[0],
        position[1],
        135,
        distanceMeters / 1000
    );

    return [
        nwCoords.longitude,
        nwCoords.latitude,
        seCoords.longitude,
        seCoords.latitude,
    ];
}

function calculateNewPosition(longitude, latitude, bearing, distanceKms) {
    const earthRadius = 6371;
    const latitudeRad = toRadians(latitude);
    const longitudeRad = toRadians(longitude);
    const bearingRad = toRadians(bearing);

    const newLatitudeRad = Math.asin(
        Math.sin(latitudeRad) * Math.cos(distanceKms / earthRadius) +
            Math.cos(latitudeRad) *
                Math.sin(distanceKms / earthRadius) *
                Math.cos(bearingRad)
    );

    const newLongitudeRad =
        longitudeRad +
        Math.atan2(
            Math.sin(bearingRad) *
                Math.sin(distanceKms / earthRadius) *
                Math.cos(latitudeRad),
            Math.cos(distanceKms / earthRadius) -
                Math.sin(latitudeRad) * Math.sin(newLatitudeRad)
        );

    const newLatitude = toDegrees(newLatitudeRad);
    const newLongitude = toDegrees(newLongitudeRad);

    return { latitude: newLatitude, longitude: newLongitude };
}

function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
}

function toDegrees(radians) {
    return (radians * 180) / Math.PI;
}

function isInBbox(lat, lon, bbox) {
    const [nwLon, nwLat, seLon, seLat] = bbox;

    const withinLon = lon >= nwLon && lon <= seLon;
    const withinLat = lat <= nwLat && lat >= seLat;

    return withinLon && withinLat;
}

export {
    calculateDistance,
    calculateRouteDistance,
    movePointEast,
    positionToBbox,
    calculateNewPosition,
    toRadians,
    toDegrees,
    isInBbox,
};