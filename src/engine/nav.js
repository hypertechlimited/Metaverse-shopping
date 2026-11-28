export const NAV = {
  cellSize: 0.5,
  snapSearchCells: 8,
};

/**
 * Deterministic grid navigation over the collision world. Pure math — no
 * Three.js, no DOM. Obstacles are inflated by the walker radius before the
 * grid is blocked, so any cell center is a standable point.
 *
 * @typedef {[number, number]} Vec2
 */

/**
 * @param {number} seed @returns {() => number} deterministic PRNG for fuzz tests
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @typedef {object} NavGrid
 * @property {number} cellSize
 * @property {number} originX
 * @property {number} originZ
 * @property {number} maxX
 * @property {number} maxZ
 * @property {number} cols
 * @property {number} rows
 * @property {Uint8Array} blocked
 * @property {Array<{ minX: number, maxX: number, minZ: number, maxZ: number }>} obstacles
 */

/**
 * @param {Array<{ minX: number, maxX: number, minZ: number, maxZ: number }>} boxes
 * @param {{ minX: number, maxX: number, minZ: number, maxZ: number }} street
 * @param {{ cellSize?: number, radius?: number }} [options]
 * @returns {NavGrid}
 */
export function buildNavGrid(boxes, street, options = {}) {
  const cellSize = options.cellSize ?? NAV.cellSize;
  const radius = options.radius ?? 0;
  if (!(cellSize > 0)) throw new Error('buildNavGrid requires a positive cellSize');
  const cols = Math.ceil((street.maxX - street.minX) / cellSize);
  const rows = Math.ceil((street.maxZ - street.minZ) / cellSize);
  const blocked = new Uint8Array(cols * rows);
  const inflated = boxes.map((box) => ({
    minX: box.minX - radius,
    maxX: box.maxX + radius,
    minZ: box.minZ - radius,
    maxZ: box.maxZ + radius,
  }));
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = street.minX + (col + 0.5) * cellSize;
      const z = street.minZ + (row + 0.5) * cellSize;
      for (const box of inflated) {
        if (x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ) {
          blocked[row * cols + col] = 1;
          break;
        }
      }
    }
  }
  return { cellSize, originX: street.minX, originZ: street.minZ, maxX: street.maxX, maxZ: street.maxZ, cols, rows, blocked, obstacles: inflated };
}

/**
 * @param {NavGrid} grid @param {number} col @param {number} row
 * @returns {Vec2} center of cell (col, row) in world space
 */
export function cellCenter(grid, col, row) {
  return [grid.originX + (col + 0.5) * grid.cellSize, grid.originZ + (row + 0.5) * grid.cellSize];
}

/**
 * @param {NavGrid} grid @param {number} x @param {number} z @returns {[number, number]}
 */
function worldToCell(grid, x, z) {
  return [
    Math.min(grid.cols - 1, Math.max(0, Math.floor((x - grid.originX) / grid.cellSize))),
    Math.min(grid.rows - 1, Math.max(0, Math.floor((z - grid.originZ) / grid.cellSize))),
  ];
}

/**
 * @param {NavGrid} grid @param {number} col @param {number} row @returns {boolean}
 */
function isBlocked(grid, col, row) {
  if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) return true;
  return grid.blocked[row * grid.cols + col] === 1;
}

/**
 * Nearest walkable cell by expanding square rings; deterministic scan order.
 * @param {NavGrid} grid @param {number} col @param {number} row @param {number} maxRings
 * @returns {[number, number] | null}
 */
function nearestWalkable(grid, col, row, maxRings) {
  if (!isBlocked(grid, col, row)) return [col, row];
  for (let ring = 1; ring <= maxRings; ring++) {
    for (let dc = -ring; dc <= ring; dc++) {
      for (let dr = -ring; dr <= ring; dr++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== ring) continue;
        if (!isBlocked(grid, col + dc, row + dr)) return [col + dc, row + dr];
      }
    }
  }
  return null;
}

/**
 * @param {NavGrid} grid @param {number} x @param {number} z @returns {boolean} world point stands clear of inflated obstacles
 */
export function isWalkable(grid, x, z) {
  if (x < grid.originX || x > grid.maxX || z < grid.originZ || z > grid.maxZ) return false;
  const [col, row] = worldToCell(grid, x, z);
  return !isBlocked(grid, col, row);
}

/**
 * Segment walkable by sampling every half-cell against the blocked grid.
 * Endpoints assumed walkable.
 * @param {NavGrid} grid @param {Vec2} a @param {Vec2} b @returns {boolean}
 */
