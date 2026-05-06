// ~4 chars/token rough estimate
export function estimateTokens(s: string): number {
  return Math.ceil(s.length / 4);
}

const TARGET_INPUT_TOKENS = 1500;
const OVERLAP_CHARS = 600;

export interface Chunk {
  index: number;
  text: string;
  tokens: number;
}

export function chunkText(input: string): Chunk[] {
  const text = input.trim();
  if (!text) return [];
  if (estimateTokens(text) <= TARGET_INPUT_TOKENS) {
    return [{ index: 0, text, tokens: estimateTokens(text) }];
  }

  const paragraphs = text.split(/\n\s*\n/);
  const units: string[] = [];
  for (const p of paragraphs) {
    if (estimateTokens(p) <= TARGET_INPUT_TOKENS) {
      units.push(p);
      continue;
    }
    const sentences = p.split(/(?<=[.!?])\s+(?=[A-Z])/);
    for (const s of sentences) {
      if (estimateTokens(s) <= TARGET_INPUT_TOKENS) {
        units.push(s);
      } else {
        const charBudget = TARGET_INPUT_TOKENS * 4;
        for (let i = 0; i < s.length; i += charBudget) {
          units.push(s.slice(i, i + charBudget));
        }
      }
    }
  }

  const chunks: Chunk[] = [];
  let buf = '';
  for (const u of units) {
    const tentative = buf ? buf + '\n\n' + u : u;
    if (estimateTokens(tentative) > TARGET_INPUT_TOKENS && buf) {
      chunks.push({ index: chunks.length, text: buf, tokens: estimateTokens(buf) });
      const tail = buf.slice(-OVERLAP_CHARS);
      buf = tail + '\n\n' + u;
    } else {
      buf = tentative;
    }
  }
  if (buf) chunks.push({ index: chunks.length, text: buf, tokens: estimateTokens(buf) });
  return chunks;
}
