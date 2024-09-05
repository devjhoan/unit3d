import { config } from "@/lib/config";
import type { Ora } from "ora";

import type {
	Unit3dSearchResult,
	ContentItem,
	QueyParams,
} from "@/types/unit3d";

interface Unit3dOptions {
	apiUrl: string;
	apiKey: string;
}

export class Unit3d {
	private apiUrl: string;
	private apiKey: string;

	constructor({ apiUrl, apiKey }: Unit3dOptions) {
		this.apiUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
		this.apiKey = apiKey;
	}

	async search(queryParams: QueyParams) {
		const response = await this.get<Unit3dSearchResult<ContentItem>>({
			url: "torrents/filter",
			params: {
				...Object.fromEntries(
					Object.entries(queryParams).filter(
						([_, value]) => value !== undefined,
					),
				),
			},
		});

		const torrents = response?.data;
		const filteredTorrents = torrents
			.filter((torrent) => torrent.attributes.seeders > 0)
			.filter((torrent) =>
				config.GeneralSettings.FilterTags.some(
					(tag) =>
						!torrent.attributes.name.toLowerCase().includes(tag.toLowerCase()),
				),
			);

		return {
			torrents: filteredTorrents,
			filteredTorrents: torrents.length - filteredTorrents.length,
		};
	}

	async searchAll(queryParams: QueyParams, spinner: Ora) {
		const torrents: Array<ContentItem> = [];
		let completed = false;
		let nextCursor = "";

		while (!completed) {
			const response = await this.get<Unit3dSearchResult<ContentItem>>({
				url: "torrents/filter",
				params: {
					...queryParams,
					cursor: nextCursor,
					perPage: 100,
				},
			});

			try {
				if (!response?.meta?.next_cursor) {
					completed = true;
				} else {
					nextCursor = response.meta.next_cursor;
				}

				torrents.push(...response.data);
				spinner.text = `Buscando torrents... (${torrents.length})`;
			} catch (error) {
				console.error(error);
				console.error(response);
				spinner.fail("Error al buscar torrents");
			}
		}

		const filteredTorrents = torrents
			.filter((torrent) => torrent.attributes.seeders > 0)
			.filter((torrent) =>
				config.GeneralSettings.FilterTags.some(
					(tag) =>
						!torrent.attributes.name.toLowerCase().includes(tag.toLowerCase()),
				),
			);

		return {
			torrents: filteredTorrents,
			filteredTorrents: torrents.length - filteredTorrents.length,
		};
	}

	private async get<T>({
		url,
		params,
	}: { url: string; params?: Record<string, unknown> }): Promise<T> {
		const queryString = buildQueryString(params || {}, this.apiKey);
		const response = await fetch(`${this.apiUrl}/api/${url}?${queryString}`, {
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
		});

		return response.json();
	}
}

function buildQueryString(params: Record<string, unknown>, apiKey: string) {
	return Object.entries(params || {})
		.map(([key, value]) => {
			if (Array.isArray(value)) {
				return value
					.map(
						(val, index) =>
							`${key}[${index}]=${encodeURIComponent(String(val))}`,
					)
					.join("&");
			}

			return `${key}=${encodeURIComponent(String(value))}`;
		})
		.concat(`api_token=${apiKey}`)
		.join("&");
}
