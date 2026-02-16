import { TRANSLATION_TIMEOUT_MS } from '$lib/server/config';
import type { TranslationService } from './translation-service';

interface CloudflareTranslateResponse {
  success?: boolean;
  result?: {
    translated_text?: string;
    translation?: string;
    text?: string;
  };
  errors?: Array<{ message?: string }>;
}

export class CloudflareTranslator implements TranslationService {
  private fetchFn: typeof fetch;
  private accountId: string;
  private token: string;

  constructor(fetchFn: typeof fetch, accountId: string, token: string) {
    this.fetchFn = fetchFn;
    this.accountId = accountId;
    this.token = token;
  }

  isConfigured(): boolean {
    return this.accountId.length > 0 && this.token.length > 0;
  }

  async translate(text: string, from: string, to: string): Promise<string> {
    if (!text.trim()) {
      return text;
    }

    if (!this.isConfigured()) {
      throw new Error('Cloudflare translator is not configured');
    }

    const endpoint =
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}` +
      '/ai/run/@cf/meta/m2m100-1.2b';

    const response = await this.fetchFn(endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        text,
        source_lang: from,
        target_lang: to
      }),
      signal: AbortSignal.timeout(TRANSLATION_TIMEOUT_MS)
    });

    if (!response.ok) {
      throw new Error(`Cloudflare AI HTTP ${response.status}`);
    }

    const data = (await response.json()) as CloudflareTranslateResponse;

    if (data.success === false) {
      const message = data.errors?.[0]?.message || 'Cloudflare AI request failed';
      throw new Error(message);
    }

    const translated =
      data.result?.translated_text || data.result?.translation || data.result?.text;

    if (!translated) {
      throw new Error('Cloudflare AI returned empty translation');
    }

    return translated;
  }

  async translateBatch(texts: string[], from: string, to: string): Promise<string[]> {
    if (texts.length === 0) {
      return [];
    }

    const translations: string[] = [];

    for (const text of texts) {
      translations.push(await this.translate(text, from, to));
    }

    return translations;
  }
}
