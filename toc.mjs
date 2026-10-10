/** Framework-independent TOC presentation. Pass trusted CMS HTML to the host
 * renderer; this module only creates text/fragment links, never executes content. */
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const isTocTitle = text => /^(?:目次|table\s+of\s+contents)$/i.test(String(text).replace(/[【】［］\[\]]/g, '').trim());
export function renderTableOfContents(headings, {locale = 'ja', title = locale === 'en' ? 'Table of contents' : '目次', maxLevel = 3, className = '', render} = {}) {
  const entries = headings.filter(h => h.level >= 2 && h.level <= maxLevel && h.text.trim() && !isTocTitle(h.text)).map(h => ({...h, href: '#' + encodeURIComponent(h.id)}));
  if (render) return render({title, entries});
  return `<details class="space-toc ${escape(className)}" data-space-toc open><summary>${escape(title)}</summary><ol>${entries.map(h => `<li data-level="${h.level}"><a href="${escape(h.href)}">${escape(h.text)}</a></li>`).join('')}</ol></details>`;
}
/** Upgrade CMS nav blocks and install responsive behavior. Returns cleanup for
 * React effects / client navigation. Custom render output must use data-space-toc
 * on a details element to opt into the standard behavior. */
export function mountTableOfContents(root, options = {}) {
  const win = root.ownerDocument.defaultView;
  const originals = [];
  for (const nav of root.querySelectorAll('nav[data-table-of-contents]')) {
    const headings = [...nav.querySelectorAll('a[href^="#"]')].map(a => {
      const fragment = a.getAttribute('href').slice(1);
      let id; try { id = decodeURIComponent(fragment); } catch { id = fragment; }
      return {id, text: a.textContent ?? '', level: Number(a.dataset.level ?? 2)};
    });
    const template = root.ownerDocument.createElement('template');
    template.innerHTML = renderTableOfContents(headings, {maxLevel: Number(nav.dataset.maxLevel) === 2 ? 2 : 3, ...options});
    const nodes = [...template.content.childNodes];
    nav.replaceWith(...nodes); originals.push({nav, nodes});
  }
  const tocs = [...root.querySelectorAll('details[data-space-toc]')];
  const media = win.matchMedia(options.mobileQuery ?? '(max-width: 620px)');
  let frame = null;
  const sticky = () => {
    if (frame !== null) return;
    frame = win.requestAnimationFrame(() => {
      frame = null;
      for (const toc of tocs) {
        const top = parseFloat(win.getComputedStyle(toc).top) || 0;
        toc.classList.toggle('is-stuck', media.matches && toc.getBoundingClientRect().top <= top + 1);
      }
    });
  };
  const sync = () => { for (const toc of tocs) toc.open = media.matches ? (options.mobileOpen ?? false) : (options.desktopOpen ?? true); sticky(); };
  const click = e => {
    const link = e.target.closest?.('a[href^="#"]');
    const toc = link?.closest('details[data-space-toc]');
    if (toc && root.contains(toc) && media.matches) { toc.open = false; sticky(); }
  };
  sync(); media.addEventListener('change', sync); win.addEventListener('scroll', sticky, {passive:true}); root.addEventListener('click', click);
  return () => {
    media.removeEventListener('change', sync); win.removeEventListener('scroll', sticky); root.removeEventListener('click', click);
    if (frame !== null) win.cancelAnimationFrame(frame);
    for (const {nav, nodes} of originals) { if (nodes[0]?.parentNode) nodes[0].before(nav); for (const node of nodes) node.remove(); }
  };
}
