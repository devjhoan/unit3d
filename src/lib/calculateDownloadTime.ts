export function calculateDownloadTime(totalItems: number): number {
	let time = 0;

	const fullBlocks = Math.floor(totalItems / 30);
	const remainingItems = totalItems % 30;

	time += fullBlocks * (30 * 2 + 60);
	time += remainingItems * 2;

	return time / 60;
}
