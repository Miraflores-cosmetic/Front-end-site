/**
 * Лёгкий allowlist-sanitize для CMS HTML (без DOMPurify).
 * Скрипты/handlers/javascript: вырезаются.
 */
const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'a',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'span',
  'div',
  'figure',
  'figcaption',
  'img',
]);

const ALLOWED_ATTR: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel', 'title']),
  img: new Set(['src', 'alt', 'width', 'height', 'loading']),
  '*': new Set(['class']),
};

function isSafeUrl(url: string): boolean {
  const t = url.trim().toLowerCase();
  if (!t) return false;
  if (t.startsWith('javascript:') || t.startsWith('data:text') || t.startsWith('vbscript:')) {
    return false;
  }
  return (
    t.startsWith('http://') ||
    t.startsWith('https://') ||
    t.startsWith('/') ||
    t.startsWith('#') ||
    t.startsWith('mailto:')
  );
}

export function sanitizeCmsHtml(input: string | null | undefined): string {
  if (!input?.trim()) return '';
  if (typeof document === 'undefined') {
    return input
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
      .replace(/\son\w+\s*=\s*[^\s>]+/gi, '');
  }

  const template = document.createElement('template');
  template.innerHTML = input;

  const walk = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (!ALLOWED_TAGS.has(tag)) {
          el.replaceWith(...Array.from(el.childNodes));
          walk(node);
          continue;
        }
        const allowed = new Set([
          ...(ALLOWED_ATTR['*'] ?? []),
          ...(ALLOWED_ATTR[tag] ?? []),
        ]);
        for (const attr of Array.from(el.attributes)) {
          const name = attr.name.toLowerCase();
          if (name.startsWith('on') || !allowed.has(name)) {
            el.removeAttribute(attr.name);
            continue;
          }
          if ((name === 'href' || name === 'src') && !isSafeUrl(attr.value)) {
            el.removeAttribute(attr.name);
          }
        }
        if (tag === 'a') {
          el.setAttribute('rel', 'noopener noreferrer');
          if (el.getAttribute('target') === '_blank') {
            /* ok */
          }
        }
        walk(el);
      }
    }
  };

  walk(template.content);
  return template.innerHTML;
}
