import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const POST = {
  bloom: { strength: 0.32, radius: 0.5, threshold: 0.82 },
  highTierEffectiveWidth: 1600,
};

/**
 * Quality tier: high adds bloom; low keeps the composer (tone mapping + sRGB via OutputPass)
 * but skips the multi-pass blur so constrained GPUs (software rasterizers, small phones)
 * keep the frame budget. The decision is a pixel-budget rule on effective width.
 * @param {number} width @param {number} pixelRatio @returns {'high' | 'low'}
 */
export function postTier(width, pixelRatio) {
  return width * pixelRatio >= POST.highTierEffectiveWidth ? 'high' : 'low';
}

/**
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene} scene
 * @param {THREE.PerspectiveCamera} camera
 * @param {{ width: number, height: number, tier?: 'high' | 'low' }} spec
 * @returns {{ tier: 'high' | 'low', render: () => void, setSize: (width: number, height: number) => void, dispose: () => void } | null}
 */
export function createPostChain(renderer, scene, camera, { width, height, tier }) {
  try {
    const resolvedTier = tier ?? postTier(width, renderer.getPixelRatio());
    const composer = new EffectComposer(renderer);
    composer.setSize(width, height);
    composer.addPass(new RenderPass(scene, camera));
    let bloom = null;
    if (resolvedTier === 'high') {
      bloom = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        POST.bloom.strength,
        POST.bloom.radius,
        POST.bloom.threshold,
      );
      composer.addPass(bloom);
    }
    composer.addPass(new OutputPass());
    return {
      tier: resolvedTier,
      render() {
        composer.render();
      },
      setSize(nextWidth, nextHeight) {
        composer.setSize(nextWidth, nextHeight);
      },
      dispose() {
        if (bloom) bloom.dispose();
        composer.dispose();
      },
    };
  } catch {
    return null;
  }
}
