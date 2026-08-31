# Laberinto Gatuno

Speedrun de laberinto donde no te movés con flechas: cada salida abierta de tu celda
muestra una letra y tecleás la que corresponde a la dirección que querés tomar.
Un solo archivo HTML, sin dependencias — sprites, música y efectos van embebidos.

**Jugar:** abrí `index.html` en cualquier navegador. En el teléfono, tocá el laberinto
o el botón **TECLADO** para abrir el teclado del sistema.

Al cargar se abre un tutorial con la mecánica dibujada (los sprites del propio juego, un
anillo de tiempo animado y los chips de letra). Se cierra con **JUGAR**, tocando afuera o
con la primera tecla, y se reabre con **? CÓMO SE JUEGA**. La línea de controles cambia
sola entre escritorio y teléfono con `@media (pointer:coarse)`.

## Reglas

- Juntá las 5 monedas y llegá al cuadro verde. **La salida está cerrada hasta la quinta
  moneda**: hasta entonces se dibuja roja y con el candado cerrado, y el encabezado dice
  cuántas faltan. Al juntarlas se pone verde, el candado se abre y salta un cartel
  `SALIDA DESBLOQUEADA` con su arpegio. Era la regla que más gente no entendía.
- El anillo alrededor del jugador es tu ventana de reacción: arranca en 1.7 s y se
  encoge 70 ms por cada punto de combo. Si se agota: +0.4 s de penalización y combo a cero.
- Letra equivocada: +0.6 s y combo a cero. Cualquier error te devuelve **un paso**
  por el camino que recorriste.
- Responder en menos de 350 ms descuenta tiempo, topado para que el neto nunca baje
  del 75% del tiempo real.
- Dos gatos oscuros te persiguen. Al alcanzarte se abre un QTE: tecleás la secuencia
  completa antes de que se acabe la barra. Fallarlo cuesta +2 s y **3 pasos atrás**.

## Dificultad

Escala con las monedas recogidas (`got`, 0 a 5):

| | 0 monedas | 5 monedas |
|---|---|---|
| Paso de los enemigos | 750 ms | 300 ms |
| Probabilidad de persecución | 70% | 95% |
| Letras del QTE | 3 | 8 |

El QTE siempre da 700 ms por letra, así que crece en largo, no en presión por tecla.
A las 3 monedas aparece un tercer gato.

## Combo y sonido

Barra debajo del encabezado: llena de 0 a `COMBO_MAX` (15, que es donde la ventana de
reacción toca su piso de 650 ms) y cambia de tramo por color — cian, amarillo, naranja y
rosa en MAX. Da un saltito en cada acierto (`cpop`, decae al 88% por cuadro).

Los efectos son osciladores de WebAudio, no más mp3 embebidos: el acierto es un blip de
55 ms que **sube un semitono por punto de combo** (tope a los 12, para que no se vuelva
chillón), el error un buzz descendente de sawtooth, el "tarde" uno más suave, la moneda
dos notas y el desbloqueo un arpegio de cuatro. Todo entre 0.04 y 0.08 de ganancia para
que no canse. El botón **MUSICA** silencia también los efectos. Sin WebAudio disponible,
`sfx()` no hace nada y el juego sigue igual.

## Extra vibes

Botón que cambia la música por `Before_the_Iron_Bell` (120 BPM) y pone a latir parte de
la interfaz: el encabezado, el medidor de combo, el resplandor del canvas y el de las
paredes. Es **sólo visual** — no toca la dificultad, ni el reloj, ni la IA.

La fase sale de `VIBE.currentTime`, no de un timer aparte, así que la imagen no se puede
desincronizar del audio (ni siquiera al loopear). `bopAt()` es `(1 - fase)^1.8`: golpe
seco en el beat y caída suave hasta el siguiente.

El bombo del mp3 **no cae en 0**. Filtrando el archivo con un lowpass de 120 Hz y buscando
el offset que maximiza el flujo espectral sobre la rejilla de 0.5 s, la grilla real es
`0.174 s + n·0.5` (3.5x más marcada que cualquier otra fase). De ahí sale
`VIBE_OFF = .326`, que es la perilla a mover si alguna vez se cambia el archivo.

## Baby mode

Si tu precisión cae debajo del 80% (con al menos 12 teclas de muestra), el juego se
pausa —el cronómetro también— y ofrece más tiempo de reacción a cambio de un baby point.
Cada punto suma 35% a la ventana y a la duración del QTE. Cualquiera sea la respuesta,
no vuelve a preguntar hasta 25 teclas después, para no spamear.

## Rendimiento en móvil

