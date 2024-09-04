import { queryTypes } from "@/lib/constants";

export interface Unit3dSearchResult<T> {
	data: Array<T>;
	meta: {
		path: string;
		per_page: number;
		next_cursor: string | null;
		prev_cursor: string | null;
	};
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
	Ebooks = "E-Books",
}

export enum TrackerTypes {
	FullDisc = 1,
	Remux = 2,
	Encode = 3,
	WebDl = 4,
	WebRip = 5,
	HDTV = 6,
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

const extendedQuerys = [
	...queryTypes,
	{
		name: "perPage",
		value: "perPage",
	},
] as const;

type QueryTypeValues = (typeof extendedQuerys)[number]["value"];
export type QueyParams = Partial<{
	[K in QueryTypeValues]: string | string[] | number;
}>;
