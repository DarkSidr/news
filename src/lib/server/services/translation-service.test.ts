import { describe, expect, it, vi } from 'vitest';
import type { TranslationService } from './translation-service';

vi.mock('$lib/server/config', () => ({
  TRANSLATION_BATCH_SIZE: 5,
  CF_ACCOUNT_ID: '',
  CF_AI_TOKEN: '',
  LIBRETRANSLATE_URL: 'http://localhost:5000',
  TRANSLATION_TIMEOUT_MS: 30000
}));

const { LibreTranslator } = await import('./libre-translator');
const { TranslationProviderChain } = await import('./translation-service');
const { CloudflareTranslator } = await import('./cf-translator');

class MockTranslator implements TranslationService {
  private shouldFail: boolean;
  private prefix: string;

  constructor(options: { shouldFail?: boolean; prefix?: string } = {}) {
    this.shouldFail = options.shouldFail ?? false;
    this.prefix = options.prefix ?? '';
  }

  async translate(text: string): Promise<string> {
    if (this.shouldFail) {
      throw new Error('mock-fail');
    }

    return `${this.prefix}${text}`;
  }

  async translateBatch(texts: string[]): Promise<string[]> {
    if (this.shouldFail) {
      throw new Error('mock-fail');
    }

    return texts.map((text) => `${this.prefix}${text}`);
  }
}

describe('LibreTranslator', () => {
  it('translates single text via API', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ translatedText: 'Привет мир' })
    });

    const translator = new LibreTranslator(fetchFn as unknown as typeof fetch, 'http://localhost:5000');
    const result = await translator.translate('Hello world', 'en', 'ru');

    expect(result).toBe('Привет мир');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('translates batch text via API', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ translatedText: ['Один', 'Два'] })
    });

    const translator = new LibreTranslator(fetchFn as unknown as typeof fetch, 'http://localhost:5000');
    const result = await translator.translateBatch(['One', 'Two'], 'en', 'ru');

    expect(result).toEqual(['Один', 'Два']);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('throws on API error response', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 503
    });

    const translator = new LibreTranslator(fetchFn as unknown as typeof fetch, 'http://localhost:5000');

    await expect(translator.translate('Hello', 'en', 'ru')).rejects.toThrow('HTTP 503');
  });
});

describe('CloudflareTranslator', () => {

  it('translates single text via API', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        result: { translated_text: 'Привет мир' }
      })
    });

    const translator = new CloudflareTranslator(fetchFn as unknown as typeof fetch, 'acc-id', 'token');
    const result = await translator.translate('Hello world', 'en', 'ru');

    expect(result).toBe('Привет мир');
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(
      expect.stringContaining('acc-id'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer token'
        })
      })
    );
  });

  it('translates batch text via API', async () => {
    // Cloudflare translate() is called in a loop for batch
    const fetchFn = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: { translated_text: 'Один' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: { translated_text: 'Два' } })
      });

    const translator = new CloudflareTranslator(fetchFn as unknown as typeof fetch, 'acc-id', 'token');
    const result = await translator.translateBatch(['One', 'Two'], 'en', 'ru');

    expect(result).toEqual(['Один', 'Два']);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('throws on API error response', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 401
    });

    const translator = new CloudflareTranslator(fetchFn as unknown as typeof fetch, 'acc-id', 'token');

    await expect(translator.translate('Hello', 'en', 'ru')).rejects.toThrow('HTTP 401');
  });
});

describe('TranslationProviderChain', () => {
  it('falls back to next provider when first fails', async () => {
    const chain = new TranslationProviderChain([
      new MockTranslator({ shouldFail: true }),
      new MockTranslator({ prefix: 'ru:' })
    ]);

    const result = await chain.translate('Hello', 'en', 'ru');

    expect(result).toBe('ru:Hello');
  });

  it('translates batch in chunks', async () => {
    const provider = new MockTranslator({ prefix: 'ru:' });
    const chain = new TranslationProviderChain([provider]);

    const result = await chain.translateBatch(
      ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      'en',
      'ru'
    );

    expect(result).toEqual(['ru:A', 'ru:B', 'ru:C', 'ru:D', 'ru:E', 'ru:F', 'ru:G']);
  });

  it('preserves technical glossary terms', async () => {
    const chain = new TranslationProviderChain([
      new MockTranslator({ prefix: 'ru:' })
    ]);

    const result = await chain.translate('JavaScript works with Docker', 'en', 'ru');

    expect(result).toContain('JavaScript');
    expect(result).toContain('Docker');
  });
});
