/**
 * Transient greeting toast, aria-live polite, auto-dismisses.
 */

export const TOAST = {
  durationMs: 3400,
};

/**
 * @param {HTMLElement} host
 * @param {string} message
 * @param {{ durationMs?: number }} [options]
 * @returns {{ dispose: () => void }}
 */
export function createToast(host, message, { durationMs = TOAST.durationMs } = {}) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = message;
  host.appendChild(toast);

  const timer = window.setTimeout(() => toast.remove(), durationMs);

  return {
    dispose() {
      window.clearTimeout(timer);
      toast.remove();
    },
  };
}
