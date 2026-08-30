import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import type { Extensions } from '@tiptap/core';

/**
 * One extension list for both sides: the browser editor and the server-side
 * JSON to HTML rendering. If they diverged, stored documents would render
 * differently from what the author saw.
 */
export const editorExtensions: Extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    codeBlock: { HTMLAttributes: { class: 'code-block' } },
  }),
  Link.configure({
    openOnClick: false,
    autolink: true,
    protocols: ['http', 'https', 'mailto'],
    HTMLAttributes: { rel: 'noopener noreferrer nofollow' },
  }),
  /**
   * Images carry their `srcset` and `sizes` as attributes so the published page
   * serves the variant that fits the viewport. The attributes are filled from
   * the media library when the image is inserted.
   */
  Image.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        srcset: { default: null },
        sizes: { default: null },
        width: { default: null },
        height: { default: null },
      };
    },
  }).configure({ inline: false, allowBase64: false }),
];
