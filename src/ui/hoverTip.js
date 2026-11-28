export const HOVER_TIP = {
  offsetPx: 14,
  /** @param {number} stock @returns {string} */
  stockLabel: (stock) => (stock > 0 ? `स्टक ${stock}` : 'स्टक सकियो'),
};

/**
 * Pure tooltip lines — DOM text is assembled from these in the renderer and
 * asserted directly in unit tests.
 * @param {{ nameNp: string, nameEn: string }} sku @param {number} stock @param {string} priceLabel
 * @returns {{ titleNp: string, titleEn: string, price: string, stock: string }}
 */
export function tipLines(sku, stock, priceLabel) {
  return {
    titleNp: sku.nameNp,
    titleEn: sku.nameEn,
    price: priceLabel,
    stock: HOVER_TIP.stockLabel(stock),
  };
}

/**
 * Pointer-following hover tooltip for 3D products. `aria-hidden` — the catalog
 * drawer remains the accessible full commerce path (XAUR).
 * @param {HTMLElement} host
 * @returns {{ show: (lines: { titleNp: string, titleEn: string, price: string, stock: string }, clientX: number, clientY: number) => void, move: (clientX: number, clientY: number) => void, hide: () => void, isVisible: () => boolean, dispose: () => void }}
 */
export function createHoverTip(host) {
  const tip = document.createElement('div');
  tip.className = 'hover-tip';
  tip.setAttribute('aria-hidden', 'true');
  tip.hidden = true;

  const titleNp = document.createElement('p');
  titleNp.className = 'hover-tip-np';
  titleNp.setAttribute('lang', 'ne');
  const titleEn = document.createElement('p');
  titleEn.className = 'hover-tip-en';
  const meta = document.createElement('p');
  meta.className = 'hover-tip-meta';
  tip.append(titleNp, titleEn, meta);
  host.appendChild(tip);

  /** @param {number} clientX @param {number} clientY */
  const position = (clientX, clientY) => {
    tip.style.left = `${clientX + HOVER_TIP.offsetPx}px`;
    tip.style.top = `${clientY + HOVER_TIP.offsetPx}px`;
  };

  return {
  /**
   * @param {{ titleNp: string, titleEn: string, price: string, stock: string }} lines
   * @param {number} clientX
   * @param {number} clientY
   */
  show(lines, clientX, clientY) {
      titleNp.textContent = lines.titleNp;
      titleEn.textContent = lines.titleEn;
      meta.textContent = [lines.price, lines.stock].filter(Boolean).join(' · ');
      position(clientX, clientY);
      tip.hidden = false;
    },
    /** @param {number} clientX @param {number} clientY */
    move(clientX, clientY) {
      if (tip.hidden) return;
      position(clientX, clientY);
    },
    hide() {
      tip.hidden = true;
    },
    isVisible() {
      return !tip.hidden;
    },
    dispose() {
      tip.remove();
    },
  };
}
