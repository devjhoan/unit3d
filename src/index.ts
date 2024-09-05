import { checkbox, confirm, input, select, Separator } from "@inquirer/prompts";
import { calculateDownloadTime } from "@/lib/calculateDownloadTime";
import { formatFileSize, parseTorrentName } from "@/lib/parser";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { hasValidLanguage } from "@/lib/hasValdLanguage";
import { TorrentClient } from "@/modules/TorrentClient";
import { Unit3d } from "@/modules/Unit3d";
import { Emby } from "@/modules/Emby";
import { config } from "@/lib/config";
import { Tmdb } from "@/modules/Tmdb";
import ora from "ora";

import {
	type ContentItem,
	type QueyParams,
	TrackerCategory,
	StringCategory,
} from "@/types/unit3d";

import {
	booleanFilters,
	freeleech,
	queryTypes,
	resolutions,
	trackerTypes,
} from "@/lib/constants";

class TorrentManager {
	private torrentClients: Array<TorrentClient>;
	private api: Unit3d;
	private tmdb: Tmdb;
	private emby: Emby;

	constructor() {
		this.api = new Unit3d({
			apiUrl: config.GeneralSettings.ApiUrl,
			apiKey: config.GeneralSettings.ApiKey,
		});

		this.tmdb = new Tmdb({
			apiUrl: config.TmdbSettings.ApiUrl,
			apiKey: config.TmdbSettings.ApiKey,
		});

		this.emby = new Emby({
			apiUrl: config.EmbySettings.ApiUrl,
			apiKey: config.EmbySettings.ApiKey,
			username: config.EmbySettings.Username,
			enabled: config.EmbySettings.Enabled,
		});

		this.torrentClients = config.TorrentClients.map(
			(client) =>
				new TorrentClient({
					url: client.Url,
					username: client.Username,
					password: client.Password,
					displayName: client.DisplayName,
				}),
		);
	}

	private async validateConfig() {
		if (!config.GeneralSettings.ApiUrl || !config.GeneralSettings.ApiKey) {
			console.error("La API URL o la API Key no están configuradas");
			process.exit(1);
		}

		if (config.GeneralSettings?.DownloadTorrentsToFolder === undefined) {
			console.error("La opción DownloadTorrentsToFolder no está configurada");
			process.exit(1);
		}

		if (
			config.GeneralSettings.DownloadTorrentsToFolder &&
			!config.GeneralSettings.TorrentsFolder
		) {
			console.error("La carpeta de torrents no está configurada");
			process.exit(1);
		} else {
			const torrentsFolder = config.GeneralSettings.TorrentsFolder;
			if (!existsSync(torrentsFolder)) {
				mkdirSync(torrentsFolder, { recursive: true });
			}
		}

		if (!config.FolderSettings.Movies) {
			console.error("La carpeta de películas no está configurada");
			process.exit(1);
		} else if (config.FolderSettings.Movies.endsWith("/")) {
			config.FolderSettings.Movies = config.FolderSettings.Movies.slice(0, -1);
		}

		if (!config.FolderSettings.TV) {
			console.error("La carpeta de series no está configurada");
			process.exit(1);
		} else if (config.FolderSettings.TV.endsWith("/")) {
			config.FolderSettings.TV = config.FolderSettings.TV.slice(0, -1);
		}

		if (!config.TorrentClients || config.TorrentClients.length === 0) {
			console.error("No se han configurado clientes torrent");
			process.exit(1);
		}

		if (!config.TmdbSettings.ApiUrl || !config.TmdbSettings.ApiKey) {
			console.error("TMDB URL o API Key no están configuradas");
			process.exit(1);
		}

		if (
			(config.EmbySettings.Enabled && !config.EmbySettings.ApiUrl) ||
			!config.EmbySettings.ApiKey ||
			!config.EmbySettings.Username
		) {
			console.error("Emby URL, API Key o Username no están configuradas");
			process.exit(1);
		}

		if (config.EmbySettings.Enabled) {
			const embyUserId = await this.emby.getEmbyUserId();
			if (!embyUserId) {
				console.error("No se pudo establecer la conexión con Emby");
				process.exit(1);
			}
		}

		if (!config.TorrentClients?.length) {
			console.error("Debe configurar al menos un cliente torrent");
			process.exit(1);
		}

		if (!config.GeneralSettings.DownloadTorrentsToFolder) {
			for await (const torrentClient of this.torrentClients) {
				const clientId = await torrentClient.getClientId();

				if (!clientId) {
					console.error(
						`La conexión con ${torrentClient.displayName} no se pudo establecer correctamente`,
					);
					process.exit(1);
				}
			}
		}
	}

