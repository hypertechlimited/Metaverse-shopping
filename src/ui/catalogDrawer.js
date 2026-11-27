/**
 * Catalog drawer — the complete DOM commerce path without raycasting (XAUR
 * requirement in docs/RESEARCH-GAPS.md §6). Grouped by merchandising zone,
 * live stock badges, variant selects, jhola footer with QR + promo + checkout.
 * Every handler is dispatched through main.js store actions; this module
 * never mutates commerce state itself.
 */

import { CATALOG } from '../commerce/catalog.js';
import { formatRupees } from '../commerce/pricing.js';
import { cartSubtotal, committedQtyFor } from '../commerce/cart.js';

/** @typedef {import('../commerce/cart.js').CartLine} CartLine */
/** @typedef {import('../commerce/catalog.js').Sku} Sku */

const ZONE_ORDER = ['Counter', 'Back Rack', 'Front Pedi', 'Corner'];

/** @type {Record<string, string>} */
const ZONE_LABELS = {
  Counter: 'काउन्टर · Counter',
  'Back Rack': 'पछाडिको ताक · Back Rack',
  'Front Pedi': 'अगाडिको पेडी · Front Pedi',
  Corner: 'कुनो · Corner',
};

/**
 * @param {HTMLElement} host
 * @param {object} handlers
 * @param {() => CartLine[]} handlers.getLines
 * @param {(id: string) => number} handlers.stockOf
 * @param {(id: string, vIdx: number, qty: number) => boolean} handlers.onAdd
 * @param {(id: string, vIdx: number) => void} handlers.onDecrement
 * @param {(sku: Sku, vIdx: number) => void} handlers.onInspect
 * @param {(qrUsed: boolean, promoText: string) => void} handlers.onCheckout
 * @param {(art: string) => string} handlers.imageFor
 * @returns {{ open: () => void, close: () => void, isOpen: () => boolean, refresh: () => void, dispose: () => void }}
 */
