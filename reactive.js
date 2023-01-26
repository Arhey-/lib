function reactive(value) {
  let subs = [];

  function rx(v) {
    if (!arguments.length) return value;
    if (v === value) return;
    value = v;
    subs.forEach(cb => cb(value))
  }

  rx.dispose = () => subs.splice(0);
  rx.watch = cb => subs.push(cb);
  rx.map = (fn, ...deps) => {
    const m = reactive(fn(value, ...deps.map(d => d())))
    for (const d of [rx, ...deps]) {
      d.watch(() => m(fn(value, ...deps.map(d => d()))))
    }
    return m
  };
  rx.toString = () => value;
  rx.valueOf = () => value;
  return rx
}