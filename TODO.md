# Pendientes de UI/UX

## Lo único pendiente: el sprite del acechador

`assets/acechador.png` es un **reemplazo generado**, no la imagen que se subió: la foto no
llegó al contenedor donde se hizo el cambio (el mp3 del grito sí, y ése es el original).
Está hecha en el mismo espíritu —blanco y negro, primer plano, grano de cámara, ojos
enormes— y todo lo demás del acechador está terminado: el sprite del tablero, el jumpscare
con su propio grito y el fade-out.

**Para poner la buena:** pisá `assets/acechador.png` con la imagen de verdad (cualquier
tamaño; el tablero la dibuja a ~26px y el jumpscare la estira a pantalla completa, así que
conviene que no baje de ~400px de lado). No hay que tocar ni una línea de código: si el
nombre y la ruta son ésos, la usa sola. Si se prefiere `.webp`, hay que cambiar la ruta en
los dos lugares donde aparece el literal `assets/acechador.png` (`gen()` en `game.js`) y
el conteo de assets del test 8.

---

Los dos puntos de UI/UX que había están hechos:

1. **Que el laberinto no se pueda esconder en móvil** — hecho.
   Ver *GUI del teléfono → Que el laberinto no se pueda esconder* en el README.
2. **Llevar la GUI del teléfono al escritorio** — hecho.
   Ver *GUI del escritorio* en el README.

## Lo que quedó del punto 2

La barra (`#bar`) pasó a ser **la misma pieza en los dos perfiles**: el CSS común son los
valores del teléfono y el escritorio sólo agrega lo que allá no entra (placa del nivel y
mejor marca, la línea de precisión / penalización / teclas / habilidades, y el récord de
combo al lado del rango). Se fueron `h2#hud`, `p#sub` y el medidor viejo
(`#cmeter`/`#cbar`/`#clab`), con sus reglas de `.vibes`.

El escritorio quedó como una consola de dos columnas —barra cruzando las dos, tablero a
la izquierda, log de teclas y ayuda a la derecha, botones en fila abajo (eso último ya
no: ver más abajo)— dentro de
`@media (min-width:860px)` y con todas las reglas bajo `:root:not(.lite)`, para que una
tablet táctil ancha siga con el perfil del teléfono.

Los números de gameplay no se tocaron: los tests 17/18 siguen comparando la foto de
`snap()` entre los dos perfiles y dan igual. Las aserciones de CSS (19–24) se reescribieron
junto con el CSS y se sumó el test **25**, el de la GUI del escritorio.

## Lo que se hizo después

- **Los botones del escritorio se fueron al menú.** Eran una fila permanente abajo del
  laberinto para cosas que se tocan una vez por partida. Ahora el menú es el mismo panel
  en los dos perfiles y en escritorio se abre con la hamburguesa de la barra o con
  **ESCAPE**. Ver *GUI del escritorio* en el README.
- **El tablero crece con la pantalla, y sin quedar borroso.** Era el primer punto de la
  lista de abajo: se resolvió separando el dibujo del canvas (coordenadas de tablero
  `BW x BH` + un factor `K` de píxeles por píxel de tablero), sin tocar `S` ni una sola
  cuenta del dibujo. Ver *El tablero crece con la pantalla* en el README.

## Si en algún momento se retoma esto

Ideas que quedaron sobre la mesa y **no** se hicieron, por orden de ganas:

- El log de teclas ocupa una columna alta y arranca casi vacío; podría mostrar algo más
  (últimas direcciones, aciertos seguidos) ahora que tiene todavía más lugar.
