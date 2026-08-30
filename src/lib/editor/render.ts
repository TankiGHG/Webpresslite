import 'server-only';
import { generateHTML } from '@tiptap/html';
import sanitizeHtml from 'sanitize-html';
import { editorExtensions } from './extensions';
import type { JSONContent } from './types';

/**
 * The allow-list is deliberately narrow: exactly the nodes and marks the editor
 * can produce, nothing else. Anything a crafted document smuggles in — a script
 * tag, an event handler, a `javascript:` href — is dropped rather than escaped.
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'h2',
    'h3',
    'h4',
    'ul',
    'ol',
    'li',
    'blockquote',
    'pre',
    'code',
    'strong',
    'em',
    's',
    'hr',
    'a',
    'img',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'srcset', 'sizes', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
    pre: ['class'],
    code: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  // `srcset` carries URLs too, and sanitize-html does not check it on its own.
  allowedSchemesAppliedToAttributes: ['href', 'src', 'srcset'],
  // Never let a document opt out of the rel we put on links.
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow' }, true),
    // Images below the fold should never block the first paint.
    img: sanitizeHtml.simpleTransform('img', { loading: 'lazy', decoding: 'async' }, true),
  },
  disallowedTagsMode: 'discard',
};

/** Renders a stored editor document to the HTML that goes into a page. */
export function renderContent(document: JSONContent): string {
  const html = generateHTML(document, editorExtensions);
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

/** Plain text of a document, used for excerpts and search. */
export function contentToText(document: JSONContent): string {
  const parts: string[] = [];

  const walk = (node: JSONContent) => {
    if (typeof node.text === 'string') parts.push(node.text);
    for (const child of node.content ?? []) walk(child);
    // Block level nodes end a text run, otherwise words run together.
    if (node.type && node.type !== 'text') parts.push(' ');
  };

  walk(document);
  return parts.join('').replace(/\s+/g, ' ').trim();
}

/** Builds an excerpt from the document when the author did not write one. */
export function deriveExcerpt(document: JSONContent, maxLength = 200): string {
  const text = contentToText(document);
  if (text.length <= maxLength) return text;

  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
