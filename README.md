# Laberinto Gatuno

Speedrun de laberinto donde no te movés con flechas: cada salida abierta de tu celda
muestra una letra y tecleás la que corresponde a la dirección que querés tomar.
Un solo archivo HTML, sin dependencias — sprites, música y efectos van embebidos.

**Jugar:** abrí `index.html` en cualquier navegador. En el teléfono, tocá el laberinto
o el botón **TECLADO** para abrir el teclado del sistema.

La primera vez arranca un **tutorial guiado**: no es un cartel con cinco reglas, es el
nivel 1 jugándose, encendiendo un sistema por paso y sin avanzar hasta que lo usaste.
Al terminarlo —o con **SALTAR**— se abre el **selector de nivel**, y desde ahí se vuelve
con **▦ NIVELES**. Si ya lo terminaste alguna vez (`localStorage`), la próxima visita
entra derecho al selector.

## Niveles y modos

Todo lo que cambia entre partidas vive en la tabla `LEVELS` del `<script>`: tamaño del
tablero, monedas, gatos, ventana por letra y mecánicas. El resto del juego lee `LV` y
nunca pregunta en qué nivel está, así que un nivel nuevo es un objeto más en la lista.

| | PRIMEROS PASOS | EL LABERINTO | EL SÓTANO |
|---|---|---|---|
| Tablero | 9x7 | 15x11 | 17x13 |
| Monedas | 3 | 5 | 7 |
| Gatos | 1 (guiado) | 2 (+1 a la 3ª moneda) | 3 (+1) y un acechador |
| Ventana por letra | 2400 → 1400 ms | 1700 → 650 ms | 1500 → 600 ms |
| Extras | tutorial paso a paso | — | niebla, faroles |

El **sótano** es el que suma mecánicas nuevas, pensadas para una partida larga:

- **Niebla.** Sólo ves unas cuatro celdas alrededor del gato: un relleno con degradado
  radial sobre todo lo que es mundo (paredes, monedas, enemigos). Las letras, el QTE y
  los carteles se dibujan *después*, así que nunca quedan tapados. El mapa te lo acordás
  vos.
- **Faroles.** Tres, y a oscuras se siguen viendo —dan luz propia—, así que sirven de
  faro. Pisar uno enciende el sótano entero: 2.5 s a pleno y otros 2.5 s apagándose de a
  poco, hasta que la niebla se vuelve a cerrar. Con la salida abierta, la casilla verde
  también se ve desde lejos.
- **Acechador.** El primer gato del sótano nunca despista (persecución 100%, no el 70-95%
  del resto), pero se mueve a medio paso. No lo perdés: lo administrás.

El selector también lista los **modos de juego** que todavía no existen
(CONTRARRELOJ, SUPERVIVENCIA) en gris: el día que se implementen sólo hay que sacarles
el `soon`.

## Reglas

- Juntá todas las monedas del nivel y llegá al cuadro verde. **La salida está cerrada
  hasta la última moneda**: hasta entonces se dibuja roja y con el candado cerrado, y el
  encabezado dice cuántas faltan. Al juntarlas se pone verde, el candado se abre y salta
  un cartel `SALIDA DESBLOQUEADA` con su arpegio. Era la regla que más gente no entendía.
- El anillo alrededor del jugador es tu ventana de reacción: en el clásico arranca en
  1.7 s y se encoge 70 ms por cada punto de combo. Si se agota: +0.4 s de penalización y
  combo a cero.
- Letra equivocada: +0.6 s y combo a cero. Cualquier error te devuelve **un paso**
  por el camino que recorriste.
- Responder en menos de 350 ms descuenta tiempo, topado para que el neto nunca baje
  del 75% del tiempo real.
- Los gatos oscuros te persiguen. Al alcanzarte se abre un QTE: tecleás la secuencia
  completa antes de que se acabe la barra. Fallarlo cuesta +2 s y **3 pasos atrás**.
- **Respiro:** ganar un QTE congela **1,5 s** la ventana de reacción *y* el paso de los
  gatos. Salís del QTE con la pantalla llena de secuencia y sin saber para dónde ibas:
  ese rato es para mirar el laberinto de nuevo, no para correr. El anillo se dibuja lleno,
  en blanco y con un halo que respira, para que se vea que el reloj está quieto.

## Habilidades

Las dos se ganan jugando bien, no se compran ni se eligen; el HUD muestra el estado de
cada una y en el teléfono van en iconos (`◈` por carga, `♪` cuando el maullido está listo).

- **DETERMINACIÓN.** Cada **3 gatos vencidos** en un QTE te da una carga (hasta 3). Con
  carga encima, los **muros** de tu celda también muestran letra: van en violeta y con el
  círculo punteado, y teclear una te **atraviesa el muro** y gasta la carga. Sólo entran
  los muros que dan a una celda del tablero — los del borde no llevan a ningún lado. El
  gato lleva una órbita violeta con una pastilla por carga.
