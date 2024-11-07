import {
	TrackerCategory,
	type QueryParams,
	type QueryTypeValues,
} from "@/types/unit3d";
import {
	booleanFilters,
	freeleech,
	queryTypes,
	resolutions,
	trackerTypes,
} from "./constants";

const multiValueKeys = new Set<QueryTypeValues>([
	"resolutions",
	"categories",
	"types",
]);

const validArgs = new Set<QueryTypeValues>([
	"name",
	"year",
	"categories",
	"resolutions",
	"tmdbId",
	"imdbId",
	"tvdbId",
	"types",
	"description",
	"free",
	"uploader",
	"filters",
	"seasonNumber",
	"episodeNumber",
	"maxTorrents",
	"file_name",
	"perPage",
	"alive",
	"send",
]);

/**
 * Parses CLI arguments from `process.argv` into a `QueryParams` object.
 */
export function parseCLIArgs(version: string): QueryParams {
	const args = process.argv.slice(2);
	const queryParams: QueryParams = {};

	if (!args.length) return queryParams;
	if (args.includes("--help")) {
		console.log(`Unit3d Downloader v${version}`);

		if (!args.includes("--types")) {
			console.log(
				"\nTracker types: usa --types para ver los tipos de torrent disponibles",
			);
		}

		if (!args.includes("--resolutions")) {
			console.log(
				"Resolutions: usa --resolutions para ver las resoluciones disponibles",
			);
		}

		if (!args.includes("--filters")) {
			console.log(
				"Boolean filters: usa --filters para ver los filtros booleanos disponibles",
			);
		}

		if (args.includes("--types")) {
			console.log("\nTracker types:");
			for (const { name, value } of trackerTypes) {
				console.log(`${padRight(name, 15)}\t${value}`);
			}

			return process.exit(0);
		}

		if (args.includes("--filters")) {
			console.log("\nBoolean filters:");
			for (const { name, value } of booleanFilters) {
				console.log(`--${padRight(value, 15)}\t${name}`);
			}

			return process.exit(0);
		}

		if (args.includes("--categories")) {
			console.log("\nCategories:");
			for (const [key, value] of Object.entries(TrackerCategory).filter(
				([_, value]) => !Number.isNaN(Number(value)),
			)) {
				console.log(`${padRight(key, 15)}\t${value}`);
			}

			return process.exit(0);
		}

		console.log("\nGlobal options:");
		console.log("-h, --help\t\tPrint this usage information");
		console.log("-v, --version\t\tPrint the version number");
		console.log("-c, --config\t\tPath to the config file");

		console.log("\nQuery options:");
		for (const { name, value } of queryTypes) {
			console.log(`--${padRight(value, 15)}\t${name}`);
		}

		process.exit(0);
	}

	for (const arg of args) {
		const [key, value] = arg.replace(/^--/, "").split("=") as [
			QueryTypeValues,
			string,
		];

		if (!validArgs.has(key) && !booleanFilters.some((f) => f.value === key)) {
			console.error(
				`${key} no es una clave válida, usa --help para ver las claves válidas`,
			);

			return process.exit(1);
		}

		if (!value && arg !== "--send") {
			console.error(`${key} no puede estar vacío`);
			return process.exit(1);
		}

		if (multiValueKeys.has(key as QueryTypeValues)) {
			queryParams[key as QueryTypeValues] = value.split(",");
		} else {
			queryParams[key as QueryTypeValues] = parseValue(value);
		}

		if (key === "maxTorrents" && Number(value) === 0) {
			console.warn(
				"maxTorrents está configurado en 0, esto puede causar un error si el servidor no soporta esta cantidad de torrents",
			);
		}

		if (key === "types") {
			const selectedTypes = queryParams[key as QueryTypeValues] as string[];

			if (
				!selectedTypes.every((type) =>
					trackerTypes.some((t) => t.value === type),
				)
			) {
				console.error(
					"Alguno de los tipos seleccionados no es válido, usa --help --types para ver los tipos válidos",
				);
				return process.exit(1);
			}

			queryParams[key as QueryTypeValues] = selectedTypes.map(
				(type) => trackerTypes.find((t) => t.value === type)?.name,
			) as string[];
		}

		if (key === "resolutions") {
			const selectedResolutions = queryParams[
				key as QueryTypeValues
			] as string[];

			if (
				!selectedResolutions.every((resolution) =>
					resolutions.some((r) =>
						r.name.toLowerCase().startsWith(resolution.toLowerCase()),
					),
				)
			) {
				console.error(
					"Alguno de las resoluciones seleccionadas no es válida, usa --help para ver las resoluciones válidas",
				);
				return process.exit(1);
			}

			queryParams[key as QueryTypeValues] = selectedResolutions.map(
				(resolution) =>
					resolutions.find((r) =>
						r.name.toLowerCase().startsWith(resolution.toLowerCase()),
					)?.value,
			) as string[];
		}

		if (key === "free") {
			if (!freeleech.some((f) => f.value === value)) {
				console.error(
					"El porcentaje de freeleech seleccionado no es válido, usa --help para ver los porcentajes de freeleech válidos",
				);
				return process.exit(1);
			}
		}

		if (key === "year") {
			// value can be a range or a single year
			// example: 2024 or 2024-2025
			const [startYear, endYear] = value.split("-").map(Number);

			if (
				Number.isNaN(startYear) ||
				startYear < 1900 ||
				startYear > new Date().getFullYear()
			) {
				console.error("Por favor, debes ingresar un año válido.");
				return process.exit(1);
			}

			if (
				Number.isNaN(endYear) ||
				endYear < 1900 ||
				endYear > new Date().getFullYear() ||
				endYear < startYear
			) {
				console.error("Por favor, debes ingresar un año válido.");
				return process.exit(1);
			}

			queryParams["startYear" as QueryTypeValues] = startYear;
			queryParams["endYear" as QueryTypeValues] = endYear ?? startYear;
			// biome-ignore lint/performance/noDelete: <explanation>
			delete queryParams.year;
		}
	}

	if (args.includes("--send")) {
		queryParams.send = true;
	}

	return queryParams;
}

/**
 * Helper function to parse value strings into correct types.
 */
function parseValue(value: string): string | number | boolean {
	if (value === "true") return true;
	if (value === "false") return false;
	if (!Number.isNaN(Number(value))) return Number(value);
	return value;
}

const padRight = (str: string, length: number) =>
	str + " ".repeat(Math.max(0, length - str.length));
