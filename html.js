function createElement(name, opts = {}, ...children) {
  const el = document.createElement(name)
  el.append(...children.flatMap(i => i instanceof HTMLCollection ? Array.from(i) : i))
  if (typeof opts == 'function' && 'button' == name) {
    opts = { onclick: opts }
  }
  if (opts?.class) {
    el.classList.add(...classes(opts.class))
    delete opts.class
  }
  return Object.assign(el, opts)
}

export function classes(cs) {
  if ('string' == typeof cs) return [cs];
  return Array.isArray(cs)
    ? cs.flatMap(classes)
    : Object.entries(cs).flatMap(([cn, cond]) => cond ? [cn] : [])
}

export const html = new Proxy(createElement, {
  get: (t, name) => (props, ...childs) => (
    typeof props == 'string'
    || props instanceof Node
    || props instanceof HTMLCollection
  )
    ? createElement(name, null, props, ...childs)
    : createElement(name, props, ...childs)
})

export function select(opts) {
  const s = html.select()
  for (const v of opts)
    s.append(option(v))
  return s
}

function option(value, text = value) {
  if (Array.isArray(value)) {
    [value, text] = value
  }
  return html.option({ value }, text)
}

export function fold(title, ...details) {
  const d = html.details()
  d.append(html.summary(title), ...details)
  return d
}
