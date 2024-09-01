import type {
	Unit3dSearchResult,
	ContentItem,
	QueryParams,
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

	async search(queryParams: QueryParams) {
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
		return torrents.filter((torrent) => torrent.attributes.seeders > 0);
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
