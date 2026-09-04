# Laberinto Gatuno — entorno de desarrollo

- **Versionado y desarrollo:** este repo en GitHub ([Alex-Alas/laberinto-gatuno](https://github.com/Alex-Alas/laberinto-gatuno)), trabajado con Claude Code. Commits normales, sin CI.
- **Hosting/compartir:** GitHub Pages, servido desde la raíz de `main` — <https://alex-alas.github.io/laberinto-gatuno/>. Publica solo con cada push a `main`; no hay build step ni bundler.
- **Estructura:** `index.html` (markup), `style.css`, `game.js` y `assets/` (sprites, gifs y mp3). Todo estático y sin dependencias: `game.js` se carga con un `<script src>` clásico al final del body, así que abrir `index.html` con doble clic también funciona.
- Flujo al terminar un cambio: correr `node test.js` y commitear/pushear a GitHub.
