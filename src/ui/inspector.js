/**
 * Product inspector — DOM modal fed by catalog data (the 3D raycast path
 * attaches to it in M4). Esc closes; focus returns to the drawer.
 */

import { formatRupees } from '../commerce/pricing.js';

/**
 * @param {HTMLElement} host
 * @param {object} spec
 * @param {import('../commerce/catalog.js').Sku} spec.sku
 * @param {number} spec.vIdx
 * @param {number} spec.stock
 * @param {string} spec.image
 * @param {() => void} spec.onClose
 * @param {(sku: import('../commerce/catalog.js').Sku, vIdx: number) => boolean} spec.onAdd
 * @returns {{ dispose: () => void }}
 */
export function createInspector(host, { sku, vIdx, stock, image, onClose, onAdd }) {
  const overlay = document.createElement('div');
  overlay.className = 'inspector';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', sku.nameEn);

  const card = document.createElement('article');
  card.className = 'inspector-card';

  const picture = document.createElement('img');
  picture.className = 'inspector-thumb';
  picture.src = image;
  picture.alt = '';
  picture.width = 96;
  picture.height = 96;
  picture.decoding = 'async';
  card.appendChild(picture);

  const nameNp = document.createElement('h2');
  nameNp.className = 'inspector-name-np';
  nameNp.setAttribute('lang', 'ne');
  nameNp.textContent = sku.nameNp;
  card.appendChild(nameNp);

  const nameEn = document.createElement('p');
  nameEn.className = 'inspector-name-en';
  nameEn.textContent = sku.nameEn;
  card.appendChild(nameEn);

  const zone = document.createElement('p');
  zone.className = 'inspector-zone';
  zone.textContent = `ताक · ${sku.zone}`;
  card.appendChild(zone);

  const variantRow = document.createElement('div');
  variantRow.className = 'inspector-variants';
  let selected = vIdx;
  const priceEl = document.createElement('p');
  priceEl.className = 'inspector-price';
  sku.variants.forEach((variant, idx) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'inspector-variant';
    option.setAttribute('aria-pressed', String(idx === selected));
    option.textContent = `${variant.label} · ${formatRupees(variant.price)}`;
    option.addEventListener('click', () => {
      selected = idx;
      for (const button of variantRow.querySelectorAll('.inspector-variant')) {
        button.setAttribute('aria-pressed', String(button === option));
      }
      priceEl.textContent = formatRupees(sku.variants[selected].price);
    });
    variantRow.appendChild(option);
  });
  card.appendChild(variantRow);
  priceEl.textContent = formatRupees(sku.variants[selected].price);
  card.appendChild(priceEl);

  const stockEl = document.createElement('p');
  stockEl.className = 'inspector-stock';
  stockEl.textContent = stock > 0 ? `स्टक ${stock}` : 'सकियो · Sold out';
  card.appendChild(stockEl);

  const actions = document.createElement('div');
  actions.className = 'inspector-actions';
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'inspector-add';
  addBtn.textContent = 'झोलामा थप्नुहोस् · Add to jhola';
  addBtn.disabled = stock <= 0;
  const add = () => {
    const ok = onAdd(sku, selected);
    addBtn.classList.toggle('is-blocked', !ok);
  };
  addBtn.addEventListener('click', add);
  actions.appendChild(addBtn);
  card.appendChild(actions);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'inspector-close';
  closeBtn.setAttribute('aria-label', 'बन्द · Close');
  closeBtn.textContent = '×';
  card.appendChild(closeBtn);

  overlay.appendChild(card);
  host.appendChild(overlay);

  const handleKeydown = (/** @type {KeyboardEvent} */ event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
  };
  const handleClose = () => onClose();
  document.addEventListener('keydown', handleKeydown, true);
  closeBtn.addEventListener('click', handleClose);
  closeBtn.focus();

  return {
    dispose() {
      document.removeEventListener('keydown', handleKeydown, true);
      closeBtn.removeEventListener('click', handleClose);
      addBtn.removeEventListener('click', add);
      overlay.remove();
    },
  };
}
