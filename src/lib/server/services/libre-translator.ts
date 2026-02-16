import { TRANSLATION_TIMEOUT_MS } from '$lib/server/config';
import type { TranslationService } from './translation-service';

interface LibreTranslateSingleResponse {
  translatedText?: string;
}

interface LibreTranslateBatchResponse {
  translatedText?: string[];
}

export class LibreTranslator implements TranslationService {
  private fetchFn: typeof fetch;
  private baseUrl: string;

  constructor(fetchFn: typeof fetch, baseUrl: string) {
    this.fetchFn = fetchFn;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  isConfigured(): boolean {
    return this.baseUrl.length > 0;
  }

  async translate(text: string, from: string, to: string): Promise<string> {
    if (!text.trim()) {
      return text;
    }

    if (!this.isConfigured()) {
      throw new Error('LibreTranslate URL is not configured');
    }

    const response = await this.fetchFn(`${this.baseUrl}/translate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        q: text,
        source: from,
        target: to,
        format: 'text'
      }),
      signal: AbortSignal.timeout(TRANSLATION_TIMEOUT_MS)
    });

    if (!response.ok) {
      throw new Error(`LibreTranslate HTTP ${response.status}`);
    }

    const data = (await response.json()) as LibreTranslateSingleResponse;

    if (!data.translatedText) {
      throw new Error('LibreTranslate returned empty translation');
    }

    return data.translatedText;
  }

  async translateBatch(texts: string[], from: string, to: string): Promise<string[]> {
    if (texts.length === 0) {
      return [];
    }

    if (!this.isConfigured()) {
      throw new Error('LibreTranslate URL is not configured');
    }

    const response = await this.fetchFn(`${this.baseUrl}/translate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        q: texts,
        source: from,
        target: to,
        format: 'text'
      }),
      signal: AbortSignal.timeout(TRANSLATION_TIMEOUT_MS)
    });

    if (!response.ok) {
      throw new Error(`LibreTranslate HTTP ${response.status}`);
    }

    const data = (await response.json()) as LibreTranslateBatchResponse;

    if (!Array.isArray(data.translatedText) || data.translatedText.length !== texts.length) {
      const fallback: string[] = [];
      for (const text of texts) {
        fallback.push(await this.translate(text, from, to));
      }
      return fallback;
    }

    return data.translatedText;
  }
}
