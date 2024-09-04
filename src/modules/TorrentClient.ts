import {
	type TorrentAddParameters,
	qBittorrentClient,
} from "@robertklep/qbittorrent";

interface TorrentClientOptions {
	url: string;
	username: string;
	password: string;
	displayName: string;
}

interface TorrentAddParams {
	torrentUrl: string;
	savePath: string;
	category: string;
}

export class TorrentClient {
	private client: qBittorrentClient;
	public displayName: string;

	constructor({ url, username, password, displayName }: TorrentClientOptions) {
		this.client = new qBittorrentClient(url, username, password);
		this.displayName = displayName;
	}

	async addTorrent({ torrentUrl, savePath, category }: TorrentAddParams) {
		await this.client.torrents.add({
			paused: false,
			savepath: savePath,
			category: category,
			urls: [torrentUrl],
		} as TorrentAddParameters);
	}

	async getCategories() {
		return await this.client.torrents.categories();
	}

	async getClientId(): Promise<string | null> {
		try {
			return await this.client.app.version();
		} catch (error) {
			console.error(error);
			return null;
		}
	}
}