- **AHUYENTADOR.** Con el **combo al tope** (`COMBO_MAX`, x15), **ESPACIO** o **ENTER**
  sueltan un maullido: los gatos a **7 celdas o menos** dan media vuelta y corren para el
  otro lado durante **2,5 s** —hasta el acechador del sótano, que no despista nunca— y
  mientras huyen no abren QTE. Es el mismo campo de flujo del BFS, leído al revés. No
  gasta el combo: el precio es un **cooldown de 45 s**, y el combo al tope se pide
  **siempre**, también para el segundo maullido. En el teléfono no hay barra espaciadora
  a mano, así que el botón es el bloque del rango de combo de la barra.

## Dificultad

Escala con la fracción de monedas recogidas, entre los topes de cada nivel. En el
clásico (5 monedas) da exactamente los números de siempre:

| | 0 monedas | todas |
|---|---|---|
| Paso de los enemigos | 750 ms | 300 ms |
| Probabilidad de persecución | 70% | 95% |
| Letras del QTE | 3 | 8 |

El QTE siempre da 700 ms por letra, así que crece en largo, no en presión por tecla.
A mitad de camino aparece un gato más.

## Combo, rango y sonido

La racha dejó de ser un número: es un **rango con nombre**, al estilo Devil May Cry.
`RANKS` va de **D — DORMIDO** a **SSS — SIN PIEDAD** (D, C, B, A, S, SS, SSS), y el color
del rango manda sobre toda la GUI vía la variable CSS `--rc`. La dificultad sigue topando
en `COMBO_MAX` (15, donde la ventana de reacción toca su piso de 650 ms); SS y SSS son
puro flex, para que siempre quede algo arriba que perseguir.

El medidor del teléfono muestra lo que falta para el rango **siguiente**: se vacía y
vuelve a llenarse en cada ascenso, que es lo que hace que la racha se sienta. Al subir,
la letra crece de golpe, la barra destella y el nombre del rango entra volando sobre el
laberinto. En cada acierto la letra rebota con `cpop` (decae al 88% por cuadro).

El Artifact es un solo archivo sin imports, así que no hay `@font-face`: la tipografía
del rango es una pila de fuentes pesadas (`Impact`, `Franklin Gothic Heavy`, `Arial
Black`, `Roboto Condensed`) más itálica, `skewX(-11deg)`, degradado metálico con
`background-clip:text` y un halo con `drop-shadow`.

**El resto de la GUI habla la misma lengua.** Impact es un grotesco condensado, así que la
interfaz dejó el monoespaciado y usa los condensados que ya trae el sistema (`--ui`:
Arial Narrow en Windows y macOS, Roboto Condensed en Android, Avenir Next Condensed en iOS,
Liberation Sans Narrow en Linux, con `font-stretch:87.5%` para las variables), y cae en
Helvetica/Arial donde no haya ninguno. El tablero usa las dos: `CF` (el condensado) para
todo lo que hay que **leer** a las apuradas —las letras de las salidas, la secuencia del
QTE— y `DF` (el display del rango) sólo para los titulares. Nada se descarga: son fuentes
que ya están.

El cartel del nombre del rango **no tiene esquina fija**. En un tablero chico —o con el
gato pegado a un borde— le caía encima: ahora `rpopPlace()` prueba las cuatro esquinas
contra la celda del jugador y se queda en la primera libre (arriba-derecha primero, como
siempre), y la entrada se espeja para que el cartel siempre venga desde afuera del tablero.

Los efectos son osciladores de WebAudio, no más mp3 embebidos: el acierto es un blip de
55 ms que **sube un semitono por punto de combo** (tope a los 12, para que no se vuelva
chillón), el error un buzz descendente de sawtooth, el "tarde" uno más suave, la moneda
dos notas y el desbloqueo un arpegio de cuatro. Todo entre 0.04 y 0.08 de ganancia para
que no canse. El botón **MUSICA** silencia también los efectos. Sin WebAudio disponible,
`sfx()` no hace nada y el juego sigue igual.

## Extra vibes

Botón que cambia la música por `Before_the_Iron_Bell` (120 BPM) y pone a latir **toda** la
interfaz, no sólo el canvas: el encabezado y el subtítulo, el log de teclas, el medidor de
combo y su barra, el panel del tutorial, los botones del menú, la barra del teléfono con su
rango, el tablero entero (que escala 0,7%), su borde, las paredes, las monedas, los faroles,
la salida, el aura del jugador, los chips de letra, las scanlines y un degradado de fondo
detrás de todo. Es **sólo visual** — no toca la dificultad, ni el reloj, ni la IA.

