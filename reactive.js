const batchs = []

// TODO is not tested with nested reactives
export function batch(fn) {
  batchs.push(new Map)
  fn();
  for(const [cb, value] of batchs.pop()) {
    cb(value)
  }
}

const tracking = [];

export function watch(fn) {
  const deps = new Set;
  tracking.push(deps)
  fn();
  tracking.pop()
  const uns = [...deps].map(d => d.watch(rewatch))

  function rewatch() {
    uns.forEach(un => un())
    watch(fn)
  }
}

// TODO avoid cross deps
export function reactive(value, opts) {
  const subs = [];

  function rx(v) {
    if (!arguments.length) {
      tracking.at(-1)?.add(rx)
      return value;
    }
    if ((opts?.eq ?? Object.is)(value, v)) return;
    value = v;
    for (const cb of subs) {
      if (!batchs.at(-1)?.set(cb, value)) {
        cb(value)
      }
    }
  }

  rx.dispose = () => subs.splice(0);
  rx.watch = cb => {
    subs.push(cb);
    return () => {
      const i = subs.findIndex(s => s === cb)
      if (~i) subs.splice(i, 1)
    }
  };
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