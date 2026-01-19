async function batchPromises(promises, batchSize = 5, delayMs = 100) {
	const results = [];
	for (let i = 0; i < promises.length; i += batchSize) {
		const batch = promises.slice(i, i + batchSize);
		const batchResults = await Promise.all(batch);
		results.push(...batchResults);

		// Kurze Pause zwischen Batches
		if (i + batchSize < promises.length) {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}
	return results;
}


export {
	batchPromises,
};
