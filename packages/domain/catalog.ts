/** Pick uniformly from the currently visible catalog; empty catalogs are safe. */
export function randomItem<T>(
  items: readonly T[],
  random = Math.random,
): T | undefined {
  if (!items.length) return undefined;
  return items[
    Math.min(items.length - 1, Math.max(0, Math.floor(random() * items.length)))
  ];
}
