/**
 * HUD commerce strip: jhola (cart) button with count badge and live subtotal.
 * Hidden on the landing screen via `body[data-mode]`; pointers are enabled
 * only on the button itself (the #hud host is pointer-events: none).
 */

import { formatRupees } from '../commerce/pricing.js';

export const HUD = {
  badgeMax: 99,
};

/**
 * @param {HTMLElement} host
 * @param {{ onCartClick: () => void }} handlers
 * @returns {{ setCart: (count: number, subtotal: number) => void, dispose: () => void }}
 */
export function createHud(host, { onCartClick }) {
  if (typeof onCartClick !== 'function') throw new Error('hud requires onCartClick');

  const strip = document.createElement('div');
  strip.className = 'hud-commerce';

  const cartButton = document.createElement('button');
  cartButton.type = 'button';
  cartButton.className = 'hud-cart';
  cartButton.setAttribute('aria-label', 'झोला खोल्नुहोस् · Open the jhola');

  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  icon.classList.add('hud-cart-icon');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M7 9V7a5 5 0 0 1 10 0v2h2.2a1 1 0 0 1 1 .88l1 8A2 2 0 0 1 19.21 20H4.79a2 2 0 0 1-1.99-2.12l1-8A1 1 0 0 1 4.8 9Zm2 0h6V7a3 3 0 0 0-6 0Z');
  icon.appendChild(path);
  cartButton.appendChild(icon);

  const badge = document.createElement('span');
  badge.className = 'hud-cart-badge';
  badge.setAttribute('aria-hidden', 'true');
  badge.textContent = '0';
  cartButton.appendChild(badge);

  const subtotalEl = document.createElement('span');
  subtotalEl.className = 'hud-cart-subtotal';
  subtotalEl.textContent = formatRupees(0);
  cartButton.appendChild(subtotalEl);

  const label = document.createElement('span');
  label.className = 'hud-cart-label';
  label.textContent = 'झोला';
  cartButton.appendChild(label);

  const handleClick = () => onCartClick();
  cartButton.addEventListener('click', handleClick);
  strip.appendChild(cartButton);
  host.appendChild(strip);

  return {
    /** @param {number} count @param {number} subtotal */
    setCart(count, subtotal) {
      badge.textContent = count > HUD.badgeMax ? `${HUD.badgeMax}+` : String(count);
      badge.classList.toggle('is-empty', count === 0);
      subtotalEl.textContent = formatRupees(subtotal);
      cartButton.disabled = count === 0;
    },
    dispose() {
      cartButton.removeEventListener('click', handleClick);
      strip.remove();
    },
  };
}