	public async run() {
		await this.validateConfig();

		let addMoreQueries = true;
		let queries: QueyParams = {
			alive: true,
		};

		while (addMoreQueries) {
			const response = await this.promptQueryType();
			if (!response) {
				console.error("No se proporcionó ninguna consulta de búsqueda");
				return process.exit(1);
			}

			queries = { ...queries, ...response };
			const addMoreResponse = await confirm({
				message: "¿Quieres agregar otra consulta?",
				default: false,
			});

			addMoreQueries = addMoreResponse;
			if (addMoreResponse) {
				process.stdout.moveCursor(0, -1);
				process.stdout.write("\r\x1b[K");
			}
		}

		const timeStart = performance.now();
		const spinner = ora("Buscando torrents...").start();

		let search: {
			torrents: Array<ContentItem>;
			filteredTorrents: number;
		} = { torrents: [], filteredTorrents: 0 };

		const maxTorrents = Number.isNaN(Number(queries.maxTorrents))
			? 100
			: Number(queries.maxTorrents);

		if (queries.maxTorrents === 0) {
			search = await this.api.searchAll(
				{
					...queries,
					perPage: 100,
				},
				spinner,
			);
		} else {
			search = await this.api.search({
				...queries,
				perPage: maxTorrents,
			});
		}

		const size = search.torrents.reduce(
			(acc, curr) => acc + curr.attributes.size,
			0,
		);

		const takeTime = Math.floor(performance.now() - timeStart);
		const indicator = takeTime < 1000 ? "ms" : "s";
		const time = `${takeTime > 1000 ? (takeTime / 1000).toFixed(2) : takeTime} ${indicator}`;

		spinner.succeed(
			`Se encontraron ${search.torrents.length} (${formatFileSize(size)}) torrents en ${time} (${search.filteredTorrents} torrents filtrados)`,
		);
		spinner.stop();

		if (search.torrents.length === 0) {
			console.error("No se encontraron torrents en la búsqueda");
			process.exit(1);
		}

		const categoryFilter = await this.promptCategories(search.torrents);
		if (!categoryFilter) {
			console.error("No se seleccionaron categorías");
			process.exit(1);
		}

		const responseTorrents = await this.promptTorrents(
			search.torrents,
			categoryFilter,
		);
		if (!responseTorrents) {
			console.error("No se seleccionaron torrents");
			process.exit(1);
		}

		if (config.GeneralSettings.DownloadTorrentsToFolder) {
			await this.downloadTorrentsToFolder(responseTorrents, search.torrents);
		} else {
			const torrentClient = await this.promptTorrentClient(
				responseTorrents,
				search.torrents,
			);
			if (torrentClient === undefined) {
				console.error("No se seleccionó un cliente de torrent");
				process.exit(1);
			}

			await this.downloadTorrents(
				responseTorrents,
				search.torrents,
				torrentClient,
			);
		}

		const repeat = await confirm({
			message: "¿Quieres volver a buscar?",
			default: false,
		});

		if (repeat) {
			console.clear();
			await this.run();
		}
	}

