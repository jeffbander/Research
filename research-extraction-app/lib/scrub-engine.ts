'use client';

import { CreateMLCEngine, MLCEngine, type ChatCompletionMessageParam } from '@mlc-ai/web-llm';
import { chunkText, type Chunk } from './chunker';
import { IdentifierMap } from './identifier-map';
import { stitchChunks } from './stitch';
import { buildSystemPrompt } from './phi-scrub-prompt';
import { PRESETS, type PhiPolicy } from './phi-policy';

export type FieldKey = 'notes' | 'procedures' | 'labs';

export interface FieldProgress {
  field: FieldKey;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  chunksTotal: number;
  chunksDone: number;
  redactions: number;
  error?: string;
}

export interface ScrubResult {
  field: FieldKey;
  cleansed: string;
  chunks: number;
  redactions: number;
}

export type ProgressCallback = (progress: FieldProgress) => void;

let engineSingleton: MLCEngine | null = null;

export interface LoadOptions {
  modelId?: string;
  onProgress?: (report: { progress: number; text: string }) => void;
}

export async function loadEngine(opts: LoadOptions = {}): Promise<MLCEngine> {
  if (engineSingleton) return engineSingleton;
  const modelId = opts.modelId || 'Llama-3.2-3B-Instruct-q4f16_1-MLC';
  engineSingleton = await CreateMLCEngine(modelId, {
    initProgressCallback: (r) => opts.onProgress?.({ progress: r.progress, text: r.text })
  });
  return engineSingleton;
}

export function getEngine(): MLCEngine | null {
  return engineSingleton;
}

async function scrubChunk(
  engine: MLCEngine,
  systemPrompt: string,
  chunkText: string
): Promise<string> {
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: chunkText }
  ];
  const completion = await engine.chat.completions.create({
    messages,
    temperature: 0,
    max_tokens: 2000,
    stream: false
  });
  return completion.choices[0]?.message?.content ?? '';
}

export async function scrubField(
  engine: MLCEngine,
  field: FieldKey,
  rawText: string,
  identifierMap: IdentifierMap,
  policy: PhiPolicy = PRESETS.internal_research,
  onProgress?: ProgressCallback
): Promise<ScrubResult> {
  const chunks: Chunk[] = chunkText(rawText);
  const systemPrompt = buildSystemPrompt(policy);
  const outputs: string[] = [];
  const progress: FieldProgress = {
    field, status: 'in_progress',
    chunksTotal: chunks.length, chunksDone: 0, redactions: 0
  };
  onProgress?.(progress);

  if (chunks.length === 0) {
    progress.status = 'completed';
    onProgress?.(progress);
    return { field, cleansed: '', chunks: 0, redactions: 0 };
  }

  for (const chunk of chunks) {
    const raw = await scrubChunk(engine, systemPrompt, chunk.text);
    const normalized = identifierMap.applyTo(raw);
    outputs.push(normalized);
    progress.chunksDone += 1;
    progress.redactions = identifierMap.totalRedactions();
    onProgress?.({ ...progress });
  }

  const cleansed = stitchChunks(outputs);
  progress.status = 'completed';
  onProgress?.({ ...progress });
  return {
    field,
    cleansed,
    chunks: chunks.length,
    redactions: identifierMap.totalRedactions()
  };
}
