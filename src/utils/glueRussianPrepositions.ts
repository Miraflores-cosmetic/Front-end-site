/** Неразрывный пробел — склейка предлогов/частиц с следующим словом. */
const NBSP = '\u00A0';

/** Короткие слова, которые не оставляем висеть в конце строки. */
const GLUE_WORDS =
  'а|и|но|да|или|либо|ни|то|не|же|ли|бы|ка|уж|вот|вон|это|' +
  'в|во|к|ко|с|со|у|о|об|обо|от|до|по|на|за|из|из-за|из-под|' +
  'без|для|над|под|при|про|через|между|перед|около|ради';

const GLUE_RE = new RegExp(
  `(^|[\\s(«„"–—-])(${GLUE_WORDS})(\\s+)(?=\\S)`,
  'gi',
);

const UNIT_RE = /(\d)\s+(мл|мг|г|кг|шт|₽|руб\.?)/gi;

/**
 * Вставляет NBSP после коротких предлогов/союзов и между числом и ед. изм.
 * Для title / description ProductCard (висячие «для», «и», «с»…).
 */
export function glueRussianPrepositions(text: string): string {
  if (!text) return '';
  return text
    .replace(/\u00A0/g, ' ')
    .replace(GLUE_RE, (_m, lead: string, word: string) => `${lead}${word}${NBSP}`)
    .replace(UNIT_RE, `$1${NBSP}$2`);
}

/** То же для HTML: только текстовые узлы между тегами. */
export function glueRussianPrepositionsInHtml(html: string): string {
  if (!html) return '';
  if (!/<[^>]+>/.test(html)) return glueRussianPrepositions(html);
  return html.replace(/(^|>)([^<]+)/g, (_m, boundary: string, text: string) => {
    return boundary + glueRussianPrepositions(text);
  });
}
