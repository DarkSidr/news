export const TECH_GLOSSARY: string[] = [
  'JavaScript',
  'TypeScript',
  'Node.js',
  'React',
  'Svelte',
  'Next.js',
  'Vue',
  'Angular',
  'Docker',
  'Kubernetes',
  'PostgreSQL',
  'Redis',
  'GraphQL',
  'REST API',
  'API',
  'CI/CD',
  'DevOps',
  'GitHub',
  'GitLab',
  'OpenAI',
  'LLM',
  'GPU'
];

export interface GlossaryReplacement {
  token: string;
  term: string;
}

export interface GlossaryProtectionResult {
  processedText: string;
  replacements: GlossaryReplacement[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function protectGlossaryTerms(
  text: string,
  terms: string[] = TECH_GLOSSARY
): GlossaryProtectionResult {
  if (!text.trim()) {
    return { processedText: text, replacements: [] };
  }

  const sortedTerms = [...terms].sort((a, b) => b.length - a.length);
  const replacements: GlossaryReplacement[] = [];
  let processedText = text;

  for (let i = 0; i < sortedTerms.length; i++) {
    const term = sortedTerms[i];
    const token = `__TECH_TERM_${i}__`;
    const pattern = new RegExp(escapeRegExp(term), 'g');

    if (pattern.test(processedText)) {
      processedText = processedText.replace(pattern, token);
      replacements.push({ token, term });
    }
  }

  return { processedText, replacements };
}

export function restoreGlossaryTerms(
  text: string,
  replacements: GlossaryReplacement[]
): string {
  if (!replacements.length) {
    return text;
  }

  return replacements.reduce((resultText, replacement) => {
    return resultText.replace(new RegExp(escapeRegExp(replacement.token), 'g'), replacement.term);
  }, text);
}

export function buildGlossaryInstruction(terms: string[] = TECH_GLOSSARY): string {
  if (terms.length === 0) {
    return '';
  }

  return `Сохрани без перевода следующие технические термины: ${terms.join(', ')}.`;
}