	private async promptQueryType(): Promise<Record<
		string,
		string | Array<string> | boolean
	> | null> {
		const response = await select({
			message: "Selecciona el tipo de consulta",
			choices: queryTypes,
			loop: false,
			pageSize: 15,
		});

		if (!response) return null;
		if (response === "resolutions") {
			const resolution = await checkbox({
				message: "Selecciona una resolución",
				choices: resolutions,
				loop: false,
				pageSize: 15,
				required: true,
			});

			return { resolutions: resolution };
		}

		if (response === "categories") {
			const categories = await select({
				message: "Selecciona las categorías para filtrar",
				loop: false,
				pageSize: 15,
				choices: Object.entries(TrackerCategory)
					.filter(([_, value]) => typeof value === "string")
					.map(([value, name]) => ({
						name: `${name}`,
						value: `${value}`,
					})),
			});

			return { categories: [categories] };
		}

		if (response === "types") {
			const types = await select({
				message: "Selecciona el tipo de torrent",
				choices: trackerTypes,
				loop: false,
				pageSize: 15,
			});

			return { types: [types] };
		}

		if (response === "free") {
			const free = await select({
				message: "Ingresa el porcentaje de freeleech (0-100)",
				choices: freeleech,
				default: "100",
				pageSize: 15,
				loop: false,
			});

			return { free: free };
		}

		if (response === "year") {
			const year = await input({
				message: "Ingresa un año",
				required: true,
				validate: (value) => {
					const year = Number(value);

					if (value.includes("-")) {
						const [startYear, endYear] = value.split("-").map(Number);
						if (Number.isNaN(startYear) || Number.isNaN(endYear)) {
							return "Por favor, ingresa un rango de años válido.";
						}

						if (startYear < 1900 || endYear > new Date().getFullYear()) {
							return "Por favor, ingresa un rango de años válido.";
						}

						return true;
					}

					if (
						Number.isNaN(year) ||
						year < 1900 ||
						year > new Date().getFullYear()
					) {
						return "Por favor, ingresa un año válido.";
					}

					return true;
				},
			});

			if (!year) return null;
			if (year.includes("-")) {
				const [startYear, endYear] = year.split("-");
				return { startYear, endYear };
			}

			return { startYear: year, endYear: year };
		}

		if (response === "maxTorrents") {
			const maxTorrents = await input({
				message: "Ingresa el número máximo de torrents a buscar",
				default: "100",
				validate: (value) => {
					const maxTorrents = Number(value);
					if (Number.isNaN(maxTorrents) || maxTorrents < 0) {
						return "Por favor, ingresa un número válido.";
					}

					return true;
				},
			});

			return { maxTorrents: maxTorrents };
		}

		if (response === "filters") {
			const filters = await checkbox({
				message: "Selecciona los filtros booleanos",
				choices: booleanFilters,
				loop: false,
				pageSize: 15,
			});

			return Object.fromEntries(filters.map((filter) => [filter, true]));
		}

		const queryResolve = await input({
			message: "Ingresa una consulta de búsqueda",
			required: true,
			validate: (value) => {
				if (response.includes("Id") && Number.isNaN(Number(value))) {
					return "Por favor, ingresa un número válido.";
				}

				return true;
			},
		});

		if (!queryResolve) return null;
		return { [response]: queryResolve };
	}

	private async promptCategories(search: Array<ContentItem>): Promise<string> {
		const categories = Array.from(
			new Set(search.map((torrent) => torrent.attributes.category)),
		);

		if (categories.length === 1) {
			return categories[0];
		}

		return await select({
			message: "Selecciona las categorías para filtrar",
			loop: false,
			pageSize: 15,
			choices: categories.map((category) => ({
				title: category,
				value: category,
			})),
		});
	}

