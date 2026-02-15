import {
  TRANSLATION_BATCH_SIZE,
  CF_ACCOUNT_ID,
  CF_AI_TOKEN,
  LIBRETRANSLATE_URL
} from '$lib/server/config';
import {
  protectGlossaryTerms,
  restoreGlossaryTerms
} from './glossary';
import { CloudflareTranslator } from './cf-translator';
import { LibreTranslator } from './libre-translator';

export interface TranslationService {
  translate(text: string, from: string, to: string): Promise<string>;
  translateBatch(texts: string[], from: string, to: string): Promise<string[]>;
}

export class TranslationProviderChain implements TranslationService {
  private providers: TranslationService[];

  constructor(providers: TranslationService[]) {
    this.providers = providers;
  }

  async translate(text: string, from: string, to: string): Promise<string> {
    if (!text.trim()) {
      return text;
    }

    const preparedText = this.prepareText(text);
    let lastError: Error | null = null;

    for (const provider of this.providers) {
      try {
        const translated = await provider.translate(preparedText.processedText, from, to);
        return restoreGlossaryTerms(translated, preparedText.replacements);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw lastError ?? new Error('No translation providers configured');
  }

  async translateBatch(texts: string[], from: string, to: string): Promise<string[]> {
    if (texts.length === 0) {
      return [];
    }

    const chunks: string[][] = [];
    for (let i = 0; i < texts.length; i += TRANSLATION_BATCH_SIZE) {
      chunks.push(texts.slice(i, i + TRANSLATION_BATCH_SIZE));
    }

    const results: string[] = [];

    for (const chunk of chunks) {
      const preparedChunk = chunk.map((text) => this.prepareText(text));
      const payload = preparedChunk.map((item) => item.processedText);
      let translatedChunk: string[] | null = null;
      let lastError: Error | null = null;

      for (const provider of this.providers) {
        try {
          translatedChunk = await provider.translateBatch(payload, from, to);
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
        }
      }

      if (!translatedChunk) {
        throw lastError ?? new Error('No translation providers configured');
      }

      for (let i = 0; i < translatedChunk.length; i++) {
        const restored = restoreGlossaryTerms(
          translatedChunk[i],
          preparedChunk[i]?.replacements ?? []
        );
        results.push(restored);
      }
    }

    return results;
  }

  private prepareText(text: string): {
    processedText: string;
    replacements: Array<{ token: string; term: string }>;
  } {
    const protectedText = protectGlossaryTerms(text);

    return {
      processedText: protectedText.processedText,
      replacements: protectedText.replacements
    };
  }
}

export function createTranslationService(fetchFn: typeof fetch): TranslationService | null {
  const providers: TranslationService[] = [];

  if (CF_ACCOUNT_ID && CF_AI_TOKEN) {
    providers.push(new CloudflareTranslator(fetchFn, CF_ACCOUNT_ID, CF_AI_TOKEN));
  }

  if (LIBRETRANSLATE_URL) {
    providers.push(new LibreTranslator(fetchFn, LIBRETRANSLATE_URL));
  }

  if (providers.length === 0) {
    return null;
  }

  return new TranslationProviderChain(providers);
}

export function isTranslationConfigured(): boolean {
  return Boolean((CF_ACCOUNT_ID && CF_AI_TOKEN) || LIBRETRANSLATE_URL);
}
