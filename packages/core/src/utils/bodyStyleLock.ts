type CssPropertyName = string;

type StyleLock = {
  initial: string;
  stack: Array<{ id: symbol; value: string }>;
};

const locks = new Map<CssPropertyName, StyleLock>();

function getBody(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.body;
}

function applyTop(prop: CssPropertyName, lock: StyleLock) {
  const body = getBody();
  if (!body) return;

  const top = lock.stack[lock.stack.length - 1];
  const nextValue = top ? top.value : lock.initial;

  if (!nextValue) {
    body.style.removeProperty(prop);
  } else {
    body.style.setProperty(prop, nextValue);
  }
}

/**
 * Apply inline styles to `document.body` with proper restore semantics.
 *
 * - Supports nested locks (ref-count via stack per property).
 * - Restores the previous inline value when the last lock is released.
 */
export function lockBodyStyle(styles: Record<CssPropertyName, string>): () => void {
  const body = getBody();
  if (!body) return () => {};

  const id = Symbol('body-style-lock');
  const props = Object.keys(styles);

  for (const prop of props) {
    const value = styles[prop];
    if (value === undefined) continue;

    let lock = locks.get(prop);
    if (!lock) {
      lock = { initial: body.style.getPropertyValue(prop), stack: [] };
      locks.set(prop, lock);
    }

    lock.stack.push({ id, value });
    applyTop(prop, lock);
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;

    for (const prop of props) {
      const lock = locks.get(prop);
      if (!lock) continue;

      lock.stack = lock.stack.filter((e) => e.id !== id);
      if (lock.stack.length === 0) {
        applyTop(prop, lock);
        locks.delete(prop);
      } else {
        applyTop(prop, lock);
      }
    }
  };
}

