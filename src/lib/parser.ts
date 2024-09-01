const UNITS = ["bytes", "KiB", "MiB", "GiB", "TiB", "PiB"];

export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 bytes";

	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	const size = bytes / 1024 ** i;

	return `${size.toFixed(2).padStart(5)} ${UNITS[i]}`;
}

export function parseTorrentName(torrentName: string) {
	const multiSeasonRegex = /S(\d{2})-S(\d{2})/i;
	if (multiSeasonRegex.test(torrentName)) {
		const match = torrentName.match(multiSeasonRegex);
		if (match) {
			const season = `${match[1]}-${match[2]}`;
			return { season, episode: null };
		}
	}

	const regex = /S(\d{2})(?:E(\d{2}))?/i;
	const match = torrentName.match(regex);

	if (match) {
		const season = match[1].padStart(2, "0");
		const episode = match[2] ? match[2].padStart(2, "0") : null;
		return { season, episode };
	}

	return { season: null, episode: null };
}

export function getMostRepeatedTitle(titles: string[]): string {
	const titleCounts = new Map<string, number>();
	let maxCount = 0;
	let mostRepeatedTitle = "";

	for (const title of titles) {
		const words = title.split(" ");
		for (const word of words) {
			const count = (titleCounts.get(word) || 0) + 1;
			titleCounts.set(word, count);
			if (count > maxCount) {
				maxCount = count;
				mostRepeatedTitle = word;
			}
		}
	}

	return mostRepeatedTitle;
}
