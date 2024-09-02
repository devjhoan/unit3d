import { formatFileSize, parseTorrentName } from "@/lib/parser";
import { TorrentClient } from "@/modules/TorrentClient";
import { Unit3d } from "@/modules/Unit3d";
import { Emby } from "@/modules/Emby";
import { config } from "@/lib/config";
import { Tmdb } from "@/modules/Tmdb";
import prompts from "prompts";

import {
	StringCategory,
	TrackerCategory,
	type ContentItem,
} from "@/types/unit3d";

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

	public async run() {
		await this.validateConfig();

		const queries = [];
		let addMoreQueries = true;

		while (addMoreQueries) {
			const response = await this.promptQueryType();
			if (!response) {
				console.log("No se proporcionó ninguna consulta de búsqueda");
				return process.exit(1);
			}

			queries.push(response);
			const addMoreResponse = await prompts({
				type: "confirm",
				name: "addMore",
				message: "¿Quieres agregar otra consulta?",
				initial: false,
			});

			addMoreQueries = addMoreResponse.addMore;
		}

		const searchQueries = queries.reduce(
			(acc, query) => Object.assign(acc, query),
			{},
		);

		const search = await this.api.search({
			...searchQueries,
			perPage: 100,
		});

		if (search.length === 0) {
			console.error("No se encontraron torrents en la búsqueda");
			process.exit(1);
		}

		const categoryFilter = await this.promptCategories(search);
		if (!categoryFilter?.category) {
			console.error("No se seleccionaron categorías");
			process.exit(1);
		}

		const responseTorrents = await this.promptTorrents(
			search,
			categoryFilter.category,
		);

		if (!responseTorrents?.torrents) {
			console.error("No se seleccionaron torrents");
			process.exit(1);
		}

		const torrentClient = await this.promptTorrentClient();
		if (torrentClient["torrent-client"] === undefined) {
			console.error("No se seleccionó un cliente de torrent");
			process.exit(1);
		}

		await this.downloadTorrents(
			responseTorrents.torrents,
			search,
			torrentClient["torrent-client"],
		);

		const repeat = await prompts({
			type: "confirm",
			name: "repeat",
			message: "¿Quieres volver a buscar?",
			initial: false,
		});

		if (repeat.repeat) {
			console.clear();
			await this.run();
		}
	}

	private async promptQueryType() {
		const response = await prompts([
			{
				type: "select",
				name: "query-type",
				message: "Selecciona el tipo de consulta",
				choices: [
					{ title: "Nombre", value: "name" },
					{ title: "Año", value: "year" },
					{ title: "Categoría", value: "categories" },
					{ title: "Resolución", value: "resolutions" },
					{ title: "TheMovieDB ID", value: "tmdbId" },
					{ title: "IMDb ID", value: "imdbId" },
					{ title: "TheTVDB ID", value: "tvdbId" },
					{ title: "Descripción", value: "description" },
					{ title: "Uploader", value: "uploader" },
					{ title: "Número de Temporada", value: "seasonNumber" },
					{ title: "Número de Episodio", value: "episodeNumber" },
				],
			},
		]);

		if (!response["query-type"]) return null;
		if (response["query-type"] === "resolutions") {
			const resolution = await prompts({
				min: 1,
				message: "Selecciona una resolución",
				type: "multiselect",
				instructions: false,
				name: "query",
				choices: [
					{ title: "2160p", value: "2" },
					{ title: "1080p", value: "3" },
					{ title: "720p", value: "5" },
					{ title: "540p", value: "7" },
					{ title: "480p", value: "8" },
				],
			});

			return { [response["query-type"]]: resolution.query };
		}

		if (response["query-type"] === "categories") {
			const categories = await prompts({
				min: 1,
				message: "Selecciona las categorías para filtrar",
				type: "multiselect",
				instructions: false,
				name: "query",
				choices: Object.entries(TrackerCategory)
					.filter(([_, value]) => typeof value === "string")
					.map(([key, value]) => ({
						title: `${value}`,
						value: Number(key),
					})),
			});

			if (!categories.query) return null;
			return { [response["query-type"]]: categories.query };
		}

		if (response["query-type"] === "year") {
			const year = await prompts({
				type: "number",
				message: "Ingresa un año",
				name: "query",
			});

			if (!year.query) return null;
			return { startYear: year.query, endYear: year.query };
		}

		const queryResolve = await prompts({
			type: response["query-type"].includes("Id") ? "number" : "text",
			message: "Ingresa una consulta de búsqueda",
			name: "query",
		});

		if (!queryResolve.query) return null;
		return { [response["query-type"]]: queryResolve.query };
	}

	private async promptCategories(
		search: Array<ContentItem>,
	): Promise<{ category: string }> {
		const categories = Array.from(
			new Set(search.map((torrent) => torrent.attributes.category)),
		);

		if (categories.length === 1) {
			return { category: categories[0] };
		}

		return await prompts({
			type: "select",
			name: "category",
			message: "Selecciona las categorías para filtrar",
			instructions: false,
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

		const choices: Array<prompts.Choice> = [];

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

				choices.push({
					title: this.color(
						serie
							? `• ${serie.name} (${year}) ${alreadyExists}`
							: `• ${embySerie?.Name || tmdbId} ${alreadyExists}`,
						"magenta",
					),
					value: `skip-${tmdbId}`,
					disabled: true,
				});

				const seasons = Array.from(
					new Set(
						filteredTorrents
							.filter((torrent) => torrent.attributes.tmdb_id === tmdbId)
							.sort((a, b) => b.attributes.seeders - a.attributes.seeders)
							.sort((a, b) => b.attributes.tmdb_id - a.attributes.tmdb_id)
							.map((torrent) => {
								const season = parseTorrentName(torrent.attributes.name).season;
								return season || "Full";
							}),
					),
				).sort((a, b) => parseInt(a) - parseInt(b));

				for (const season of seasons) {
					const alreadyExists =
						episodes.find(
							(episode) => episode.ParentIndexNumber === Number(season),
						) || "";

					choices.push({
						title: this.color(
							` » Season ${season} ${alreadyExists && "(Ya existe)"}`,
							alreadyExists ? "green" : "blue",
						),
						value: `season-${season}`,
						disabled: true,
					});

					const torrents = filteredTorrents
						.filter((t) => t.attributes.tmdb_id === tmdbId)
						.filter((torrent) => {
							const tSeason = parseTorrentName(torrent.attributes.name).season;
							return tSeason === (season === "Full" ? null : season);
						})
						.sort((a, b) => b.attributes.seeders - a.attributes.seeders)
						.sort((a, b) => b.attributes.tmdb_id - a.attributes.tmdb_id);

					choices.push(
						...torrents.map((torrent) => ({
							title: `  ${this.displayTorrent(torrent)}`,
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

				choices.push({
					title: this.color(
						movie
							? `• ${movie.title} (${movie.release_date.split("-")[0]}) ${embyMovie ? "(Ya existe)" : ""}`
							: `• ${embyMovie?.Name || movieId} ${embyMovie ? "(Ya existe)" : ""}`,
						embyMovie ? "green" : "magenta",
					),
					value: `skip-${movieId}`,
					disabled: true,
				});

				const torrents = filteredTorrents
					.filter((torrent) => torrent.attributes.tmdb_id === movieId)
					.sort((a, b) => b.attributes.seeders - a.attributes.seeders)
					.sort((a, b) => b.attributes.tmdb_id - a.attributes.tmdb_id);

				choices.push(
					...torrents.map((torrent) => {
						const exists = embyMovie?.Path?.endsWith(
							torrent.attributes.files[0].name,
						);

						return {
							title: `${this.displayTorrent(torrent)} ${exists ? "(Ya existe)" : ""}`,
							value: torrent.id,
						};
					}),
				);
			}
		} else if (category === StringCategory.Ebooks) {
			choices.push(
				...filteredTorrents.map((torrent) => ({
					title: this.displayTorrent(torrent),
					value: torrent.id,
				})),
			);
		}

		return await prompts([
			{
				type: "multiselect",
				name: "torrents",
				message: "Selecciona los torrents que deseas descargar",
				min: 1,
				instructions: false,
				optionsPerPage: 25,
				choices: choices,
			},
		]);
	}

	private async promptTorrentClient() {
		if (this.torrentClients.length === 1) {
			return { "torrent-client": 0 };
		}

		return await prompts({
			type: "select",
			name: "torrent-client",
			message: "Selecciona el cliente de torrent que deseas usar",
			choices: [
				...this.torrentClients.map((client) => ({
					title: client.displayName,
					value: this.torrentClients.indexOf(client),
				})),
				{
					title: "Random",
					value: Math.floor(Math.random() * this.torrentClients.length),
				},
			],
		});
	}

	private async downloadTorrents(
		responseTorrents: Array<string>,
		search: Array<ContentItem>,
		torrentClient: number,
	) {
		for (const torrent of responseTorrents) {
			const torrentData = search.find((t) => t.id === torrent);
			const client = this.torrentClients[torrentClient];

			if (!torrentData) {
				console.error(`[-] Torrent no encontrado: ${torrent}`);
				continue;
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
				console.error(
					`[-] Categoría no soportada: ${torrentData.attributes.category}`,
				);
			}
		}
	}

	private async downloadMovie(torrentData: ContentItem, client: TorrentClient) {
		await client.addTorrent({
			torrentUrl: torrentData.attributes.download_link,
			savePath: config.FolderSettings.Movies,
			category: "movies",
		});

		console.log(
			`[✔] ${this.displayTorrent(torrentData, false)} » ${client.displayName}`,
		);
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
		console.log(
			`[✔] ${seasonText} ${this.displayTorrent(torrentData, false)} » ${client.displayName}`,
		);
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
