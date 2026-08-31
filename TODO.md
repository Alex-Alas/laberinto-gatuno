# Pendientes de UI/UX

## 2 · Llevar la GUI del teléfono al escritorio  ← siguiente

**Estado:** anotado, sin empezar. (El punto 1 —que el laberinto no se esconda en
móvil— ya está hecho: ver *GUI del teléfono → Que el laberinto no se pueda esconder*
en el README.)

### El problema

Las mejoras de GUI se hicieron sólo en el perfil `.lite` (teléfono). El escritorio
quedó con la maqueta vieja, que es otra cosa visualmente:

| | escritorio (hoy) | teléfono (hoy) |
|---|---|---|
| datos de partida | `h2#hud` + `p#sub`, dos renglones de texto centrado | `#bar`: una barra con reloj `#bt` y monedas `#bc` |
| combo | `#cmeter` / `#cbar` / `#clab`, barra fina con texto | `#bcombo`: rango DMC grande (`#brank`) + `#bx` + `#bfill` |
| navegación | `#btns` en fila debajo del tablero | menú hamburguesa (`#burger` → `#menu`) con `#mstats` |
| ayuda | tres `p.help` sueltos abajo | dentro del menú |
| log de teclas | `#log` | oculto |

El teléfono tiene la identidad más trabajada (barra redondeada con degradado y halo
cian, rango con degradado metálico y `skewX`, medidor hacia el rango siguiente); el
escritorio se quedó en texto suelto centrado.

### Lo que hay que hacer

Trasladar el lenguaje visual del teléfono al escritorio **manteniendo consistencia**
de diseño, colores, tipografía y disposición, pero **aprovechando el espacio de más**
que hay en una pantalla grande — no es estirar la vista móvil.

Idea de partida (a validar antes de escribir CSS):

- **Misma `#bar` arriba del tablero**, con el mismo `border-radius`, degradado, halo y
  `#bfill`, pero en el ancho del escritorio: ahí entran cosas que en el teléfono no
  caben (récord, precisión, penalización, teclas, estado de DETERMINACIÓN y MAULLIDO
  con su cooldown — hoy eso vive en `habTxt()` y en `#sub`).
- **El bloque del rango grande** (`#brank` + `#bx`) pasa a ser el elemento principal
  del combo también en escritorio; `#cmeter` se retira o se reconvierte en el
  `#bfill` ancho.
- **`#btns` se queda en fila** (en escritorio no hace falta hamburguesa), pero con el
  estilo de los botones del menú móvil.
- **`#log` y los `p.help`** siguen siendo sólo de escritorio: hay lugar. Conviene
  reubicarlos como columna lateral junto al tablero en vez de apilarlos abajo, que es
  lo que obliga a que el tablero quede chico y centrado con mucho aire alrededor.
- Revisar `.vibes`: hoy varias reglas del latido apuntan a `#bar`, `#bcombo`, `#bx` y
  `#burger`, que en escritorio están ocultos. Al mostrarlos, el latido tiene que
  seguir sin tocar layout (sólo `transform`/`opacity`/`filter`/sombras chicas).

### Restricciones que no se negocian

- `index.html` es **un solo archivo autocontenido** (se publica como Claude Artifact):
  nada de imports externos, ni build step, ni dividir en varios archivos.
- Los números de gameplay **no se tocan**. Los tests 17/18 comparan la foto de la
  dificultad (`snap()`) entre los dos perfiles y tienen que seguir dando igual.
- `MOBILE`/`PERF` sólo cambian lo que se ve, nunca la lógica.
- Al terminar: `node test.js`, commit + push, y **republicar el mismo Artifact**
  (`https://claude.ai/code/artifact/e8aedd6d-cf5e-44e6-a002-6d8eebcb5cb5`) para que el
  link compartido no cambie.

### Tests que hay que mirar al tocar esto

`test.js` lee el `<style>` y el markup directo:

- **19–22** (GUI del teléfono): `bloque('.lite body')`, `bloque('.lite #bar')`,
  `bloque('.lite #stage')`, que `#bar` vaya antes de `#board` en el markup y que los
  paneles queden `align-items:start`.
- **23** (tipografía): una sola familia, nada de monoespaciado suelto.
- **24** (extra vibes): el latido tiene que llegar por lo menos a diez selectores,
  `#bar` entre ellos.

Si el escritorio pasa a usar `#bar`, varias de esas reglas dejan de ser sólo `.lite` y
las aserciones hay que reescribirlas junto con el CSS, no después.
