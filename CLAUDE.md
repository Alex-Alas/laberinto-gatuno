# Laberinto Gatuno — entorno de desarrollo

- **Versionado y desarrollo:** este repo en GitHub ([Alex-Alas/laberinto-gatuno](https://github.com/Alex-Alas/laberinto-gatuno)), trabajado con Claude Code. Commits normales, sin CI.
- **Hosting/compartir:** `index.html` se publica como Claude Artifact (no en GitHub Pages ni otro host). Por eso tiene que seguir siendo un único archivo HTML autocontenido — sin imports externos, sprites/audio/CSS/JS todo embebido inline. No lo dividas en múltiples archivos ni le agregues un build step.
- Flujo al terminar un cambio: correr `node test.js`, commitear/pushear a GitHub, y volver a publicar `index.html` como Artifact para que se vea reflejado en el link compartido.
