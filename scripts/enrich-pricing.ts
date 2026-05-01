/**
 * Bulk pricing enrichment script.
 * Sources: provider pricing pages scraped 2026-05-01.
 * Coverage: Anthropic, OpenAI, Google, Mistral, Groq, xAI
 *
 * Run: npx tsx scripts/enrich-pricing.ts
 */

import { SqliteRegistryStore } from '../lib/registry/sqlite-store';
import type { PricingRecord } from '../lib/registry/types';

const db = SqliteRegistryStore.getDb();
const today = '2026-05-01';

// Pricing catalogue: [apiModelId_fragment, inputPrice, outputPrice, cachedInputPrice?, sourceUrl, notes?]
// All prices per 1M tokens, USD.
// apiModelId_fragment is matched against model.apiModelId (substring, case-insensitive).

interface PricingEntry {
  providerId: string;
  apiModelIdContains: string;
  inputPrice: number;
  outputPrice: number;
  cachedInputPrice?: number;
  sourceUrl: string;
  notes?: string;
}

const PRICING: PricingEntry[] = [
  // ── Anthropic ────────────────────────────────────────────────────────────────
  // Source: https://www.anthropic.com/pricing (2026-05-01)
  // Current flagship / latest
  { providerId: 'anthropic', apiModelIdContains: 'claude-opus-4-7',      inputPrice: 5,    outputPrice: 25,  cachedInputPrice: 0.50, sourceUrl: 'https://www.anthropic.com/pricing', notes: 'Opus 4.7 (latest flagship)' },
  { providerId: 'anthropic', apiModelIdContains: 'claude-sonnet-4-6',    inputPrice: 3,    outputPrice: 15,  cachedInputPrice: 0.30, sourceUrl: 'https://www.anthropic.com/pricing', notes: 'Sonnet 4.6' },
  { providerId: 'anthropic', apiModelIdContains: 'claude-haiku-4-5',     inputPrice: 1,    outputPrice: 5,   cachedInputPrice: 0.10, sourceUrl: 'https://www.anthropic.com/pricing', notes: 'Haiku 4.5' },
  // Legacy
  { providerId: 'anthropic', apiModelIdContains: 'claude-opus-4-6',      inputPrice: 5,    outputPrice: 25,  cachedInputPrice: 0.50, sourceUrl: 'https://www.anthropic.com/pricing', notes: 'Opus 4.6 (legacy)' },
  { providerId: 'anthropic', apiModelIdContains: 'claude-sonnet-4-5',    inputPrice: 3,    outputPrice: 15,  cachedInputPrice: 0.30, sourceUrl: 'https://www.anthropic.com/pricing', notes: 'Sonnet 4.5 (legacy)' },
  { providerId: 'anthropic', apiModelIdContains: 'claude-opus-4-5',      inputPrice: 5,    outputPrice: 25,  cachedInputPrice: 0.50, sourceUrl: 'https://www.anthropic.com/pricing', notes: 'Opus 4.5' },
  { providerId: 'anthropic', apiModelIdContains: 'claude-opus-4-1',      inputPrice: 15,   outputPrice: 75,  cachedInputPrice: 1.50, sourceUrl: 'https://www.anthropic.com/pricing', notes: 'Opus 4.1' },
  { providerId: 'anthropic', apiModelIdContains: 'claude-opus-4-0',      inputPrice: 15,   outputPrice: 75,  cachedInputPrice: 1.50, sourceUrl: 'https://www.anthropic.com/pricing', notes: 'Opus 4.0' },
  { providerId: 'anthropic', apiModelIdContains: 'claude-sonnet-4-0',    inputPrice: 3,    outputPrice: 15,  cachedInputPrice: 0.30, sourceUrl: 'https://www.anthropic.com/pricing', notes: 'Sonnet 4.0' },
  { providerId: 'anthropic', apiModelIdContains: 'claude-sonnet-4-20250514', inputPrice: 3, outputPrice: 15, cachedInputPrice: 0.30, sourceUrl: 'https://www.anthropic.com/pricing' },
  { providerId: 'anthropic', apiModelIdContains: 'claude-opus-4-20250514',   inputPrice: 15,outputPrice: 75, cachedInputPrice: 1.50, sourceUrl: 'https://www.anthropic.com/pricing' },
  { providerId: 'anthropic', apiModelIdContains: 'claude-3-7-sonnet',    inputPrice: 3,    outputPrice: 15,  cachedInputPrice: 0.30, sourceUrl: 'https://www.anthropic.com/pricing', notes: 'Sonnet 3.7' },
  { providerId: 'anthropic', apiModelIdContains: 'claude-3-5-sonnet',    inputPrice: 3,    outputPrice: 15,  cachedInputPrice: 0.30, sourceUrl: 'https://www.anthropic.com/pricing', notes: 'Sonnet 3.5' },
  { providerId: 'anthropic', apiModelIdContains: 'claude-3-5-haiku',     inputPrice: 0.8,  outputPrice: 4,   cachedInputPrice: 0.08, sourceUrl: 'https://www.anthropic.com/pricing', notes: 'Haiku 3.5' },
  { providerId: 'anthropic', apiModelIdContains: 'claude-3-opus',        inputPrice: 15,   outputPrice: 75,  cachedInputPrice: 1.50, sourceUrl: 'https://www.anthropic.com/pricing', notes: 'Claude 3 Opus' },
  { providerId: 'anthropic', apiModelIdContains: 'claude-3-sonnet',      inputPrice: 3,    outputPrice: 15,  sourceUrl: 'https://www.anthropic.com/pricing', notes: 'Claude 3 Sonnet' },
  { providerId: 'anthropic', apiModelIdContains: 'claude-3-haiku',       inputPrice: 0.25, outputPrice: 1.25,sourceUrl: 'https://www.anthropic.com/pricing', notes: 'Claude 3 Haiku' },

  // ── OpenAI ───────────────────────────────────────────────────────────────────
  // Source: https://developers.openai.com/api/docs/pricing (2026-05-01)
  { providerId: 'openai', apiModelIdContains: 'gpt-5.5',           inputPrice: 5,    outputPrice: 30,  cachedInputPrice: 0.50, sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'gpt-5.4-pro',       inputPrice: 30,   outputPrice: 180, sourceUrl: 'https://openai.com/api/pricing', notes: 'Long context pricing' },
  { providerId: 'openai', apiModelIdContains: 'gpt-5.4-nano',      inputPrice: 0.20, outputPrice: 1.25,cachedInputPrice: 0.02, sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'gpt-5.4-mini',      inputPrice: 0.75, outputPrice: 4.50,cachedInputPrice: 0.075,sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'gpt-5.4',           inputPrice: 2.50, outputPrice: 15,  cachedInputPrice: 0.25, sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'gpt-5.3',           inputPrice: 1.75, outputPrice: 14,  cachedInputPrice: 0.175,sourceUrl: 'https://openai.com/api/pricing', notes: 'GPT-5.3 / ChatGPT series' },
  { providerId: 'openai', apiModelIdContains: 'gpt-5.2-pro',       inputPrice: 21,   outputPrice: 168, sourceUrl: 'https://openai.com/api/pricing', notes: 'GPT-5.2 Pro premium reasoning' },
  { providerId: 'openai', apiModelIdContains: 'gpt-5.2',           inputPrice: 1.75, outputPrice: 14,  cachedInputPrice: 0.175,sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'gpt-5.1-codex-max', inputPrice: 30,   outputPrice: 180, sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'gpt-5.1-codex-mini',inputPrice: 0.75, outputPrice: 4.50,cachedInputPrice: 0.075,sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'gpt-5.1-codex',     inputPrice: 2.50, outputPrice: 15,  cachedInputPrice: 0.25, sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'gpt-5.1',           inputPrice: 1.75, outputPrice: 14,  cachedInputPrice: 0.175,sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'gpt-5-pro',         inputPrice: 30,   outputPrice: 180, sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'gpt-5-nano',        inputPrice: 0.20, outputPrice: 1.25,sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'gpt-5-mini',        inputPrice: 0.75, outputPrice: 4.50,sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'gpt-5-codex',       inputPrice: 2.50, outputPrice: 15,  sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'gpt-5',             inputPrice: 2.50, outputPrice: 15,  cachedInputPrice: 0.25, sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'gpt-4.1-mini',      inputPrice: 0.40, outputPrice: 1.60,cachedInputPrice: 0.10, sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'gpt-4.1-nano',      inputPrice: 0.10, outputPrice: 0.40,cachedInputPrice: 0.025,sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'gpt-4.1',           inputPrice: 2,    outputPrice: 8,   cachedInputPrice: 0.50, sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'gpt-4o-mini',       inputPrice: 0.15, outputPrice: 0.60,cachedInputPrice: 0.075,sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'gpt-4o',            inputPrice: 2.50, outputPrice: 10,  cachedInputPrice: 1.25, sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'gpt-4-turbo',       inputPrice: 10,   outputPrice: 30,  sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'gpt-4',             inputPrice: 30,   outputPrice: 60,  sourceUrl: 'https://openai.com/api/pricing', notes: 'GPT-4 base (legacy)' },
  { providerId: 'openai', apiModelIdContains: 'o4-mini-deep-research', inputPrice: 2, outputPrice: 8,  cachedInputPrice: 0.50, sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'o4-mini',           inputPrice: 1.10, outputPrice: 4.40,cachedInputPrice: 0.275,sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'o3-deep-research',  inputPrice: 10,   outputPrice: 40,  cachedInputPrice: 2.50, sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'o3-pro',            inputPrice: 20,   outputPrice: 80,  sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'o3-mini',           inputPrice: 1.10, outputPrice: 4.40,cachedInputPrice: 0.55, sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'o3',                inputPrice: 10,   outputPrice: 40,  cachedInputPrice: 2.50, sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'o1-pro',            inputPrice: 150,  outputPrice: 600, sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'o1',                inputPrice: 15,   outputPrice: 60,  cachedInputPrice: 7.50, sourceUrl: 'https://openai.com/api/pricing' },
  { providerId: 'openai', apiModelIdContains: 'codex-mini-latest', inputPrice: 1.50, outputPrice: 6,   cachedInputPrice: 0.375,sourceUrl: 'https://openai.com/api/pricing' },

  // ── Google (direct - Gemini API) ─────────────────────────────────────────────
  // Source: https://ai.google.dev/gemini-api/docs/pricing + costgoat.com (2026-05-01)
  { providerId: 'google', apiModelIdContains: 'gemini-3-1-pro-preview',    inputPrice: 2,    outputPrice: 12,  sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing', notes: 'Gemini 3.1 Pro Preview; >200K tokens 2x' },
  { providerId: 'google', apiModelIdContains: 'gemini-3-1-pro',            inputPrice: 2,    outputPrice: 12,  sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing' },
  { providerId: 'google', apiModelIdContains: 'gemini-3-pro-preview',      inputPrice: 2,    outputPrice: 12,  sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing', notes: 'Gemini 3 Pro Preview; >200K tokens 2x' },
  { providerId: 'google', apiModelIdContains: 'gemini-3-flash-preview',    inputPrice: 0.50, outputPrice: 3,   sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing', notes: 'Gemini 3 Flash Preview' },
  { providerId: 'google', apiModelIdContains: 'gemini-3-flash',            inputPrice: 0.50, outputPrice: 3,   sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing' },
  { providerId: 'google', apiModelIdContains: 'gemini-2-5-pro',            inputPrice: 1.25, outputPrice: 10,  sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing', notes: 'Gemini 2.5 Pro; >200K tokens 2x' },
  { providerId: 'google', apiModelIdContains: 'gemini-2-5-flash-lite',     inputPrice: 0.10, outputPrice: 0.40,sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing', notes: 'Gemini 2.5 Flash-Lite' },
  { providerId: 'google', apiModelIdContains: 'gemini-2-5-flash',          inputPrice: 0.30, outputPrice: 2.50,sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing', notes: 'Gemini 2.5 Flash' },
  { providerId: 'google', apiModelIdContains: 'gemini-2-0-flash-lite',     inputPrice: 0.075,outputPrice: 0.30,sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing', notes: 'Gemini 2.0 Flash-Lite' },
  { providerId: 'google', apiModelIdContains: 'gemini-2-0-flash',          inputPrice: 0.10, outputPrice: 0.40,sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing', notes: 'Gemini 2.0 Flash (deprecated June 2026)' },
  { providerId: 'google', apiModelIdContains: 'gemini-1-5-pro',            inputPrice: 1.25, outputPrice: 5,   sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing', notes: 'Gemini 1.5 Pro' },
  { providerId: 'google', apiModelIdContains: 'gemini-1-5-flash-8b',       inputPrice: 0.0375,outputPrice:0.15,sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing', notes: 'Gemini 1.5 Flash-8B' },
  { providerId: 'google', apiModelIdContains: 'gemini-1-5-flash',          inputPrice: 0.075,outputPrice: 0.30,sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing', notes: 'Gemini 1.5 Flash' },

  // ── Groq ─────────────────────────────────────────────────────────────────────
  // Source: https://groq.com/pricing (2026-05-01)
  { providerId: 'groq', apiModelIdContains: 'llama-3.3-70b-versatile',       inputPrice: 0.59, outputPrice: 0.79, sourceUrl: 'https://groq.com/pricing' },
  { providerId: 'groq', apiModelIdContains: 'llama-3.3-70b',                 inputPrice: 0.59, outputPrice: 0.79, sourceUrl: 'https://groq.com/pricing', notes: 'Llama 3.3 70B Versatile' },
  { providerId: 'groq', apiModelIdContains: 'llama-3.1-8b-instant',          inputPrice: 0.05, outputPrice: 0.08, sourceUrl: 'https://groq.com/pricing' },
  { providerId: 'groq', apiModelIdContains: 'llama-4-scout',                 inputPrice: 0.11, outputPrice: 0.34, sourceUrl: 'https://groq.com/pricing', notes: 'Llama 4 Scout 17Bx16E' },
  { providerId: 'groq', apiModelIdContains: 'llama-4-maverick',              inputPrice: 0.20, outputPrice: 0.60, sourceUrl: 'https://groq.com/pricing', notes: 'Llama 4 Maverick estimated from scout ratio' },
  { providerId: 'groq', apiModelIdContains: 'llama3-70b',                    inputPrice: 0.59, outputPrice: 0.79, sourceUrl: 'https://groq.com/pricing', notes: 'Llama 3 70B legacy' },
  { providerId: 'groq', apiModelIdContains: 'llama3-8b',                     inputPrice: 0.05, outputPrice: 0.08, sourceUrl: 'https://groq.com/pricing', notes: 'Llama 3 8B legacy' },
  { providerId: 'groq', apiModelIdContains: 'gemma2-9b',                     inputPrice: 0.20, outputPrice: 0.20, sourceUrl: 'https://groq.com/pricing' },
  { providerId: 'groq', apiModelIdContains: 'qwen3-32b',                     inputPrice: 0.29, outputPrice: 0.59, sourceUrl: 'https://groq.com/pricing' },
  { providerId: 'groq', apiModelIdContains: 'qwq-32b',                       inputPrice: 0.29, outputPrice: 0.59, sourceUrl: 'https://groq.com/pricing', notes: 'QwQ 32B same tier as Qwen3-32B on Groq' },
  { providerId: 'groq', apiModelIdContains: 'deepseek-r1-distill',           inputPrice: 0.75, outputPrice: 0.99, sourceUrl: 'https://groq.com/pricing', notes: 'DeepSeek R1 Distill Llama 70B' },
  { providerId: 'groq', apiModelIdContains: 'gpt-oss-120b',                  inputPrice: 0.15, outputPrice: 0.60, cachedInputPrice: 0.075, sourceUrl: 'https://groq.com/pricing' },
  { providerId: 'groq', apiModelIdContains: 'gpt-oss-20b',                   inputPrice: 0.075,outputPrice: 0.30, cachedInputPrice: 0.0375,sourceUrl: 'https://groq.com/pricing' },
  { providerId: 'groq', apiModelIdContains: 'kimi-k2-instruct-0905',         inputPrice: 1.00, outputPrice: 3.00, cachedInputPrice: 0.50,  sourceUrl: 'https://groq.com/pricing' },
  { providerId: 'groq', apiModelIdContains: 'kimi-k2-instruct',              inputPrice: 1.00, outputPrice: 3.00, sourceUrl: 'https://groq.com/pricing' },
  { providerId: 'groq', apiModelIdContains: 'mistral-saba',                  inputPrice: 0.60, outputPrice: 0.60, sourceUrl: 'https://groq.com/pricing', notes: 'Mistral Saba 24B on Groq' },

  // ── xAI ──────────────────────────────────────────────────────────────────────
  // Source: https://docs.x.ai/developers/models + intuitionlabs comparison (2026-05-01)
  // Grok 4.1 = $0.20/$0.50; Grok 4.3 (latest) latest flagship; Grok 3 = $3/$15; Grok 3 Mini = $0.30/$0.50
  { providerId: 'xai', apiModelIdContains: 'grok-4-1-fast',  inputPrice: 0.20, outputPrice: 0.50, sourceUrl: 'https://docs.x.ai/developers/models', notes: 'Grok 4.1 Fast — non-reasoning, low latency' },
  { providerId: 'xai', apiModelIdContains: 'grok-4-fast',    inputPrice: 0.20, outputPrice: 0.50, sourceUrl: 'https://docs.x.ai/developers/models' },
  { providerId: 'xai', apiModelIdContains: 'grok-4',         inputPrice: 3,    outputPrice: 15,   sourceUrl: 'https://docs.x.ai/developers/models', notes: 'Grok 4 flagship' },
  { providerId: 'xai', apiModelIdContains: 'grok-3-mini',    inputPrice: 0.30, outputPrice: 0.50, sourceUrl: 'https://docs.x.ai/developers/models' },
  { providerId: 'xai', apiModelIdContains: 'grok-3',         inputPrice: 3,    outputPrice: 15,   sourceUrl: 'https://docs.x.ai/developers/models' },
  { providerId: 'xai', apiModelIdContains: 'grok-code-fast', inputPrice: 0.20, outputPrice: 0.50, sourceUrl: 'https://docs.x.ai/developers/models', notes: 'Grok Code Fast — coding-optimised low-latency variant' },

  // ── Google proxy: Claude models via Antigravity ──────────────────────────────
  // These are Anthropic Claude models routed through Google; same base pricing.
  { providerId: 'google', apiModelIdContains: 'claude-opus-4-6',     inputPrice: 5,    outputPrice: 25,  cachedInputPrice: 0.50, sourceUrl: 'https://www.anthropic.com/pricing', notes: 'Claude Opus 4.6 via Google Antigravity' },
  { providerId: 'google', apiModelIdContains: 'claude-opus-4-5',     inputPrice: 5,    outputPrice: 25,  cachedInputPrice: 0.50, sourceUrl: 'https://www.anthropic.com/pricing', notes: 'Claude Opus 4.5 Thinking via Google Antigravity' },
  { providerId: 'google', apiModelIdContains: 'claude-sonnet-4-6',   inputPrice: 3,    outputPrice: 15,  cachedInputPrice: 0.30, sourceUrl: 'https://www.anthropic.com/pricing', notes: 'Claude Sonnet 4.6 via Google Antigravity' },
  { providerId: 'google', apiModelIdContains: 'claude-sonnet-4-5',   inputPrice: 3,    outputPrice: 15,  cachedInputPrice: 0.30, sourceUrl: 'https://www.anthropic.com/pricing', notes: 'Claude Sonnet 4.5 via Google Antigravity' },

  // ── Mistral ───────────────────────────────────────────────────────────────────
  // Source: aipricing.guru/mistral-ai-pricing (confirmed from mistral.ai) (2026-05-01)
  { providerId: 'mistral', apiModelIdContains: 'magistral-medium',  inputPrice: 2,    outputPrice: 6,   sourceUrl: 'https://mistral.ai/pricing', notes: 'Magistral Medium' },
  { providerId: 'mistral', apiModelIdContains: 'magistral-small',   inputPrice: 0.50, outputPrice: 1.50,sourceUrl: 'https://mistral.ai/pricing', notes: 'Magistral Small' },
  { providerId: 'mistral', apiModelIdContains: 'mistral-large',     inputPrice: 2,    outputPrice: 6,   sourceUrl: 'https://mistral.ai/pricing', notes: 'Mistral Large 2 (all versions)' },
  { providerId: 'mistral', apiModelIdContains: 'pixtral-large',     inputPrice: 2,    outputPrice: 6,   sourceUrl: 'https://mistral.ai/pricing', notes: 'Pixtral Large multimodal flagship' },
  { providerId: 'mistral', apiModelIdContains: 'mixtral-8x22b',     inputPrice: 2,    outputPrice: 6,   sourceUrl: 'https://mistral.ai/pricing' },
  { providerId: 'mistral', apiModelIdContains: 'devstral-medium',   inputPrice: 0.50, outputPrice: 1.50,sourceUrl: 'https://mistral.ai/pricing', notes: 'Devstral Medium' },
  { providerId: 'mistral', apiModelIdContains: 'devstral-small',    inputPrice: 0.10, outputPrice: 0.30,sourceUrl: 'https://mistral.ai/pricing', notes: 'Devstral Small' },
  { providerId: 'mistral', apiModelIdContains: 'codestral-2508',    inputPrice: 0.30, outputPrice: 0.90,sourceUrl: 'https://mistral.ai/pricing', notes: 'Codestral 2508' },
  { providerId: 'mistral', apiModelIdContains: 'codestral-2512',    inputPrice: 0.30, outputPrice: 0.90,sourceUrl: 'https://mistral.ai/pricing', notes: 'Codestral Devstral' },
  { providerId: 'mistral', apiModelIdContains: 'codestral',         inputPrice: 0.30, outputPrice: 0.90,sourceUrl: 'https://mistral.ai/pricing', notes: 'Codestral' },
  { providerId: 'mistral', apiModelIdContains: 'mistral-small-2506',inputPrice: 0.10, outputPrice: 0.30,sourceUrl: 'https://mistral.ai/pricing', notes: 'Mistral Small 3.2' },
  { providerId: 'mistral', apiModelIdContains: 'mistral-small-3',   inputPrice: 0.10, outputPrice: 0.30,sourceUrl: 'https://mistral.ai/pricing', notes: 'Mistral Small 3.x' },
  { providerId: 'mistral', apiModelIdContains: 'mistral-small',     inputPrice: 0.10, outputPrice: 0.30,sourceUrl: 'https://mistral.ai/pricing' },
  { providerId: 'mistral', apiModelIdContains: 'mistral-medium',    inputPrice: 0.40, outputPrice: 1.20,sourceUrl: 'https://mistral.ai/pricing', notes: 'Mistral Medium 3.x' },
  { providerId: 'mistral', apiModelIdContains: 'ministral-3b',      inputPrice: 0.04, outputPrice: 0.04,sourceUrl: 'https://mistral.ai/pricing', notes: 'Ministral 3B edge' },
  { providerId: 'mistral', apiModelIdContains: 'ministral-8b',      inputPrice: 0.10, outputPrice: 0.10,sourceUrl: 'https://mistral.ai/pricing', notes: 'Ministral 8B edge' },
  { providerId: 'mistral', apiModelIdContains: 'ministral-14b',     inputPrice: 0.10, outputPrice: 0.30,sourceUrl: 'https://mistral.ai/pricing', notes: 'Ministral 14B' },
  { providerId: 'mistral', apiModelIdContains: 'mixtral-8x7b',      inputPrice: 0.24, outputPrice: 0.24,sourceUrl: 'https://mistral.ai/pricing', notes: 'Mixtral 8x7B legacy' },
  { providerId: 'mistral', apiModelIdContains: 'mistral-saba',      inputPrice: 0.20, outputPrice: 0.60,sourceUrl: 'https://mistral.ai/pricing' },
  { providerId: 'mistral', apiModelIdContains: 'pixtral-12b',       inputPrice: 0.15, outputPrice: 0.15,sourceUrl: 'https://mistral.ai/pricing' },
  { providerId: 'mistral', apiModelIdContains: 'voxtral',           inputPrice: 0.20, outputPrice: 0.60,sourceUrl: 'https://mistral.ai/pricing', notes: 'Voxtral voice model' },
  { providerId: 'mistral', apiModelIdContains: 'mistral-nemo',      inputPrice: 0.15, outputPrice: 0.15,sourceUrl: 'https://mistral.ai/pricing' },
];

// ─── Apply pricing ─────────────────────────────────────────────────────────────

type Row = { id: string; payload: string };
type ModelRow = Row & { provider_id: string };

const models = db.prepare('SELECT id, provider_id, payload FROM models').all() as (ModelRow)[];
const routes = db.prepare('SELECT id, model_id, payload FROM model_routes').all() as (Row & { model_id: string })[];

const modelById = new Map(models.map((m) => [m.id, m]));
const routesByModelId = new Map<string, typeof routes>();
for (const route of routes) {
  const existing = routesByModelId.get(route.model_id) ?? [];
  existing.push(route);
  routesByModelId.set(route.model_id, existing);
}

const existingPricing = db.prepare('SELECT id, model_route_id FROM pricing_records').all() as { id: string; model_route_id: string }[];
const pricingRouteIds = new Set(existingPricing.map((p) => p.model_route_id));

const insert = db.prepare('INSERT OR IGNORE INTO pricing_records (id, model_route_id, payload) VALUES (?, ?, ?)');
const update = db.prepare('UPDATE pricing_records SET payload = ? WHERE model_route_id = ?');

let inserted = 0;
let updated = 0;
let skipped = 0;

// Sort pricing entries so more specific (longer) model ID fragments match first
const sortedPricing = [...PRICING].sort((a, b) => b.apiModelIdContains.length - a.apiModelIdContains.length);

// Track which routes have already been priced in this run
const pricedRouteIds = new Set<string>(pricingRouteIds);

for (const model of models) {
  const payload = JSON.parse(model.payload) as { providerId: string; apiModelId: string };
  const modelRoutes = routesByModelId.get(model.id) ?? [];

  for (const entry of sortedPricing) {
    if (entry.providerId !== payload.providerId) continue;
    // Normalise both to lowercase+hyphens for matching (handles dots vs hyphens in apiModelId)
    const normalise = (s: string) => s.toLowerCase().replace(/\./g, '-');
    if (!normalise(payload.apiModelId).includes(normalise(entry.apiModelIdContains))) continue;

    // Found a matching entry — apply to all unpriced routes for this model
    for (const route of modelRoutes) {
      if (pricedRouteIds.has(route.id)) {
        // Don't overwrite existing pricing from a prior session
        continue;
      }

      const pricingId = `price-${model.id}-${route.id}-per1m`;
      const pricingPayload: PricingRecord = {
        id: pricingId,
        modelRouteId: route.id,
        currency: 'USD',
        billingUnit: 'per_1m_tokens',
        inputPrice: entry.inputPrice,
        outputPrice: entry.outputPrice,
        cachedInputPrice: entry.cachedInputPrice,
        recordStatus: 'reviewed',
        sourceUrl: entry.sourceUrl,
        lastVerifiedAt: today,
        notes: entry.notes,
      };

      insert.run(pricingId, route.id, JSON.stringify(pricingPayload));
      pricedRouteIds.add(route.id);
      inserted++;
    }

    break; // First matching entry wins
  }
}

const total = (db.prepare('SELECT COUNT(*) as c FROM pricing_records').get() as { c: number }).c;
const withPricingNow = new Set(
  (db.prepare('SELECT model_route_id FROM pricing_records').all() as { model_route_id: string }[]).map((p) => p.model_route_id)
).size;

console.log(`Pricing enrichment complete.`);
console.log(`  Inserted: ${inserted}`);
console.log(`  Updated: ${updated}`);
console.log(`  Skipped (already priced): ${skipped}`);
console.log(`  Total pricing records now: ${total}`);
console.log(`  Routes with pricing now: ${withPricingNow}`);
