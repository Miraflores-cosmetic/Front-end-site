import { uploadsUrl } from '@/api/apiClient';
import { sanitizeCmsHtml } from '@/utils/sanitizeCmsHtml';

export type AboutCmsGridBlock = {
  imageUrl: string;
  textHtml: string;
};

function rewriteCmsMediaUrls(html: string): string {
  return html.replace(
    /(<img\b[^>]*\bsrc\s*=\s*)(["'])([^"']+)\2/gi,
    (_full, prefix: string, quote: string, src: string) => {
      const next = uploadsUrl(src);
      if (!next || next === src) return `${prefix}${quote}${src}${quote}`;
      return `${prefix}${quote}${next}${quote}`;
    },
  );
}

function isEmptyHtml(el: HTMLElement): boolean {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('br').forEach((br) => br.remove());
  const text = (clone.textContent || '').replace(/\u00a0/g, ' ').trim();
  const hasImg = Boolean(clone.querySelector('img'));
  return !text && !hasImg;
}

function extractImageUrl(el: HTMLElement): string | null {
  const img = el.tagName === 'IMG' ? el : el.querySelector('img');
  if (!img) return null;
  const src = (img.getAttribute('src') || '').trim();
  if (!src) return null;
  return uploadsUrl(src) || src;
}

function isImageBlock(el: HTMLElement): boolean {
  const imgUrl = extractImageUrl(el);
  if (!imgUrl) return false;
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('img').forEach((img) => img.remove());
  clone.querySelectorAll('br').forEach((br) => br.remove());
  const text = (clone.textContent || '').replace(/\u00a0/g, ' ').trim();
  return text.length === 0;
}

/** CMS «Текст» (Quill HTML) → строки сетки: картинка + текст до следующей картинки. */
export function parseAboutCmsGridBlocks(raw: string | null | undefined): AboutCmsGridBlock[] {
  const t = (raw || '').trim();
  if (!t || t === '<p></p>' || t === '<p><br></p>') return [];

  const safe = rewriteCmsMediaUrls(sanitizeCmsHtml(t));
  if (!safe || typeof document === 'undefined') return [];

  const doc = new DOMParser().parseFromString(`<div id="about-cms-root">${safe}</div>`, 'text/html');
  const root = doc.getElementById('about-cms-root');
  if (!root) return [];

  const blocks: AboutCmsGridBlock[] = [];
  let textParts: string[] = [];
  let currentImage: string | null = null;

  const pushTextOnly = () => {
    const textHtml = textParts.join('').trim();
    textParts = [];
    if (!textHtml) return;
    blocks.push({ imageUrl: '', textHtml });
  };

  const pushImageBlock = () => {
    if (!currentImage) return;
    blocks.push({
      imageUrl: currentImage,
      textHtml: textParts.join('').trim(),
    });
    currentImage = null;
    textParts = [];
  };

  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as HTMLElement;
    if (isEmptyHtml(el)) continue;

    if (isImageBlock(el)) {
      const imageUrl = extractImageUrl(el);
      if (!imageUrl) continue;
      if (currentImage) {
        pushImageBlock();
      } else {
        pushTextOnly();
      }
      currentImage = imageUrl;
      continue;
    }

    textParts.push(el.outerHTML);
  }

  pushImageBlock();
  pushTextOnly();
  return blocks.filter((b) => b.imageUrl || b.textHtml);
}
