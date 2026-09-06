import type { Vec2 } from '../core/types';

export const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);
interface Edge { a: number; b: number; length: number; }
interface Attachment { point: Vec2; edge: Edge; distance: number; }

/** Pedestrian graph: block sidewalks and explicit crossings, never diagonal road shortcuts. */
export class SidewalkNavigation {
  readonly nodes: Vec2[] = [];
  readonly edges: Edge[] = [];
  private neighbors: { id: number; cost: number }[][] = [];
  constructor(readonly roads: number[], readonly offset = 10) {
    const axes = [...new Set(roads.flatMap(r => [r - offset, r + offset]))].sort((a, b) => a - b);
    if (axes.length < 2) throw new Error('Navigation requires at least one road.');
    for (const x of axes) for (const z of axes) this.nodes.push({ x, z });
    this.neighbors = this.nodes.map(() => []);
    const connect = (a: number, b: number) => {
      const length = distance(this.nodes[a], this.nodes[b]);
      this.edges.push({ a, b, length });
      this.neighbors[a].push({ id: b, cost: length }); this.neighbors[b].push({ id: a, cost: length });
    };
    for (let x = 0; x < axes.length; x++) for (let z = 0; z < axes.length; z++) {
      const i = x * axes.length + z;
      if (x + 1 < axes.length) connect(i, i + axes.length);
      if (z + 1 < axes.length) connect(i, i + 1);
    }
  }

  private attach(p: Vec2): Attachment {
    let best: Attachment | undefined;
    for (const edge of this.edges) {
      const a = this.nodes[edge.a], b = this.nodes[edge.b];
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.z - a.z) * (b.z - a.z)) / edge.length ** 2));
      const point = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
      const d = distance(p, point);
      if (!best || d < best.distance) best = { edge, point, distance: d };
    }
    return best!;
  }

  project(p: Vec2): Vec2 { return this.attach(p).point; }

  private aStar(start: number, goal: number): { path: Vec2[]; cost: number } {
    const open = new Set([start]), previous = new Map<number, number>();
    const cost = new Map([[start, 0]]);
    while (open.size) {
      let current = -1, score = Infinity;
      for (const id of open) {
        const f = cost.get(id)! + distance(this.nodes[id], this.nodes[goal]);
        if (f < score) { current = id; score = f; }
      }
      if (current === goal) {
        const ids = [goal];
        while (previous.has(ids[0])) ids.unshift(previous.get(ids[0])!);
        return { path: ids.map(id => ({ ...this.nodes[id] })), cost: cost.get(goal)! };
      }
      open.delete(current);
      for (const next of this.neighbors[current]) {
        const newCost = cost.get(current)! + next.cost;
        if (newCost < (cost.get(next.id) ?? Infinity)) { previous.set(next.id, current); cost.set(next.id, newCost); open.add(next.id); }
      }
    }
    return { path: [], cost: Infinity };
  }

  findPath(from: Vec2, to: Vec2): Vec2[] {
    const a = this.attach(from), b = this.attach(to);
    if (a.edge === b.edge) return this.deduplicate([a.point, b.point, { ...to }]);
    let best: { path: Vec2[]; cost: number } = { path: [], cost: Infinity };
    for (const start of [a.edge.a, a.edge.b]) for (const end of [b.edge.a, b.edge.b]) {
      const route = this.aStar(start, end);
      const cost = route.cost + distance(a.point, this.nodes[start]) + distance(b.point, this.nodes[end]);
      if (cost < best.cost) best = { path: route.path, cost };
    }
    return this.deduplicate([a.point, ...best.path, b.point, { ...to }]);
  }

  private deduplicate(path: Vec2[]): Vec2[] { return path.filter((p, i) => !i || distance(p, path[i - 1]) > .01); }
}
