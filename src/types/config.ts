interface GeneralSettings {
	ApiUrl: string;
	ApiKey: string;
	FilterTags: Array<string>;
	DownloadTorrentsToFolder: boolean;
	TorrentsFolder: string;
}

interface FolderSettings {
	[key: string]: string;
	Movies: string;
	TV: string;
}

interface TorrentClient {
	Url: string;
	DisplayName: string;
	Username: string;
	Password: string;
}

interface TmdbSettings {
	ApiUrl: string;
	ApiKey: string;
}

interface EmbySettings {
	Enabled: boolean;
	ApiUrl: string;
	ApiKey: string;
	Username: string;
}

export interface Config {
	GeneralSettings: GeneralSettings;
	FolderSettings: FolderSettings;
	TorrentClients: Array<TorrentClient>;
	TmdbSettings: TmdbSettings;
	EmbySettings: EmbySettings;
}