	private async promptTorrents(search: Array<ContentItem>, category: string) {
		const filteredTorrents = search.filter((torrent) => {
			return torrent.attributes.category === category;
		});

		const choices = [];

		if (
			category === StringCategory.Series ||
			category === StringCategory.Doramas ||
			category === StringCategory.Telenovelas ||
			category === StringCategory.Anime
		) {
			const seriesIds = Array.from(
				new Set(filteredTorrents.map((torrent) => torrent.attributes.tmdb_id)),
			);

			for (const tmdbId of seriesIds) {
				const serie = await this.tmdb.getSerieById(tmdbId);
				const embySerie = await this.emby.getSerieByTmdbId(tmdbId);

				const year = serie?.first_air_date.split("-")[0];
				const episodes = await this.emby.getEpisodesByShowId(embySerie?.Id);
				const alreadyExists = embySerie ? "(Ya existe)" : "";

				const embySeasons = [
					...new Set(episodes.map((episode) => episode.ParentIndexNumber)),
				];

				const torrents = filteredTorrents
					.filter((torrent) => {
						if (config.GeneralSettings.ShowDownloadedTorrents) return true;
						const { season } = parseTorrentName(torrent.attributes.name);
						return season !== "Full" && !embySeasons.includes(Number(season));
					})
					.filter((torrent) => torrent.attributes.tmdb_id === tmdbId)
					.sort((a, b) => b.attributes.seeders - a.attributes.seeders)
					.sort((a, b) => b.attributes.tmdb_id - a.attributes.tmdb_id);

				if (torrents.length === 0) {
					continue;
				}

				choices.push(
					new Separator(
						this.color(
							serie
								? `• ${serie.name} (${year}) ${alreadyExists}`
								: `• ${embySerie?.Name || tmdbId} ${alreadyExists}`,
							"magenta",
						),
					),
				);

				const seasons = Array.from(
					new Set(
						torrents
							.filter((torrent) => torrent.attributes.tmdb_id === tmdbId)
							.map((torrent) => {
								const season = parseTorrentName(torrent.attributes.name).season;
								return season || "Full";
							}),
					),
				).sort((a, b) => parseInt(a) - parseInt(b));

				for (const season of seasons) {
					choices.push(
						new Separator(
							this.color(
								` » Season ${season} ${alreadyExists && "(Ya existe)"}`,
								alreadyExists ? "green" : "blue",
							),
						),
					);

					const seasonTorrents = torrents
						.filter((t) => t.attributes.tmdb_id === tmdbId)
						.filter((torrent) => {
							const tSeason = parseTorrentName(torrent.attributes.name).season;
							return tSeason === (season === "Full" ? null : season);
						});

					choices.push(
						...seasonTorrents.map((torrent) => ({
							name: `  ${this.displayTorrent(torrent)} ${hasValidLanguage(torrent.attributes?.media_info) ? "" : "(Subs no válidas)"}`,
							value: torrent.id,
						})),
					);
				}
			}
		} else if (category === StringCategory.Peliculas) {
			const moviesIds = Array.from(
				new Set(filteredTorrents.map((torrent) => torrent.attributes.tmdb_id)),
			);

			for (const movieId of moviesIds) {
				const movie = await this.tmdb.getMovieById(movieId);
				const embyMovie = await this.emby.getMovieByTmdbId(movieId);

				const title = movie
					? `${movie.title} (${movie.release_date.split("-")[0]})`
					: `${embyMovie?.Name || movieId}`;

				const torrents = filteredTorrents
					.filter(() => {
						if (config.GeneralSettings.ShowDownloadedTorrents) return true;
						return !embyMovie;
					})
					.filter((torrent) => torrent.attributes.tmdb_id === movieId)
					.sort((a, b) => b.attributes.seeders - a.attributes.seeders)
					.sort((a, b) => b.attributes.tmdb_id - a.attributes.tmdb_id);

				if (torrents.length === 0) {
					continue;
				}

				choices.push(
					new Separator(
						this.color(
							`• ${title} ${embyMovie ? "(Ya existe)" : ""}`,
							embyMovie ? "green" : "magenta",
						),
					),
				);

				choices.push(
					...torrents.map((torrent) => {
						const validLanguage = hasValidLanguage(
							torrent.attributes?.media_info,
						);
						const exists = embyMovie?.Path?.endsWith(
							torrent.attributes.files[0].name,
						);

						return {
							name: `${this.displayTorrent(torrent)} ${exists ? "(Ya existe)" : ""} ${validLanguage ? "" : "(Subs no válidas)"}`,
							value: torrent.id,
						};
					}),
				);
			}
		} else {
			choices.push(
				...filteredTorrents.map((torrent) => ({
					name: this.displayTorrent(torrent),
					value: torrent.id,
				})),
			);
		}

		if (choices.length === 0) {
			console.error(
				"No se encontraron torrents, esto puede ser debido a que no se encontraron torrents vivos (con seeders) o que los torrents fueron filtrados por tags.",
			);
			process.exit(1);
		}

		return await checkbox({
			message: "Selecciona los torrents que deseas descargar",
			choices: choices,
			pageSize: 25,
			required: true,
			theme: {
				helpMode: "always",
				style: {
					renderSelectedChoices: (
						selectedChoices: Array<{ name: string; value: string }>,
					) => {
						return selectedChoices.map((choice) => choice.value).join(", ");
					},
				},
			},
			loop: false,
			validate: (value) => {
				if (value.length === 0) {
					return "Debes seleccionar al menos un torrent";
				}

				return true;
			},
		});
	}

