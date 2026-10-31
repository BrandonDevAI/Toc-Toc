# 🚪 Toc Toc

Es noche de Halloween y tocan a tu puerta. Miras por la mirilla y tienes unos segundos para decidir:
¿es un **niño disfrazado** (le das dulces) o un **monstruo de verdad** (no abres)?

## Cómo jugar

| Acción | Teclado | Móvil |
|---|---|---|
| 🚪 No abrir | ← o A | Deslizar a la izquierda |
| 🍬 Dar dulces | → o D | Deslizar a la derecha |
| 🔇 Silenciar | M | Botón 🔊 |

Todo monstruo tiene algo raro, y cada hora las pistas son más sutiles:

| Hora | Pistas de monstruo |
|---|---|
| 8 PM | Ojos rojos, cola que se mueve, colmillos de verdad |
| 9 PM | + Sin sombra, sombra con cuernos, ojos completamente negros |
| 10 PM | + Sonrisa demasiado ancha, flota sobre el piso, nunca parpadea |
| 11 PM | Solo las difíciles, con niebla y la luz fallando |

Desde las 10 PM algunos niños traen **disfraces que engañan**: colas de peluche,
lentes rojos de juguete o colmillos de plástico. Mira bien antes de cerrar la puerta.

Disfraces: fantasma, bruja, calabaza, vampiro, esqueleto, momia, gato y espantapájaros.

## Correrlo en local

El juego usa módulos de JavaScript, así que necesita un servidor local (no abre con doble clic):

```bash
python -m http.server 5173
```

Luego abre <http://localhost:5173>.

## Estructura

```
src/
├── main.js      # Arranque y estados del juego
├── core/        # Máquina de estados, loop y bus de eventos
├── game/        # Reglas, curva de dificultad y generador de visitantes
├── data/        # Disfraces y anomalías (pistas de monstruo)
├── render/      # Dibujo procedural en canvas, mirilla y niebla
├── audio/       # Sonidos sintetizados con Web Audio (sin archivos)
└── ui/          # HUD, pantallas y controles
```

## Hoja de ruta

- [x] Fase 1: núcleo jugable
- [x] Fase 2: efecto mirilla, niebla y sonidos
- [x] Fase 3: más disfraces y anomalías
- [ ] Fase 4: pulido, final especial y compartir puntaje
