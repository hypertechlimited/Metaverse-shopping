import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const REPO_ROOT = process.cwd();
const PAYLOAD_BUDGET_BYTES = 5 * 1024 * 1024;
const FOUR_G_BYTES_PER_SECOND = 750_000;
const FOUR_G_TRANSFER_BUDGET_SECONDS = 4;

/** @param {string} dir @param {string[]} out @returns {string[]} */
function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function collectPayloadFiles() {
  return [
    join(REPO_ROOT, 'index.html'),
    ...walk(join(REPO_ROOT, 'src'), []),
    ...walk(join(REPO_ROOT, 'vendor', 'three'), []),
  ];
}

describe('payload wire model', () => {
  const files = collectPayloadFiles();
  const raw = files.reduce((sum, file) => sum + statSync(file).size, 0);
  const wire = files.reduce((sum, file) => sum + gzipSync(readFileSync(file)).length, 0);
  const transferSeconds = (wire * 8) / (FOUR_G_BYTES_PER_SECOND * 8);

  it('keeps the served asset set under the 5 MB payload budget', () => {
    console.log('PAYLOAD-RAW-BYTES ' + raw + ' PAYLOAD-WIRE-GZIP-BYTES ' + wire);
    expect(files.length).toBeGreaterThan(0);
    expect(raw).toBeLessThanOrEqual(PAYLOAD_BUDGET_BYTES);
  });

  it('transfers over a mid-range 4G link within the budget', () => {
    console.log('PAYLOAD-TRANSFER-S ' + transferSeconds.toFixed(2));
    expect(transferSeconds).toBeLessThanOrEqual(FOUR_G_TRANSFER_BUDGET_SECONDS);
  });
});
