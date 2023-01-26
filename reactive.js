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
  rx.map = fn => {
    const m = reactive(fn(value))
    rx.watch(v => m(fn(v)))
    return m
  };
  rx.toString = () => value;
  rx.valueOf = () => value;
  return rx
}