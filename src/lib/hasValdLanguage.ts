// check a string (mediainfo output) and return true if it has a valid language (spanish)
export function hasValidLanguage(mediaInfo: string): boolean {
	const lines = mediaInfo?.split("\n");
	if (!lines) return false;

	const languageLine = lines.filter((line) => line.includes("Language"));

	for (const line of languageLine) {
		if (/Spanish/.test(line)) {
			return true;
		}
	}

	return false;
}