export function createCatalogDrawer(host, { getLines, stockOf, onAdd, onDecrement, onInspect, onCheckout, imageFor }) {
  const aside = document.createElement('aside');
  aside.className = 'catalog-drawer';
  aside.setAttribute('role', 'dialog');
  aside.setAttribute('aria-label', 'पसल सूची · Catalog');
  aside.hidden = true;

  const header = document.createElement('header');
  header.className = 'catalog-header';
  const title = document.createElement('h2');
  title.setAttribute('lang', 'ne');
  title.textContent = 'पसल सूची';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'catalog-close';
  closeBtn.setAttribute('aria-label', 'बन्द · Close catalog');
  closeBtn.textContent = '×';
  header.append(title, closeBtn);
  aside.appendChild(header);

  const list = document.createElement('div');
  list.className = 'catalog-list';
  aside.appendChild(list);

  const footer = document.createElement('footer');
  footer.className = 'catalog-footer';

  const qrRow = document.createElement('label');
  qrRow.className = 'catalog-qr';
  const qrCheck = document.createElement('input');
  qrCheck.type = 'checkbox';
  qrCheck.className = 'catalog-qr-check';
  const qrText = document.createElement('span');
  qrText.textContent = 'QR स्क्यान छूट · 2% off';
  qrRow.append(qrCheck, qrText);

  const promoInput = document.createElement('input');
  promoInput.type = 'text';
  promoInput.className = 'catalog-promo';
  promoInput.placeholder = 'प्रोमो कोड · Promo code';
  promoInput.setAttribute('aria-label', 'प्रोमो कोड · Promo code');
  promoInput.spellcheck = false;

  const subtotalRow = document.createElement('div');
  subtotalRow.className = 'catalog-subtotal-row';
  const subtotalLabel = document.createElement('span');
  subtotalLabel.setAttribute('lang', 'ne');
  subtotalLabel.textContent = 'जम्मा';
  const subtotalValue = document.createElement('span');
  subtotalValue.className = 'catalog-subtotal';
  subtotalRow.append(subtotalLabel, subtotalValue);

  const checkoutBtn = document.createElement('button');
  checkoutBtn.type = 'button';
  checkoutBtn.className = 'catalog-checkout';
  checkoutBtn.textContent = 'जम्मा गर्नुहोस् · Checkout';

  footer.append(qrRow, promoInput, subtotalRow, checkoutBtn);
  aside.appendChild(footer);
  host.appendChild(aside);

  const handleKeydown = (/** @type {KeyboardEvent} */ event) => {
    if (event.key === 'Escape') close();
  };
  const handleClose = () => close();
  const handleCheckout = () => onCheckout(qrCheck.checked, promoInput.value);
  closeBtn.addEventListener('click', handleClose);
  checkoutBtn.addEventListener('click', handleCheckout);

  /** @param {HTMLElement} row @param {Sku} sku */
  function rowPrice(row, sku) {
    return /** @type {HTMLElement} */ (row.querySelector('.catalog-price'));
  }

  /** @param {Sku} sku @param {number} vIdx @returns {HTMLElement} */
  function buildRow(sku, vIdx) {
    const item = document.createElement('div');
    item.className = 'catalog-row';
    item.dataset.sku = sku.id;

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'catalog-open';
    const thumb = document.createElement('img');
    thumb.className = 'catalog-thumb';
    thumb.src = imageFor(sku.art);
    thumb.alt = '';
    thumb.width = 48;
    thumb.height = 48;
    thumb.decoding = 'async';
    const names = document.createElement('span');
    names.className = 'catalog-names';
    const nameNp = document.createElement('span');
    nameNp.className = 'catalog-name-np';
    nameNp.setAttribute('lang', 'ne');
    nameNp.textContent = sku.nameNp;
    const nameEn = document.createElement('span');
    nameEn.className = 'catalog-name-en';
    nameEn.textContent = sku.nameEn;
    names.append(nameNp, nameEn);
    const price = document.createElement('span');
    price.className = 'catalog-price';
    const stock = document.createElement('span');
    stock.className = 'catalog-stock';
    open.append(thumb, names, price, stock);

    const controls = document.createElement('div');
    controls.className = 'catalog-controls';
    const select = document.createElement('select');
    select.className = 'catalog-variant';
    select.setAttribute('aria-label', `${sku.nameEn} variant`);
    sku.variants.forEach((variant, idx) => {
      const option = document.createElement('option');
      option.value = String(idx);
      option.textContent = `${variant.label} — ${formatRupees(variant.price)}`;
      select.appendChild(option);
    });
    select.value = String(vIdx);
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'catalog-add';
    add.textContent = '+ थप्नुहोस्';
    controls.append(select, add);
    item.append(open, controls);

    const handleOpen = (/** @type {Event} */ event) => {
      const target = /** @type {HTMLElement} */ (event.target);
      if (target instanceof Element && target.closest('.catalog-controls')) return;
      onInspect(sku, Number(select.value));
    };
    const handleSelect = () => {
      refreshRow(item, sku, Number(select.value));
    };
    item.addEventListener('click', handleOpen);
    select.addEventListener('change', handleSelect);
    add.addEventListener('click', () => {
      const ok = onAdd(sku.id, Number(select.value), 1);
      item.classList.toggle('is-blocked', !ok);
      renderList();
    });

    refreshRow(item, sku, Number(select.value));
    return item;
  }

  /** @param {HTMLElement} item @param {Sku} sku @param {number} vIdx */
  function refreshRow(item, sku, vIdx) {
    const variant = sku.variants[vIdx];
    rowPrice(item, sku).textContent = formatRupees(variant.price);
    const stockEl = /** @type {HTMLElement} */ (item.querySelector('.catalog-stock'));
    const available = stockOf(sku.id) - committedQtyFor(getLines(), sku.id);
    stockEl.textContent = available > 0 ? `स्टक ${available}` : 'सकियो';
    stockEl.classList.toggle('is-out', available <= 0);

    const controls = /** @type {HTMLElement} */ (item.querySelector('.catalog-controls'));
    const select = /** @type {HTMLSelectElement} */ (item.querySelector('.catalog-variant'));
    const existing = getLines().find((line) => line.id === sku.id && line.vIdx === vIdx);
    const oldStepper = controls.querySelector('.catalog-stepper');
    if (oldStepper) oldStepper.remove();
    if (existing) {
      const stepper = document.createElement('div');
      stepper.className = 'catalog-stepper';
      const minus = document.createElement('button');
      minus.type = 'button';
      minus.className = 'catalog-step';
      minus.setAttribute('aria-label', `कम गर्नुहोस् · Less ${sku.nameEn}`);
      minus.textContent = '−';
      minus.addEventListener('click', () => {
        onDecrement(sku.id, vIdx);
        renderList();
      });
      const qty = document.createElement('span');
      qty.className = 'catalog-qty';
      qty.textContent = String(existing.qty);
      const plus = document.createElement('button');
      plus.type = 'button';
      plus.className = 'catalog-step';
      plus.setAttribute('aria-label', `बढी गर्नुहोस् · More ${sku.nameEn}`);
      plus.textContent = '+';
      plus.addEventListener('click', () => {
        onAdd(sku.id, vIdx, 1);
        renderList();
      });
      stepper.append(minus, qty, plus);
      controls.appendChild(stepper);
      const addBtn = /** @type {HTMLElement} */ (item.querySelector('.catalog-add'));
      addBtn.hidden = true;
    } else {
      const addBtn = /** @type {HTMLElement} */ (item.querySelector('.catalog-add'));
      addBtn.hidden = false;
    }
    select.value = String(vIdx);
  }

  function renderList() {
    list.textContent = '';
    const lines = getLines();
    for (const zone of ZONE_ORDER) {
      const heading = document.createElement('h3');
      heading.className = 'catalog-zone';
      heading.setAttribute('lang', 'ne');
      heading.textContent = ZONE_LABELS[zone];
      list.appendChild(heading);
      for (const sku of CATALOG.filter((entry) => entry.zone === zone)) {
        const activeLine = lines.find((line) => line.id === sku.id);
        list.appendChild(buildRow(sku, activeLine ? activeLine.vIdx : 0));
      }
    }
    refreshTotals();
  }

  function refreshTotals() {
    subtotalValue.textContent = formatRupees(cartSubtotal(getLines()));
  }

  function open() {
    if (!aside.hidden) return;
    renderList();
    aside.hidden = false;
    document.addEventListener('keydown', handleKeydown);
    closeBtn.focus();
  }

  function close() {
    if (aside.hidden) return;
    aside.hidden = true;
    document.removeEventListener('keydown', handleKeydown);
  }

  return {
    open,
    close,
    isOpen: () => !aside.hidden,
    refresh() {
      if (aside.hidden) return;
      renderList();
    },
    dispose() {
      document.removeEventListener('keydown', handleKeydown);
      closeBtn.removeEventListener('click', handleClose);
      checkoutBtn.removeEventListener('click', handleCheckout);
      aside.remove();
    },
  };
}
