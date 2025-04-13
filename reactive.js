let isBatching = false;
const batching = new Map();

export function batch(fn) {
  isBatching = true;
  fn();
  isBatching = false;
  for(const [cb, value] of batching) {
    cb(value)
  }
  batching.clear()
}

export function reactive(value, opts) {
  const subs = [];

  function rx(v) {
    if (!arguments.length) return value;
    if ((opts?.eq ?? Object.is)(v, value)) return;
    value = v;
    for (const cb of subs) {
      if (isBatching) {
        batching.set(cb, value)
      } else {
        cb(value)
      }
    }
  }

  rx.dispose = () => subs.splice(0);
  rx.watch = cb => subs.push(cb);
  rx.map = (fn, ...deps) => {
    const m = reactive(fn(value, ...deps.map(d => d())))
    const w = () => m(fn(value, ...deps.map(d => d())))
    for (const d of [rx, ...deps]) {
      d.watch(w)
    }
    return m
  };
  rx.toString = () => value;
  rx.valueOf = () => value;
  return rx
}