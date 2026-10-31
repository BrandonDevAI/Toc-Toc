// Máquina de estados: cada estado puede tener enter(data), update(dt, elapsed) y exit().
// `elapsed` son los segundos transcurridos desde que se entró al estado.
export function createStateMachine(states, bus) {
  let name = null;
  let current = null;
  let elapsed = 0;

  return {
    get name() {
      return name;
    },
    change(next, data) {
      current?.exit?.();
      name = next;
      current = states[next];
      elapsed = 0;
      bus?.emit('state:change', { name: next });
      current.enter?.(data);
    },
    update(dt) {
      elapsed += dt;
      current?.update?.(dt, elapsed);
    },
  };
}
