// Small text helpers shared across the review + train surfaces.

// Replace only the first line of `text` with `newHook`; keep the rest verbatim.
// Used by the rehook flow in both RewriteCard (/review) and TrainCard (/train),
// so the "swap just the opening line" semantics stay identical in both places.
export function swapFirstLine(text: string, newHook: string): string {
  const nl = text.indexOf("\n");
  if (nl === -1) return newHook; // single-line post → replace the whole thing
  return newHook + text.slice(nl); // keep the newline + body untouched
}
