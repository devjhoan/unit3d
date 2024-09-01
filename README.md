# 🎠 Unit3d Torrent Downloader

<p>
  <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white" />
	<img src="https://img.shields.io/badge/Bun-%23000000.svg?style=flat&logo=bun&logoColor=white" />
	<img src="https://img.shields.io/badge/qBitorrrent-2F67BA?style=flat&logo=qbittorrent&logoColor=white" />
	<img src="https://img.shields.io/badge/Emby-52B54B?style=flat&logo=emby&logoColor=white" />
	<img src="https://img.shields.io/badge/The%20Movie%20Database-darkcyan?style=flat&logo=themoviedatabase&logoColor=white" />
</p>

Una simple aplicación de terminal para descargar torrents de trackers privados (usando **Unit3d**) basado en la calidad del torrent y el tamaño del archivo.

- Si encuentras algún error o tienes alguna sugerencia, por favor, abre un [issue](https://github.com/devjhoan/unit3d/issues).
- No olvides darle ⭐️ al repositorio si te sirvió de alguna forma.

# 📚 Caracteristicas

- [x] Filtros de búsqueda (Resolución, Uploader, TmdbId, ImdbId, etc)
- [x] Descarga de torrents automática (usando qBittorrent)
- [x] Mensaje de notificación si ya tienes la serie/pelicula descargada (usando Emby)
- [x] Soporte para descargar peliculas, series (season pack y single episodes)

# 🧩 Requisitos

- Bun (https://bun.sh)
- qBittorrent Client (https://qbittorrent.org)
- Emby (https://emby.media) (opcional, usado para notificaciones)

# 🚀 Instalación

-	**1.** Clona el repositorio

```bash
git clone https://github.com/devjhoan/unit3d.git
```

- **2.** Instala las dependencias

```bash
bun install
```

- **3.** Ejecuta el script

```bash
bun run src/index.ts
```

# 📚 Configuración

La configuración se encuentra en el archivo `config.yml`, puedes modificar los valores según tus necesidades.