Todo lo que degrada algo visible vive detrás de un solo flag, `MOBILE`
(`matchMedia('(pointer:coarse)')`, con el user-agent de respaldo), que arma el objeto
`PERF`. En escritorio `PERF` deja los valores viejos y el canvas sale **pixel por pixel
igual que antes** — hay un test que lo compara. Los números de dificultad no los toca
ningún perfil.

| | escritorio | teléfono |
|---|---|---|
| `bake` — paredes cacheadas | no | sí |
| `glow` — factor de `shadowBlur` | 1 | 0.5 |
| `scan` — scanlines en el canvas | sí | las pinta el CSS |
| `dust` — partículas por chispazo | 100% | 60% |
| `hudMs` — refresco del reloj | cada cuadro | cada 66 ms |
| `fps` — tope de cuadros | libre | 61 |
| `pre` — preload de los mp3 grandes | `auto` | `none` |

Lo que más costaba, en orden:

- **`shadowBlur` en las ~660 líneas del laberinto**, redibujadas en cada cuadro. Ahora se
  hornean una vez por laberinto a un canvas aparte (`bakeMaze()`) y el cuadro es un
  `drawImage`. El latido de extra vibes se suma encima con un segundo blit en `lighter`.
- **Una sombra difuminada por partícula** (hasta 34). En el teléfono el halo se finge con
  un cuadrado más grande y transparente, sin blur.
- **Dos `innerHTML` por cuadro en el encabezado**: el navegador reparseaba HTML y
  recalculaba estilo y layout 60 veces por segundo. Cada dato tiene ahora su `<span>` fijo
  y sólo se escribe el que cambió.
- **`box-shadow` del canvas animado con `--bop`**: repintar un resplandor de 58px en cada
  beat. En `.lite` queda fijo y `--bop` sólo mueve transforms.
- **125 `fillRect` de scanlines por cuadro** → una capa CSS (`#stage::after`).
- **Los dos mp3 de ~1MB**: `preload=none`, y el de extra vibes ni siquiera recibe su `src`
  hasta que alguien toca el botón.
- **Faltaba el `<meta name=viewport>`**: el teléfono maquetaba a 980px y después achicaba
  la página entera. Dentro del iframe del Artifact la etiqueta es inerte; abriendo el
  archivo directo, cambia todo.

Medido con Chromium en emulación de Pixel 5, con extra vibes prendido:

| | antes | después |
|---|---|---|
| Dibujo de un cuadro (con flush de GPU) | 2.5 ms | 0.47 ms |
| fps con CPU a 6× de throttle | 43 | 60 |
| Tiempo de main thread en 4 s | 3.97 s | 1.89 s |
| Layouts en 4 s | 173 | 90 |

## Notas de implementación

- **IA de los enemigos:** campo de flujo por BFS desde el jugador en cada turno. La
  distancia Manhattan no sirve en un laberinto — la línea recta miente y los gatos se
  metían en callejones. También recuerdan de dónde vinieron y no se devuelven salvo
  que estén sin salida.
- **Laberinto:** DFS con backtracking, o sea laberinto perfecto (siempre conectado).
- **Teclado móvil:** los soft keyboards de Android no mandan `e.key` confiable, así que
  hay un `<input>` invisible y se lee el evento `input`. `keydown` sigue para escritorio.
- **Layout:** el ancho útil sale de `visualViewport.width`, no del viewport de layout,
  que miente dentro de iframes.

## Tests

```sh
node test.js
```

Corre el juego en un `vm` con stubs de DOM: formato del timer, retroceso por error,
QTE (éxito y fallo), baby mode y su cooldown, ruta del teclado móvil, que el layout no
desborde, que los chips de letra nunca queden bajo el jugador, 25 laberintos donde el
gato debe llegar por el camino mínimo, y una partida completa jugada por un bot.

Del 11 al 15 va el combo y las vibes: que el medidor de combo llene y sature en
`COMBO_MAX` con un color por tramo, que los `sfx()` sean no-op sin WebAudio, que extra
vibes cambie de pista sin tocar ni una variable de gameplay y que `bopAt()` pique justo
en el bombo medido (0.174 s), que el tutorial reuse los sprites y se cierre con la
primera tecla, y que la salida sólo abra con las 5 monedas.

El 16 y el 17 son el perfil de rendimiento: corren el mismo `index.html` en dos contextos
—uno con `pointer:fine` y otro con `pointer:coarse`— y verifican que el lite prenda sólo
en el segundo, que ahí los mp3 grandes no se precarguen, que el tope de cuadros saltee el
cuadro repetido, y que la foto de la dificultad (`snap()`: `foeMs`, `chaseP`, `qteLen`,
`durBase` y `babyK` en todo su rango) dé exactamente igual en los dos.
