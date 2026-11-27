/**
 * Printable receipt. `buildBill` is pure data (unit-tested in node);
 * `renderBill` is the DOM twin — one bill shape, two consumers, so the
 * printed receipt and the on-screen review are always identical.
 */

import { getSku } from './catalog.js';
import { formatRupees } from './pricing.js';

/** @typedef {import('./cart.js').PricedCartLine} PricedCartLine */
/** @typedef {import('./pricing.js').PricingSummary} PricingSummary */

/** @typedef {{ id: string, nameNp: string, nameEn: string, variantLabel: string, qty: number, unitPrice: number, lineTotal: number }} BillLine */

/** @typedef {{ orderId: string, dateIso: string, visitorName: string, lines: BillLine[], summary: PricingSummary }} Bill */

/** @returns {string} 'SM-<epochBase36>' — timestamp-derived, no schema field needed */
export function newBillId(now = Date.now()) {
  return `SM-${now.toString(36).toUpperCase()}`;
}

/**
 * @param {PricedCartLine[]} pricedLines
 * @param {PricingSummary} summary
 * @param {{ orderId: string, dateIso: string, visitorName: string }} meta
 * @returns {Bill}
 */
export function buildBill(pricedLines, summary, { orderId, dateIso, visitorName }) {
  const lines = pricedLines.map((line) => {
    const sku = getSku(line.id);
    return {
      id: line.id,
      nameNp: sku.nameNp,
      nameEn: sku.nameEn,
      variantLabel: sku.variants[line.vIdx].label,
      qty: line.qty,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
    };
  });
  return { orderId, dateIso, visitorName, lines, summary };
}

/** @param {Bill} bill @returns {Array<{ label: string, value: string }>} */
export function billTotals(bill) {
  const { summary } = bill;
  /** @type {Array<{ label: string, value: string }>} */
  const rows = [{ label: 'जम्मा · Subtotal', value: formatRupees(summary.subtotal) }];
  if (summary.qrDiscount > 0) rows.push({ label: 'QR छूट · QR discount (2%)', value: `− ${formatRupees(summary.qrDiscount)}` });
  if (summary.namasteDiscount > 0) rows.push({ label: 'NAMASTE5 छूट', value: `− ${formatRupees(summary.namasteDiscount)}` });
  if (summary.patanDiscount > 0) rows.push({ label: 'PATAN100 छूट', value: `− ${formatRupees(summary.patanDiscount)}` });
  rows.push({ label: 'डेलिभरी · Delivery', value: summary.deliveryFee === 0 ? 'नि:शुल्क · Free' : formatRupees(summary.deliveryFee) });
  rows.push({ label: 'कुल · Total', value: formatRupees(summary.total) });
  return rows;
}

/**
 * @param {HTMLElement} host
 * @param {Bill} bill
 * @param {{ onPrint?: () => void, onClose?: () => void }} [handlers]
 * @returns {{ dispose: () => void }}
 */
export function renderBill(host, bill, { onPrint, onClose } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'bill-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'बिल · Receipt');

  const paper = document.createElement('article');
  paper.className = 'bill-paper';
  overlay.appendChild(paper);

  const shop = document.createElement('header');
  shop.className = 'bill-shop';
  const shopName = document.createElement('p');
  shopName.className = 'bill-shop-name';
  shopName.setAttribute('lang', 'ne');
  shopName.textContent = 'सगरमाथा कर्नर पसल';
  const shopSub = document.createElement('p');
  shopSub.className = 'bill-shop-sub';
  shopSub.textContent = 'Mangal Bazar, Patan · Sagarmatha Metaverse';
  shop.append(shopName, shopSub);
  paper.appendChild(shop);

  const meta = document.createElement('div');
  meta.className = 'bill-meta';
  const orderNo = document.createElement('span');
  orderNo.className = 'bill-order-id';
  orderNo.textContent = bill.orderId;
  const orderDate = document.createElement('span');
  orderDate.textContent = new Date(bill.dateIso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  meta.append(orderNo, orderDate);
  paper.appendChild(meta);

  if (bill.visitorName) {
    const customer = document.createElement('p');
    customer.className = 'bill-customer';
    customer.textContent = `ग्राहक · ${bill.visitorName}`;
    paper.appendChild(customer);
  }

  const table = document.createElement('ul');
  table.className = 'bill-lines';
  for (const line of bill.lines) {
    const row = document.createElement('li');
    row.className = 'bill-line';
    const name = document.createElement('span');
    name.className = 'bill-line-name';
    name.setAttribute('lang', 'ne');
    name.textContent = `${line.nameNp} (${line.variantLabel}) × ${line.qty}`;
    const amount = document.createElement('span');
    amount.className = 'bill-line-amount';
    amount.textContent = formatRupees(line.lineTotal);
    row.append(name, amount);
    table.appendChild(row);
  }
  paper.appendChild(table);

  const totals = document.createElement('ul');
  totals.className = 'bill-totals';
  for (const row of billTotals(bill)) {
    const rowEl = document.createElement('li');
    rowEl.className = 'bill-total';
    if (row.label.startsWith('कुल')) rowEl.classList.add('bill-total-grand');
    const label = document.createElement('span');
    label.setAttribute('lang', 'ne');
    label.textContent = row.label;
    const value = document.createElement('span');
    value.textContent = row.value;
    rowEl.append(label, value);
    totals.appendChild(rowEl);
  }
  paper.appendChild(totals);

  const actions = document.createElement('div');
  actions.className = 'bill-actions';
  const printBtn = document.createElement('button');
  printBtn.type = 'button';
  printBtn.className = 'bill-print';
  printBtn.textContent = 'प्रिन्ट · Print';
  const handlePrint = () => (onPrint ?? window.print)();
  printBtn.addEventListener('click', handlePrint);
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'bill-close';
  closeBtn.textContent = 'बन्द · Close';
  const handleClose = () => onClose?.();
  closeBtn.addEventListener('click', handleClose);
  actions.append(printBtn, closeBtn);
  paper.appendChild(actions);

  host.appendChild(overlay);

  return {
    dispose() {
      printBtn.removeEventListener('click', handlePrint);
      closeBtn.removeEventListener('click', handleClose);
      overlay.remove();
    },
  };
}