export function lineOfSight(grid, a, b) {
  if (!isWalkable(grid, a[0], a[1]) || !isWalkable(grid, b[0], b[1])) return false;
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  for (const box of grid.obstacles) {
    let tMin = 0;
    let tMax = 1;
    let miss = false;
    const axes = [[a[0], dx, box.minX, box.maxX], [a[1], dz, box.minZ, box.maxZ]];
    for (const axis of axes) {
      const origin = axis[0];
      const delta = axis[1];
      if (Math.abs(delta) < 1e-9) {
        if (origin < axis[2] || origin > axis[3]) {
          miss = true;
          break;
        }
        continue;
      }
      let t1 = (axis[2] - origin) / delta;
      let t2 = (axis[3] - origin) / delta;
      if (t1 > t2) {
        const swap = t1;
        t1 = t2;
        t2 = swap;
      }
      if (t1 > tMin) tMin = t1;
      if (t2 < tMax) tMax = t2;
      if (tMin > tMax) {
        miss = true;
        break;
      }
    }
    if (!miss) return false;
  }
  return true;
}

const NEIGHBOR_OFFSETS = /** @type {const} */ ([
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
]);

/**
 * @param {number} dc @param {number} dr @returns {number} octile step cost
 */
function stepCost(dc, dr) {
  return dc !== 0 && dr !== 0 ? Math.SQRT2 : 1;
}

/**
 * 8-direction A* with the no-corner-cutting rule: a diagonal is only
 * expanded when both orthogonal neighbors are free.
 * @param {NavGrid} grid @param {Vec2} from @param {Vec2} to
 * @returns {Vec2[] | null} waypoint list in world space, or null when unreachable
 */
export function findPath(grid, from, to) {
  const startCell = nearestWalkable(grid, ...worldToCell(grid, from[0], from[1]), NAV.snapSearchCells);
  const goalCell = nearestWalkable(grid, ...worldToCell(grid, to[0], to[1]), NAV.snapSearchCells);
  if (!startCell || !goalCell) return null;
  const [startCol, startRow] = startCell;
  const [goalCol, goalRow] = goalCell;
  const size = grid.cols * grid.rows;
  const gScore = new Float64Array(size).fill(Infinity);
  const parent = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const startIndex = startRow * grid.cols + startCol;
  const goalIndex = goalRow * grid.cols + goalCol;
  gScore[startIndex] = 0;
  /** @param {number} index */
  const heuristic = (index) => {
    const col = index % grid.cols;
    const row = Math.floor(index / grid.cols);
    const dc = Math.abs(col - goalCol);
    const dr = Math.abs(row - goalRow);
    return Math.max(dc, dr) + (Math.SQRT2 - 1) * Math.min(dc, dr);
  };
  const open = [startIndex];
  const fScore = new Float64Array(size).fill(Infinity);
  fScore[startIndex] = heuristic(startIndex);
  while (open.length > 0) {
    let bestAt = 0;
    for (let i = 1; i < open.length; i++) {
      if (fScore[open[i]] < fScore[open[bestAt]]) bestAt = i;
    }
    const current = /** @type {number} */ (open.splice(bestAt, 1)[0]);
    if (current === goalIndex) break;
    closed[current] = 1;
    const col = current % grid.cols;
    const row = Math.floor(current / grid.cols);
    for (const [dc, dr] of NEIGHBOR_OFFSETS) {
      const nextCol = col + dc;
      const nextRow = row + dr;
      if (isBlocked(grid, nextCol, nextRow)) continue;
      if (dc !== 0 && dr !== 0 && (isBlocked(grid, col + dc, row) || isBlocked(grid, col, row + dr))) continue;
      const nextIndex = nextRow * grid.cols + nextCol;
      if (closed[nextIndex]) continue;
      const tentative = gScore[current] + stepCost(dc, dr);
      if (tentative < gScore[nextIndex]) {
        gScore[nextIndex] = tentative;
        fScore[nextIndex] = tentative + heuristic(nextIndex);
        parent[nextIndex] = current;
        if (!open.includes(nextIndex)) open.push(nextIndex);
      }
    }
  }
  if (gScore[goalIndex] === Infinity) return null;
  /** @type {number[]} */
  const cellPath = [];
  for (let at = goalIndex; at !== -1; at = parent[at]) cellPath.push(at);
  cellPath.reverse();
  /** @type {Vec2[]} */
  const dense = cellPath.map((index) => cellCenter(grid, index % grid.cols, Math.floor(index / grid.cols)));
  return stringPull(grid, dense);
}

/**
 * Iterative line-of-sight smoothing: keep only the waypoints that are
 * actually needed to steer around inflated obstacles.
 * @param {NavGrid} grid @param {Vec2[]} dense @returns {Vec2[]}
 */
export function stringPull(grid, dense) {
  if (dense.length <= 2) return dense.map((point) => [...point]);
  /** @type {Vec2[]} */
  const pulled = [dense[0]];
  let anchor = 0;
  for (let candidate = 1; candidate < dense.length; candidate++) {
    if (!lineOfSight(grid, dense[anchor], dense[candidate])) {
      if (candidate - 1 > anchor) pulled.push(dense[candidate - 1]);
      anchor = candidate - 1;
    }
  }
  if (anchor < dense.length - 1) pulled.push(dense[dense.length - 1]);
  return pulled;
}
