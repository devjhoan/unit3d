export const queryTypes = [
	{ name: "Nombre", value: "name" },
	{ name: "Año", value: "year" },
	{ name: "Categoría", value: "categories" },
	{ name: "Resolución", value: "resolutions" },
	{ name: "TheMovieDB ID", value: "tmdbId" },
	{ name: "IMDb ID", value: "imdbId" },
	{ name: "TheTVDB ID", value: "tvdbId" },
	{ name: "Tipo de Torrent", value: "types" },
	{ name: "Descripción", value: "description" },
	{ name: "Freeleech %", value: "free" },
	{ name: "Uploader", value: "uploader" },
	{ name: "Filtros Booleanos", value: "filters" },
	{ name: "Número de Temporada", value: "seasonNumber" },
	{ name: "Número de Episodio", value: "episodeNumber" },
	{
		name: "Max Torrents (0 para no limitar [Peligroso])",
		value: "maxTorrents",
	},
	{
		name: "Nombre del Archivo",
		value: "file_name",
	},
];

export const resolutions = [
	{ name: "2160p (4K)", value: "2" },
	{ name: "1080p (FHD)", value: "3" },
	{ name: "720p (HD)", value: "5" },
	{ name: "576p (SD)", value: "6" },
	{ name: "540p (qHD)", value: "7" },
	{ name: "480p (SD)", value: "8" },
	{ name: "480i (SD)", value: "9" },
	{ name: "Other", value: "10" },
	{ name: "No Res", value: "11" },
];

export const freeleech = [
	{ name: "100%", value: "100" },
	{ name: "75%", value: "75" },
	{ name: "50%", value: "50" },
	{ name: "25%", value: "25" },
	{ name: "0%", value: "0" },
];

export const booleanFilters = [
	{ name: "Subida Doble", value: "doubleup" },
	{ name: "Destacado", value: "featured" },
	{ name: "Reembolsable", value: "refundable" },
	{ name: "Optimizado para Stream", value: "stream" },
	{ name: "SD (Standard Definition)", value: "sd" },
	{ name: "Altas Velocidades", value: "highspeed" },
	{ name: "Aporte Interno", value: "internal" },
	{ name: "Lanzamiento Personal", value: "personalRelease" },
	{ name: "Vivo (1 o más seeders)", value: "alive" },
	{ name: "Enfermo (1 seeder y descargado más de 3 veces)", value: "dying" },
	{ name: "Muerto (0 seeders)", value: "dead" },
];

export const trackerTypes = [
	{ name: "Full Disc", value: "1" },
	{ name: "Remux", value: "2" },
	{ name: "Encode", value: "3" },
	{ name: "WEB-DL", value: "4" },
	{ name: "WEB-RIP", value: "5" },
	{ name: "HDTV", value: "6" },
];