	private async promptTorrentClient(
		search: Array<string>,
		torrents: Array<ContentItem>,
	) {
		const filteredTorrents = torrents.filter((torrent) =>
			search.includes(torrent.id),
		);

		if (this.torrentClients.length === 1) return 0;
		const size = filteredTorrents.reduce(
			(acc, curr) => acc + curr.attributes.size,
			0,
		);

		const hint = `Usted esta a punto de descargar ${filteredTorrents.length} torrents con un tamaño total de (${formatFileSize(size)})`;
		return await select({
			message: "Selecciona el cliente de torrent que deseas usar",
			default: 0,
			loop: false,
			choices: [
				...this.torrentClients.map((client) => ({
					name: client.displayName,
					value: this.torrentClients.indexOf(client),
					description: hint,
				})),
				{
					name: "Random",
					value: Math.floor(Math.random() * this.torrentClients.length),
					description: hint,
				},
			],
		});
	}

	private async downloadTorrents(
		responseTorrents: Array<string>,
		search: Array<ContentItem>,
		torrentClient: number,
	) {
		let torrentCount = 0;
		const filteredTorrents = search.filter((torrent) =>
			responseTorrents.includes(torrent.id),
		);

		if (filteredTorrents.length > 30) {
			console.log(
				"[!] Se descargarán más de 30 torrents, esto puede tardar un tiempo debido a la limitación del tracker.",
			);

			console.log(
				`[!] Tiempo estimado: ${calculateDownloadTime(filteredTorrents.length)} minutos`,
			);
		}

		for (const torrent of responseTorrents) {
			const torrentData = filteredTorrents.find((t) => t.id === torrent);
			const client = this.torrentClients[torrentClient];

			if (!torrentData) {
				console.error(`[-] Torrent no encontrado: ${torrent}`);
				continue;
			}

			if (torrentCount > 30) {
				console.error(
					"[!] Se ha excedido el límite de descargas, esperando 1 minuto para seguir...",
				);

				await new Promise((resolve) => setTimeout(resolve, 60000));
				torrentCount = 0;
			}

			if (torrentData.attributes.category === StringCategory.Peliculas) {
				await this.downloadMovie(torrentData, client);
			} else if (
				torrentData.attributes.category === StringCategory.Series ||
				torrentData.attributes.category === StringCategory.Doramas ||
				torrentData.attributes.category === StringCategory.Telenovelas ||
				torrentData.attributes.category === StringCategory.Anime
			) {
				await this.downloadSeries(torrentData, client);
			} else {
				const downloadFolder =
					config.FolderSettings[torrentData.attributes.category];

				if (!downloadFolder) {
					console.error(
						`[-] Categoria no encontrada: ${torrentData.attributes.category}`,
					);
					continue;
				}

				await client.addTorrent({
					torrentUrl: torrentData.attributes.download_link,
					savePath: downloadFolder,
					category: torrentData.attributes.category,
				});
			}

			torrentCount++;
		}
	}

