/**
 * Landing funnel overlay: status pill, name input, 4 deal chips, enter button —
 * all over the live 3D street. The scrim does not capture pointers outside the
 * card, so the orbit (d-pad, keyboard) stays live behind the funnel. Deal
 * targets are preset *names* resolved by main.js from `world/layout.js` —
 * this module never hardcodes coordinates.
 */

export const LANDING_DEALS = [
  { id: 'waiwai-5pack', name: 'Wai Wai 5-pack', price: 'रू 95', preset: 'Front Pedi' },
  { id: 'ilam-tea-250g', name: 'Ilam Tea 250g', price: 'रू 180', preset: 'Counter' },
  { id: 'gungdi-ghee', name: 'Gungdi Ghee', price: 'रू 420', preset: 'Back Rack' },
  { id: 'marsyangdi-rice-5kg', name: 'Marsyangdi Rice 5kg', price: 'रू 310', preset: 'Corner' },
];

export const LANDING = {
  fadeOutMs: 650,
  nameMaxLength: 40,
};

/**
 * @param {HTMLElement} host
 * @param {object} handlers
 * @param {string} [handlers.initialName]
 * @param {(payload: { name: string, preset: string | null }) => void} handlers.onEnter
 * @returns {{ dismiss: () => void, dispose: () => void }}
 */
export function createLandingOverlay(host, { initialName = '', onEnter }) {
  if (typeof onEnter !== 'function') throw new Error('landing overlay requires onEnter');

  const section = document.createElement('section');
  section.className = 'landing';
  section.setAttribute('role', 'dialog');
  section.setAttribute('aria-modal', 'true');
  section.setAttribute('aria-label', 'पसलमा प्रवेश · Enter the pasal');

  const inner = document.createElement('div');
  inner.className = 'landing-inner';
  section.appendChild(inner);

  const pill = document.createElement('div');
  pill.className = 'landing-pill';
  const dot = document.createElement('span');
  dot.className = 'landing-dot';
  dot.setAttribute('aria-hidden', 'true');
  pill.appendChild(dot);
  pill.appendChild(document.createTextNode('पसल खुला · Open now'));
  inner.appendChild(pill);

  const title = document.createElement('h1');
  title.className = 'landing-title';
  title.setAttribute('lang', 'ne');
  title.textContent = 'सगरमाथा कर्नर पसल';
  inner.appendChild(title);

  const sub = document.createElement('p');
  sub.className = 'landing-sub';
  sub.textContent = 'A Newari corner pasal, alive in your browser. Pick a deal or walk in.';
  inner.appendChild(sub);

  const form = document.createElement('form');
  form.className = 'landing-form';
  form.setAttribute('novalidate', '');
  inner.appendChild(form);

  const label = document.createElement('label');
  label.className = 'landing-label';
  label.setAttribute('for', 'landing-name');
  label.textContent = 'तपाईंको नाम · Your name';
  form.appendChild(label);

  const input = document.createElement('input');
  input.className = 'landing-input';
  input.id = 'landing-name';
  input.name = 'visitorName';
  input.type = 'text';
  input.maxLength = LANDING.nameMaxLength;
  input.autocomplete = 'given-name';
  input.placeholder = 'आफ्नो नाम लेख्नुहोस्';
  input.value = initialName;
  form.appendChild(input);

  const deals = document.createElement('ul');
  deals.className = 'landing-deals';
  deals.setAttribute('aria-label', "आजका छुट · Today's deals");
  for (const deal of LANDING_DEALS) {
    const item = document.createElement('li');
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'deal-chip';
    chip.dataset.deal = deal.id;
    chip.setAttribute('aria-label', `${deal.name}, ${deal.price} — enter the pasal at this deal`);
    const name = document.createElement('span');
    name.className = 'deal-name';
    name.textContent = deal.name;
    const price = document.createElement('span');
    price.className = 'deal-price';
    price.textContent = deal.price;
    chip.append(name, price);
    item.appendChild(chip);
    deals.appendChild(item);
  }
  form.appendChild(deals);

  const enterButton = document.createElement('button');
  enterButton.type = 'submit';
  enterButton.className = 'landing-enter';
  enterButton.textContent = 'पसलमा प्रवेश · Enter the pasal';
  form.appendChild(enterButton);

  const hint = document.createElement('p');
  hint.className = 'landing-hint';
  hint.textContent = 'Deal chips fly you to their shelf. Use the pad to look around first.';
  inner.appendChild(hint);

  host.appendChild(section);

  /** @type {number | undefined} */
  let removalTimer;
  let done = false;

  /**
   * @param {string} id
   * @returns {string | null}
   */
  function presetFor(id) {
    const deal = LANDING_DEALS.find((candidate) => candidate.id === id);
    return deal ? deal.preset : null;
  }

  /**
   * @param {string | null} preset
   */
  function enter(preset) {
    if (done) return;
    done = true;
    onEnter({ name: input.value.trim(), preset });
    dismiss();
  }

  function onSubmit(/** @type {SubmitEvent} */ event) {
    event.preventDefault();
    enter(null);
  }

  function onChipClick(/** @type {Event} */ event) {
    const target = /** @type {HTMLElement} */ (event.target);
    if (!(target instanceof HTMLButtonElement)) return;
    enter(presetFor(target.dataset.deal ?? ''));
  }

  form.addEventListener('submit', onSubmit);
  deals.addEventListener('click', onChipClick);

  function dismiss() {
    section.classList.add('is-leaving');
    removalTimer = window.setTimeout(() => {
      section.remove();
      removalTimer = undefined;
    }, LANDING.fadeOutMs + 50);
  }

  return {
    dismiss,
    dispose() {
      if (removalTimer !== undefined) {
        window.clearTimeout(removalTimer);
        removalTimer = undefined;
      }
      form.removeEventListener('submit', onSubmit);
      deals.removeEventListener('click', onChipClick);
      section.remove();
    },
  };
}
