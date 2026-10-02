const allowedTags = new Set(['a', 'b', 'blockquote', 'br', 'caption', 'code', 'col', 'colgroup', 'dd', 'del', 'div', 'dl', 'dt',
  'em', 'font', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'ins', 'li', 'ol', 'p', 'pre', 's', 'small', 'span',
  'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul']);
const discardTags = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'template']);
const attributes = new Set(['class', 'title', 'alt', 'width', 'height', 'colspan', 'rowspan', 'align', 'valign', 'color', 'size', 'face']);
function safeUrl(value: string): boolean {
  const normalized = value.replace(/[\u0000-\u0020\u007f-\u009f]/g, '');
  return !/^[a-z][a-z\d+.-]*:/i.test(normalized) || /^(https?:|mailto:|tel:)/i.test(normalized);
}

/** Rich descriptions previously passed through Angular's HTML sanitizer. */
export function sanitizeHtml(html: string, document: Document = globalThis.document): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  const visit = (parent: ParentNode) => {
    for (const node of Array.from(parent.childNodes)) {
      if (node.nodeType === 8) { node.remove(); continue; }
      if (node.nodeType !== 1) continue;
      const element = node as HTMLElement;
      const tag = element.tagName.toLowerCase();
      if (discardTags.has(tag)) { element.remove(); continue; }
      visit(element);
      if (!allowedTags.has(tag)) { element.replaceWith(...Array.from(element.childNodes)); continue; }
      for (const attribute of Array.from(element.attributes)) {
        const name = attribute.name.toLowerCase();
        const isUrl = tag === 'a' && name === 'href' || tag === 'img' && name === 'src';
        if (isUrl ? !safeUrl(attribute.value) : !attributes.has(name) && !(tag === 'a' && ['target', 'rel'].includes(name))) element.removeAttribute(attribute.name);
      }
      if (tag === 'a' && element.getAttribute('target') === '_blank') element.setAttribute('rel', 'noopener noreferrer');
    }
  };
  visit(template.content);
  return template.innerHTML;
}