	private async downloadTorrentsToFolder(
		responseTorrents: Array<string>,
		search: Array<ContentItem>,
	) {
		const torrentsFolder = config.GeneralSettings.TorrentsFolder;
		const filteredTorrents = search.filter((torrent) =>
			responseTorrents.includes(torrent.id),
		);

		if (filteredTorrents.length > 30) {
			console.log(
				"[!] Se descargarán más de 30 torrents, esto puede tardar un tiempo debido a la limitación del tracker.",
			);

			console.log(
				`[!] Tiempo estimado: ${calculateDownloadTime(filteredTorrents.length)} minutos`,
			);
		}

		for (const torrent of responseTorrents) {
			const torrentData = filteredTorrents.find((t) => t.id === torrent);
			if (!torrentData) {
				console.error(`[-] Torrent no encontrado: ${torrent}`);
				continue;
			}

			let response = await fetch(torrentData.attributes.download_link);
			if (response.status === 429) {
				console.error(
					"[!] Se ha excedido el límite de descargas, esperando 1 minuto para seguir...",
				);

				await new Promise((resolve) => setTimeout(resolve, 60000));
				response = await fetch(torrentData.attributes.download_link);
			}

			const buffer = Buffer.from(await response.arrayBuffer());
			const invalidCharactersRegex = /[<>:"/\\|?*]/g;

			const fileName = torrentData.attributes.name.replace(
				invalidCharactersRegex,
				"",
			);

			const filePath = `${torrentsFolder}/${fileName}.torrent`;
			writeFileSync(filePath, buffer);

			console.log(`[✔] ${fileName} » ${filePath}`);
		}
	}

	private async downloadMovie(torrentData: ContentItem, client: TorrentClient) {
		await client.addTorrent({
			torrentUrl: torrentData.attributes.download_link,
			savePath: config.FolderSettings.Movies,
			category: "movies",
		});

		console.log(`[✔] ${this.displayTorrent(torrentData, false)}`);
	}

	private async downloadSeries(
		torrentData: ContentItem,
		client: TorrentClient,
	) {
		const { season, episode } = parseTorrentName(torrentData.attributes.name);
		const serie = await this.tmdb.getSerieById(torrentData.attributes.tmdb_id);
		if (!serie) {
			return console.error(
				`[-] (${torrentData.attributes.tmdb_id}) Serie no encontrada: ${torrentData.attributes.name}`,
			);
		}

		const year = serie.first_air_date.split("-")[0];
		const path = `${config.FolderSettings.TV}/${serie.name} (${year})`;

		if (season?.includes("-")) {
			await client.addTorrent({
				torrentUrl: torrentData.attributes.download_link,
				savePath: config.FolderSettings.TV,
				category: "series",
			});
		} else if (season && episode) {
			await client.addTorrent({
				torrentUrl: torrentData.attributes.download_link,
				savePath: `${path}/Season ${season}`,
				category: "series",
			});
		} else {
			await client.addTorrent({
				torrentUrl: torrentData.attributes.download_link,
				savePath: path,
				category: "series",
			});
		}

		const seasonText = `${season ? `(S${season}` : ""}${episode ? `E${episode})` : ")"}`;
		console.log(`[✔] ${seasonText} ${this.displayTorrent(torrentData, false)}`);
	}

	displayTorrent(torrentData: ContentItem, displaySeeders = true) {
		const size = `[${formatFileSize(torrentData.attributes.size)}]`;
		const seeders = displaySeeders
			? `[🌱 ${torrentData.attributes.seeders.toString().padStart(2)}] `
			: "";

		return `${seeders}${size} » ${torrentData.attributes.name}`;
	}

	color(message: string, color: "magenta" | "blue" | "green") {
		const colorCodes = {
			magenta: "\x1b[35m",
			blue: "\x1b[34m",
			green: "\x1b[32m",
		};

		return `\x1b[0m${colorCodes[color]}${message}\x1b[0m`;
	}
}

const manager = new TorrentManager();
manager.run();
