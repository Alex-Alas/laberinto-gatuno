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
la izquierda, log de teclas y ayuda a la derecha, botones en fila abajo— dentro de
`@media (min-width:860px)` y con todas las reglas bajo `:root:not(.lite)`, para que una
tablet táctil ancha siga con el perfil del teléfono.

Los números de gameplay no se tocaron: los tests 17/18 siguen comparando la foto de
`snap()` entre los dos perfiles y dan igual. Las aserciones de CSS (19–24) se reescribieron
junto con el CSS y se sumó el test **25**, el de la GUI del escritorio.

## Si en algún momento se retoma esto

Ideas que quedaron sobre la mesa y **no** se hicieron, por orden de ganas:

- El tablero sigue dibujándose a tamaño nativo (`C*S`) y en escritorio no crece con la
  pantalla: agrandarlo por CSS lo deja borroso, y subir la resolución del canvas toca
  `S`, que es de donde cuelga todo el dibujo. Sería un cambio propio, no de layout.
- El log de teclas ocupa una columna alta y arranca casi vacío; podría mostrar algo más
  (últimas direcciones, aciertos seguidos) ahora que tiene lugar.