El botón pone la clase `.vibes` en `<html>` y de ahí cuelgan todas las reglas del latido:
sin la clase el CSS ni las mira. Todo lo que pulsa lo hace sobre `transform`, `opacity`,
`filter` o sombras de cajas chicas — nada que obligue a rehacer el layout 60 veces por
segundo.

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

## GUI del teléfono

La pantalla útil es la que **deja el teclado**, así que todo va alineado arriba
(`justify-content:flex-start` y paneles con `align-items:start`) y lo que sobra queda
abajo, donde el teclado lo va a tapar igual.

- Una sola **barra de info**, fija arriba del laberinto y en el flujo: nunca lo tapa ni
  se muda de borde. A la izquierda el reloj y las monedas; a la derecha el rango de combo
  con su medidor.
- El resto de los botones vive en el **menú hamburguesa**, que congela el reloj mientras
  está abierto (igual que el selector de nivel y el diálogo de baby mode).
- El alto lo resuelve el CSS: `--ar` (la proporción `C/R` del nivel) y `--vh` (el alto
  **visible**, de `visualViewport`) dejan que el tablero se achique sólo lo necesario para
  que la barra, el laberinto y el cartel del tutorial entren enteros arriba del teclado.
  Si el navegador miente con `visualViewport` —puede pasar dentro del iframe del
  Artifact— el `min()` con `100dvh` deja todo como estaba.
- **Pantalla completa automática una sola vez:** el primer toque al entrar a la partida.
  De ahí en adelante se maneja sólo con el botón del menú, incluso entre partidas.

## Rendimiento

Hay dos capas de optimización, y conviene no mezclarlas.

**Lo que va en los dos lados** son cambios que dan el mismo dibujo, sólo que más barato:
el horneado de paredes, el HUD sin `innerHTML`, el BFS del campo de flujo sin arrays
intermedios, el log acotado en el DOM y el temblor que no ensucia el transform cuando ya
no se ve.

**Lo que va sólo en el teléfono** son los recortes que sí se notan si los mirás de cerca.
Viven detrás de un único flag `MOBILE` (`matchMedia('(pointer:coarse)')`, con el
user-agent de respaldo) que arma el objeto `PERF`:

| | escritorio | teléfono |
|---|---|---|
| `glow` — factor de `shadowBlur` | 1 | 0.5 |
| `scan` — scanlines dibujadas en el canvas | sí | las pinta el CSS |
| `dust` — partículas por chispazo | 100% | 60% |
| `hudMs` — refresco del reloj | cada cuadro | cada 66 ms |
| `fps` — tope de cuadros | libre | 61 |
| `pre` — preload de los mp3 grandes | `auto` | `none` |

Los números de dificultad no los toca ningún perfil, y hay un test que compara la foto
entera de la dificultad entre los dos.

### Lo que costaba, en orden

- **`shadowBlur` en las ~660 líneas del laberinto**, redibujadas en cada cuadro y sin
  cambiar hasta el próximo `gen()`. Ahora se hornean a un canvas aparte y el cuadro es un
  `drawImage` (ver abajo).
- **Una sombra difuminada por partícula** (hasta 34). En el teléfono el halo se finge con
  un cuadrado más grande y transparente, sin blur.
- **Dos `innerHTML` por cuadro en el encabezado**: el navegador reparseaba HTML y
  recalculaba estilo y layout 60 veces por segundo. Cada dato tiene ahora su `<span>` fijo
  y sólo se escribe el que cambió.
- **`box-shadow` del canvas animado con `--bop`**: repintar un resplandor de 58px en cada
  beat. En `.lite` queda fijo y `--bop` sólo mueve transforms.
- **125 `fillRect` de scanlines por cuadro** → una capa CSS (`#board::after`).
- **El degradado radial de la niebla**, evaluado píxel por píxel sobre el tablero entero
  en cada cuadro: costaba más que todo el resto del cuadro junto (17 de 28 ms con el
  teléfono a 6× de throttle). El degradado no cambia nunca, así que se hornea una vez a
  un parche de 256px y el cuadro lo pega escalado al radio de visión —un blit— más los
  rectángulos sólidos de afuera. Mismo dibujo, 28.4 ms → 11.7 ms por cuadro.
- **Los dos mp3 de ~1MB**: `preload=none`, y el de extra vibes ni siquiera recibe su `src`
  hasta que alguien toca el botón.
- **Faltaba el `<meta name=viewport>`**: el teléfono maquetaba a 980px y después achicaba
  la página entera. Dentro del iframe del Artifact la etiqueta es inerte; abriendo el
  archivo directo, cambia todo.

### El horneado de paredes

