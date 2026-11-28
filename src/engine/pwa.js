export const PWA = {
  swUrl: './sw.js',
  updateToast: 'नयाँ संस्करण तयार छ — पुनः लोड गर्नुहोस्',
};

/**
 * Registers the service worker and surfaces same-session controller swaps as
 * an update toast. Fails soft everywhere: no worker, no insecure context, or a
 * rejected registration all leave the app fully functional online.
 * @param {{ serviceWorker?: { register: (url: string, options?: any) => Promise<any>, addEventListener?: (type: string, handler: () => void) => void } }} nav
 * @param {boolean} secureContext
 * @param {{ onUpdate: () => void }} [handlers]
 * @returns {Promise<boolean>}
 */
export async function registerServiceWork(nav, secureContext, handlers = { onUpdate: () => {} }) {
  const worker = nav.serviceWorker;
  if (!worker || typeof worker.register !== 'function' || !secureContext) return false;
  try {
    await worker.register(PWA.swUrl, { scope: './' });
  } catch {
    return false;
  }
  let announced = false;
  worker.addEventListener?.('controllerchange', () => {
    if (announced) return;
    announced = true;
    handlers.onUpdate();
  });
  return true;
}
