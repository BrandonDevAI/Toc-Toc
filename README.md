# 🚪 Toc Toc

Es noche de Halloween y tocan a tu puerta. Miras por la mirilla y tienes unos segundos para decidir:
¿es un **niño disfrazado** (le das dulces) o un **monstruo de verdad** (no abres)?

## Cómo jugar

| Acción | Teclado | Móvil |
|---|---|---|
| 🚪 No abrir | ← o A | Deslizar a la izquierda |
| 🍬 Dar dulces | → o D | Deslizar a la derecha |
| 🔇 Silenciar | M | Botón 🔊 |

Todo monstruo tiene algo raro: ojos que brillan, una cola, no tiene sombra...
La noche va de 8 PM a 11 PM y cada hora es más difícil.

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
- [ ] Fase 3: más disfraces y anomalías
- [ ] Fase 4: pulido, final especial y compartir puntaje
