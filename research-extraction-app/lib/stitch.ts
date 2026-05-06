// Concatenate per-chunk model outputs with overlap-aware de-duplication.
// The chunker prepends ~600 chars of the previous chunk's tail; the model
// re-emits that as part of its output. We strip the overlap from the
// front of every chunk after the first by finding the longest common
// suffix-prefix between the running result and the new chunk.

const OVERLAP_SEARCH_CHARS = 800;

export function stitchChunks(outputs: string[]): string {
  if (outputs.length === 0) return '';
  let result = outputs[0];
  for (let i = 1; i < outputs.length; i += 1) {
    const next = outputs[i];
    const overlap = findOverlap(result, next, OVERLAP_SEARCH_CHARS);
    result += next.slice(overlap);
  }
  return result;
}

function findOverlap(a: string, b: string, max: number): number {
  const tail = a.slice(-max);
  const head = b.slice(0, max);
  for (let len = Math.min(tail.length, head.length); len > 0; len -= 1) {
    if (tail.slice(-len) === head.slice(0, len)) return len;
  }
  return 0;
}
