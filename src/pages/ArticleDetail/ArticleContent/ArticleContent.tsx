import React, { useMemo } from 'react';
import { editorJsToHtml } from '@/utils/editorJsParser';
import { sanitizeCmsHtml } from '@/utils/sanitizeCmsHtml';
import { uploadsUrl } from '@/api/apiClient';
import styles from './ArticleContent.module.scss';

interface Props {
  contentJson: string | null | undefined;
  variant?: 'default' | 'info';
}

/** Relative /uploads → публичный URL; img без loading → lazy. */
function rewriteCmsMediaUrls(html: string): string {
  let out = html.replace(
    /(<img\b[^>]*\bsrc\s*=\s*)(["'])([^"']+)\2/gi,
    (full, prefix: string, quote: string, src: string) => {
      const next = uploadsUrl(src);
      if (!next || next === src) return full;
      return `${prefix}${quote}${next}${quote}`;
    },
  );
  out = out.replace(/<img\b(?![^>]*\bloading=)/gi, '<img loading="lazy" decoding="async" ');
  return out;
}

function looksLikeEditorJsJson(raw: string): boolean {
  const t = raw.trim();
  if (!t.startsWith('{') && !t.startsWith('[')) return false;
  try {
    const parsed = JSON.parse(t);
    return Boolean(
      parsed && typeof parsed === 'object' && Array.isArray(parsed.blocks),
    );
  } catch {
    return false;
  }
}

/**
 * Dual-path как Order Info:
 * HTML Nest → sanitize; Editor.js JSON → editorJsToHtml → sanitize.
 * Никакого raw dangerouslySetInnerHTML без sanitizeCmsHtml.
 */
const ArticleContent: React.FC<Props> = ({ contentJson, variant = 'default' }) => {
  const rootClass = variant === 'info' ? styles.infoArticleContent : styles.articleContentRoot;

  const html = useMemo(() => {
    if (!contentJson?.trim()) return '';
    const raw = contentJson.trim();
    const source = looksLikeEditorJsJson(raw) ? editorJsToHtml(raw) || '' : raw;
    return rewriteCmsMediaUrls(sanitizeCmsHtml(source));
  }, [contentJson]);

  if (!html) return null;

  return (
    <div
      className={rootClass}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default ArticleContent;
