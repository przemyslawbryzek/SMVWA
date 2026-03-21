// Lazy-loads link-preview cards as they scroll into the viewport.
// Cards are rendered server-side as empty placeholders; fetching happens here.
(function () {
  const fetched = new Set();

  async function loadPreview(card) {
    const url = card.dataset.previewUrl;
    if (!url || fetched.has(url)) { card.remove(); return; }
    fetched.add(url);
    try {
      const r = await fetch('/api/posts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await r.json();
      if (data.error || (!data.title && !data.description && !data.image)) {
        card.remove();
        return;
      }
      const domain = (() => {
        try { return new URL(data.url).hostname; } catch { return data.url; }
      })();
      card.innerHTML = `
        ${data.image ? `<img src="${data.image}" class="w-full max-h-48 object-cover block" onerror="this.remove()">` : ''}
        <div class="p-3 flex flex-col gap-1 min-w-0">
          <span class="text-stone-500 text-xs truncate">${domain}</span>
          ${data.title ? `<span class="text-white font-semibold text-sm leading-snug line-clamp-2">${data.title}</span>` : ''}
          ${data.description ? `<span class="text-stone-400 text-xs line-clamp-2">${data.description}</span>` : ''}
        </div>`;
    } catch {
      card.remove();
    }
  }

  function observe(root) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          io.unobserve(e.target);
          loadPreview(e.target);
        }
      });
    }, { rootMargin: '200px' });

    root.querySelectorAll('.link-preview-card[data-preview-url]').forEach(c => io.observe(c));

    new MutationObserver((muts) => {
      muts.forEach(m => m.addedNodes.forEach(n => {
        if (n.nodeType !== 1) { return; }
        n.querySelectorAll && n.querySelectorAll('.link-preview-card[data-preview-url]').forEach(c => io.observe(c));
      }));
    }).observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => observe(document.body));
  } else {
    observe(document.body);
  }
}());
