import type { Episode, ServerItem, ServerItemResponse } from "@/types/emby";

interface EmbyOptions {
	apiUrl: string;
	apiKey: string;
	username: string;
	enabled: boolean;
}

const movieCache = new Map<number, ServerItem>();
const serieCache = new Map<number, ServerItem>();
const episodeCache = new Map<string, Array<Episode>>();
const serverItemsCache = new Map<string, Array<ServerItem>>();

export class Emby {
	private apiUrl: string;
	private apiKey: string;
	private username: string;

	private apiCalls = 0;
	private embyUserId: string | null;
	private enabled: boolean;

	constructor({ apiUrl, apiKey, username, enabled }: EmbyOptions) {
		this.apiUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
		this.username = username;
		this.embyUserId = null;
		this.apiKey = apiKey;
		this.enabled = enabled;
	}

	async getEmbyUserId(): Promise<string> {
		if (this.embyUserId) return this.embyUserId;

		const res = await fetch(`${this.apiUrl}/emby/Users`, {
			method: "GET",
			headers: {
				"X-Emby-Token": this.apiKey,
			},
		});

		const json = (await res.json()) as Array<{ Id: string; Name: string }>;
		this.embyUserId = json.find((u) => u.Name === this.username)?.Id || "";
		this.apiCalls++;

		return this.embyUserId;
	}

	async getMovieByTmdbId(tmdbId: number): Promise<ServerItem | undefined> {
		if (!this.enabled) return undefined;
		if (movieCache.has(tmdbId)) return movieCache.get(tmdbId);

		const items = await this.getServerItems("Movie");
		const item = items.find(
			(item) => item.ProviderIds.Tmdb === tmdbId.toString(),
		);

		if (item) movieCache.set(tmdbId, item);

		return item;
	}

	async getSerieByTmdbId(tmdbId: number): Promise<ServerItem | null> {
		if (!this.enabled) return null;
		if (serieCache.has(tmdbId)) return serieCache.get(tmdbId) || null;

		const items = await this.getServerItems("Series");
		const item = items.find(
			(item) => item.ProviderIds.Tmdb === tmdbId.toString(),
		);

		if (item) serieCache.set(tmdbId, item);
		return item || null;
	}

	async getEpisodesByShowId(
		showId: string | undefined,
	): Promise<Array<Episode>> {
		if (!showId) return [];
		if (episodeCache.has(showId)) return episodeCache.get(showId) || [];

		const res = await fetch(`${this.apiUrl}/emby/Shows/${showId}/Episodes`, {
			method: "GET",
			headers: {
				"X-Emby-Token": this.apiKey,
			},
		});

		const json = (await res.json()) as ServerItemResponse<Episode>;
		episodeCache.set(showId, json?.Items || []);
		this.apiCalls++;

		return json?.Items || [];
	}

	async getServerItems(filter: "Movie" | "Series"): Promise<Array<ServerItem>> {
		if (!this.enabled) return [];
		if (serverItemsCache.has(filter)) return serverItemsCache.get(filter) || [];

		const userId = await this.getEmbyUserId();
		const queryParams = new URLSearchParams({
			SortBy: "SortName",
			SortOrder: "Ascending",
			IncludeItemTypes: filter,
			Recursive: "true",
			StartIndex: "0",
			collapseBoxSetItems: "false",
			Fields: "ProviderIds,Path",
		});

		const res = await fetch(
			`${this.apiUrl}/emby/Users/${userId}/Items?${queryParams}`,
			{
				method: "GET",
				headers: {
					"X-Emby-Token": this.apiKey,
				},
			},
		);

		const json = (await res.json()) as ServerItemResponse;
		this.apiCalls++;

		if (json?.Items) serverItemsCache.set(filter, json.Items);
		return json?.Items || [];
	}

	getApiCalls() {
		return this.apiCalls;
	}
}