`bakeMaze()` pinta el laberinto una vez por `gen()` y el cuadro lo pega con un
`drawImage`. Dos detalles que costaron:

- **El latido.** Extra vibes abría el `shadowBlur` de las paredes de 10 a 26, y una sola
  copia no puede hacer eso. Se hornean las **dos puntas** (`BLUR=[10,26]`) y el cuadro
  mezcla linealmente entre ellas: los dos extremos salen exactos y el medio queda como
  interpolación de dos gaussianas en vez de una gaussiana intermedia. La segunda capa se
  hornea recién cuando alguien prende extra vibes.
- **El margen (`PAD`).** Al temblar, la copia se corre unos píxeles y el borde del tablero
  se quedaba sin el resplandor que entra desde afuera, porque el horneado ya lo había
  recortado. Se hornea con 32px de margen y se pega en `-PAD`.

Contra la versión anterior, con el laberinto quieto el canvas sale idéntico (delta máximo
de 1 sobre 255, que es redondeo); durante el latido el promedio se va a ~3 de 255 en la
mitad de la rampa y vuelve a cero en los dos extremos.

### Medido

Chromium, emulación de Pixel 5 y escritorio de 1280px, con extra vibes prendido:

| | antes | después |
|---|---|---|
| Dibujo de un cuadro, teléfono (con flush de GPU) | 2.5 ms | 0.47 ms |
| Dibujo de un cuadro, escritorio | 2.5 ms | 0.92 ms |
| fps del teléfono con CPU a 6× de throttle | 43 | 60 |
| Main thread del teléfono en 4 s | 3.99 s | 2.09 s |
| Layouts del teléfono en 4 s | 176 | 94 |

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

Del 11 al 16 va el combo, las vibes, el tutorial y los niveles: que el medidor llene y
sature en `COMBO_MAX`, que los rangos suban y el medidor se vacíe en cada ascenso, que
los `sfx()` sean no-op sin WebAudio, que extra vibes cambie de pista sin tocar ni una
variable de gameplay y que `bopAt()` pique justo en el bombo medido (0.174 s), que cada
paso del tutorial se cierre sólo cuando el jugador usó lo que explica y termine en el
selector, que el selector pause el reloj y no deje jugar un modo que no existe, que el
sótano conserve niebla, faroles y acechador (y se pueda terminar), y que la salida sólo
abra con todas las monedas del nivel.

Del 16b al 16e van las dos habilidades y el cartel del rango: que ganar un QTE congele
1,5 s la ventana **y** el paso de los gatos (y perderlo no dé respiro), que la carga de
determinación llegue recién al tercer gato y tope en `DET_MAX`, que las letras de muro
nunca caigan fuera del canvas ni pisen una salida abierta, que teclearlas atraviese el
muro y gaste la carga, que el maullido pida el combo al tope **siempre** y respete los
45 s, que los gatos cercanos se alejen y los lejanos ni se enteren, que ESPACIO y ENTER
lo disparen sin robarle el Enter a un botón del menú, y que el cartel del rango no tape
al gato en ninguna de las cuatro esquinas.

El 17 y el 18 son el perfil de rendimiento: corren el mismo `index.html` en dos contextos
—uno con `pointer:fine` y otro con `pointer:coarse`— y verifican que el lite prenda sólo
en el segundo, que ahí los mp3 grandes no se precarguen, que el tope de cuadros saltee el
cuadro repetido, y que la foto de la dificultad (`snap()`: `foeMs`, `chaseP`, `qteLen`,
`durBase` y `babyK` en todo su rango) dé exactamente igual en los dos. También chequean
lo que **no** es del perfil: que las dos plataformas horneen las paredes con su margen y
que la capa del latido aparezca recién al prender extra vibes.

Del 19 al 22 va la GUI del teléfono: que la barra no se mude de borde, que el ascenso de
rango se festeje (y bajar no), que el bloque del rango sea el botón del maullido, que el
menú devuelva el tiempo pausado, que la pantalla completa automática sea de **una sola
vez**, y —leyendo el `<style>` directo— que el perfil móvil quede alineado arriba y la
barra siga estando antes del tablero en el markup.

El 23 y el 24 leen el archivo: que no quede monoespaciado suelto (ni en el CSS ni en
ningún `x.font=` del canvas), que el `body` use `--ui`, y que el latido de extra vibes
llegue por lo menos a diez selectores —`#log`, `#cmeter`, `#tut`, `#board`, `#btns` y
`#bar` entre ellos— y se encienda con la clase `.vibes`.

> Ojo al escribir tests: los harness se pasan como *template literals*, así que ahí adentro
> una barra invertida no sobrevive (`\b` es un backspace, `\s` es una "s"). Nada de regex
> dentro del harness — para eso está el helper `has(el,clase)`.
