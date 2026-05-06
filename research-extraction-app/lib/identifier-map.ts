// Walks scrubbed text emitted by the model in [CATEGORY: original-text]
// form and replaces each occurrence with a stable [CATEGORY-N] placeholder.
// A single instance is shared across all three fields so the same identifier
// gets the same number across notes / procedures / labs.

const MARKER_RE = /\[([A-Z_]+):\s*([^\]]+?)\]/g;

export interface RedactionCounts {
  [category: string]: number;
}

export class IdentifierMap {
  private counters: Map<string, number> = new Map();
  private mapping: Map<string, string> = new Map(); // key: `${cat}::${normalizedOriginal}` -> placeholder
  private discovered: Map<string, Set<string>> = new Map(); // category -> set of originals

  applyTo(text: string): string {
    return text.replace(MARKER_RE, (_full, category: string, original: string) => {
      const key = `${category}::${this.normalize(original)}`;
      let placeholder = this.mapping.get(key);
      if (!placeholder) {
        const n = (this.counters.get(category) ?? 0) + 1;
        this.counters.set(category, n);
        placeholder = `[${category}-${n}]`;
        this.mapping.set(key, placeholder);
        if (!this.discovered.has(category)) this.discovered.set(category, new Set());
        this.discovered.get(category)!.add(original.trim());
      }
      return placeholder;
    });
  }

  counts(): RedactionCounts {
    const out: RedactionCounts = {};
    for (const [cat, set] of this.discovered) out[cat] = set.size;
    return out;
  }

  totalRedactions(): number {
    let total = 0;
    for (const n of this.counters.values()) total += n;
    return total;
  }

  // Returns the discovered originals per category. Sensitive — only export
  // when the user opts in.
  dictionary(): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    for (const [cat, set] of this.discovered) out[cat] = [...set];
    return out;
  }

  private normalize(s: string): string {
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
  }
}
