// Bus de eventos mínimo para que los módulos se comuniquen sin conocerse.
export function createEventBus() {
  const handlers = new Map();

  return {
    on(event, fn) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event).add(fn);
      return () => handlers.get(event).delete(fn);
    },
    emit(event, payload) {
      handlers.get(event)?.forEach((fn) => fn(payload));
    },
  };
}
