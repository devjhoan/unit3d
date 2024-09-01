import type { TmdbSerie, TmdbMovie } from "@/types/tmdb";

interface TmdbOptions {
	apiUrl: string;
	apiKey: string;
}

const moviesCache = new Map<number, TmdbMovie>();
const seriesCache = new Map<number, TmdbSerie>();

export class Tmdb {
	private apiUrl: string;
	private apiKey: string;
	private apiCalls = 0;

	constructor({ apiUrl, apiKey }: TmdbOptions) {
		this.apiUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
		this.apiKey = apiKey;
	}

	async getSerieById(tmdbId: number): Promise<TmdbSerie | null> {
		if (seriesCache.has(tmdbId)) {
			return seriesCache.get(tmdbId) as TmdbSerie;
		}

		const response = await fetch(
			`${this.apiUrl}/tv/${tmdbId}?api_key=${this.apiKey}&language=en-US`,
		);

		const data = await response.json();
		if (data.success === false) {
			return null;
		}

		seriesCache.set(tmdbId, data as TmdbSerie);
		this.apiCalls++;

		return data as TmdbSerie;
	}

	async getMovieById(tmdbId: number): Promise<TmdbMovie | null> {
		if (moviesCache.has(tmdbId)) {
			return moviesCache.get(tmdbId) as TmdbMovie;
		}

		const response = await fetch(
			`${this.apiUrl}/movie/${tmdbId}?api_key=${this.apiKey}&language=en-US`,
		);

		const data = await response.json();
		if (data.success === false) {
			return null;
		}

		moviesCache.set(tmdbId, data as TmdbMovie);
		this.apiCalls++;

		return data as TmdbMovie;
	}

	getApiCalls() {
		return this.apiCalls;
	}
}
