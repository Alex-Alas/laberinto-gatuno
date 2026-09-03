# Pendientes de UI/UX

**No queda nada pendiente.** Los dos puntos que había están hechos:

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
