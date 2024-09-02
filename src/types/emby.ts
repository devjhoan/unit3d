export interface ServerItemResponse<T = ServerItem> {
	Items: Array<T>;
	TotalRecordCount: number;
}

export interface ServerItem {
	Name: string;
	ServerId: string;
	Path: string;
	Id: string;
	RunTimeTicks?: number;
	IsFolder: boolean;
	Type: "Movie" | "Series";
	UserData: {
		PlaybackPositionTicks: number;
		PlayCount: number;
		IsFavorite: boolean;
		Played: boolean;
		UnplayedItemCount?: number;
	};
	ProviderIds: {
		Tmdb: string;
	};
	ImageTags: {
		Primary: string;
		Logo?: string;
		Thumb?: string;
		Art?: string;
		Banner?: string;
	};
	BackdropImageTags: string[];
	MediaType?: string;
	AirDays?: Array<string>;
}

export interface Episode {
	Name: string;
	ServerId: string;
	Id: string;
	PremiereDate: Date;
	RunTimeTicks: number;
	IndexNumber: number; // Episode number
	ParentIndexNumber: number; // Season number
	IsFolder: boolean;
	Type: string;
	ParentLogoItemId: string;
	ParentBackdropItemId: string;
	ParentBackdropImageTags: string[];
	SeriesName: string;
	SeriesId: string;
	SeasonId: string;
	SeriesPrimaryImageTag: string;
	SeasonName: string;
	ImageTags: {
		Primary: string;
	};
	ParentLogoImageTag: string;
	ParentThumbItemId: string;
	ParentThumbImageTag: string;
	MediaType: string;
}
