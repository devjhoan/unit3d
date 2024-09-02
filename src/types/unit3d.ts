export interface Unit3dSearchResult<T> {
	data: Array<T>;
}

export interface ContentItem {
	type: string;
	id: string;
	attributes: Attributes;
}

export enum TrackerCategory {
	Peliculas = 1,
	Series = 2,
	Anime = 5,
	Doramas = 20,
	Telenovelas = 8,
	Ebooks = 18,
}

export enum StringCategory {
	Peliculas = "Peliculas",
	Series = "TV Series",
	Anime = "Anime",
	Doramas = "Doramas & Turcas",
	Telenovelas = "Telenovelas",
	Ebooks = "Ebooks",
}

export interface QueryParams {
	// torrent name
	name?: string;
	// torrent description
	description?: string;
	// torrent uploader
	uploader?: string;
	// torrent category
	categories?: Array<TrackerCategory>;
	// torrent TMDB ID
	tmdbId?: number;
	// torrent IMDB ID
	imdbId?: string;
	// torrent TVDB ID
	tvdbId?: number;
	// amount of results to return per page
	perPage?: number;
	// page number
	page?: number;
	// sort field
	sortField?: string;
	// sort direction
	sortDirection?: "asc" | "desc";
	// torrent resolution
	resolutions?: Array<string>;
	// torrent type
	types?: Array<string>;
	// torrent genre
	genres?: Array<string>;
	// torrent season number
	seasonNumber?: number;
	// torrent episode number
	episodeNumber?: number;
	// torrent freeleech discount
	free?: number;
	// torrent double upload
	doubleup?: boolean;
	// torrent featured
	featured?: boolean;
	// torrent refundable
	refundable?: boolean;
	// torrent stream
	stream?: boolean;
	// torrent SD
	sd?: boolean;
	// torrent highspeed
	highspeed?: boolean;
	// torrent internal
	internal?: boolean;
}

interface Attributes {
	meta: Meta;
	name: string;
	release_year: string;
	category: string;
	type: string;
	resolution: string;
	media_info: string;
	bd_info: null;
	description: string;
	info_hash: string;
	size: number;
	num_file: number;
	files: Array<File>;
	freeleech: string;
	double_upload: boolean;
	refundable: boolean;
	internal: number;
	featured: boolean;
	personal_release: number;
	uploader: string;
	seeders: number;
	leechers: number;
	times_completed: number;
	tmdb_id: number;
	imdb_id: number;
	tvdb_id: number;
	mal_id: number;
	igdb_id: number;
	category_id: number;
	type_id: number;
	resolution_id: number;
	created_at: Date;
	download_link: string;
	details_link: string;
}

interface File {
	index: number;
	name: string;
	size: number;
}

interface Meta {
	poster: string;
	genres: string;
}
