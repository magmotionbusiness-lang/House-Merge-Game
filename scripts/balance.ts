/**
 * Balancing bot. Plays every campaign level many times headlessly with the
 * greedy bot, records how many shots each win took, and picks the shot limit
 * that gives the target win rate for that level (95% early, 55-70% late, with
 * easier breathers after each Big Build).
 *
 *   npm run balance                 report only (docs/balance.csv)
 *   npm run balance -- --write      also write the tuned shot limits into levels/*.json
 *   npm run balance -- --runs 1000  more runs per level (default 300)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { initPhysics } from '../src/physics/world';
import { Sim, greedyBot } from '../src/sim/sim';
import { Rng } from '../src/core/rng';
import { validateDistrict, type District, type LevelDef } from '../src/core/levels';

const args = process.argv.slice(2);
const RUNS = Number(args[args.indexOf('--runs') + 1]) || 300;
const WRITE = args.includes('--write');
const MAX_SHOTS = 220;
const files = ['levels/district-01.json', 'levels/district-02.json', 'levels/district-03.json'];

/** Target win rate by position in the campaign: a gentle slope with sawtooth breathers. */
function target(index: number, total: number, n: number): number {
  if (index < 3) return 0.97;
  let t = 0.95 - 0.33 * (index / (total - 1));
  if (n % 5 === 0) t -= 0.05; // Big Build
  if (n % 5 === 1 && n > 1) t += 0.12; // breather after a Big Build
  return Math.min(0.97, Math.max(0.55, t));
}

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return NaN;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))];
}

await initPhysics();
const districts = files.map((f) => validateDistrict(JSON.parse(readFileSync(f, 'utf8')) as District));
const total = districts.reduce((a, d) => a + d.levels.length, 0);
const rows: string[] = ['level,name,target_win_rate,shot_limit,win_rate,avg_shots_to_win,median_shots,p90_shots,overflow_rate,best_possible_win_rate'];
let index = 0;
const t0 = Date.now();

for (const d of districts) {
  d.levels.forEach((level: LevelDef, i) => {
    const n = i + 1;
    const tgt = target(index++, total, n);
    const winsAt: number[] = [];
    let overflow = 0;
    for (let r = 0; r < RUNS; r++) {
      const sim = new Sim({ ...level, shots: null }, 1000 + r * 7919);
      const res = sim.play(greedyBot(new Rng(r * 31 + 7)), MAX_SHOTS);
      if (res.win) winsAt.push(res.shots);
      if (res.overflow) overflow++;
      sim.free();
    }
    winsAt.sort((a, b) => a - b);
    const best = winsAt.length / RUNS;
    // The smallest limit that still lets `tgt` of the runs finish (bounded by what the bot can do at all).
    const q = Math.min(1, tgt / Math.max(best, 1e-9));
    let shots = quantile(winsAt, q);
    if (!Number.isFinite(shots)) shots = MAX_SHOTS;
    shots = Math.max(8, Math.ceil(shots));
    const winRate = winsAt.filter((s) => s <= shots).length / RUNS;
    const avg = winsAt.length ? winsAt.reduce((a, b) => a + b, 0) / winsAt.length : NaN;
    rows.push(
      [level.id, JSON.stringify(level.name), tgt.toFixed(2), shots, winRate.toFixed(3), avg.toFixed(1), quantile(winsAt, 0.5), quantile(winsAt, 0.9), (overflow / RUNS).toFixed(3), best.toFixed(3)].join(','),
    );
    const flag = best < tgt ? '  <-- too hard even with unlimited shots' : '';
    console.log(`${level.id.padEnd(5)} target ${tgt.toFixed(2)}  limit ${String(shots).padStart(3)}  win ${winRate.toFixed(2)}  avg ${avg.toFixed(1)}  overflow ${(overflow / RUNS).toFixed(2)}${flag}`);
    if (WRITE) level.shots = shots;
  });
}

mkdirSync('docs', { recursive: true });
writeFileSync('docs/balance.csv', rows.join('\n') + '\n');
if (WRITE) files.forEach((f, i) => writeFileSync(f, JSON.stringify(districts[i], null, 2) + '\n'));
console.log(`\n${RUNS} runs per level, ${((Date.now() - t0) / 1000).toFixed(0)} s. Wrote docs/balance.csv${WRITE ? ' and tuned shot limits' : ''}.`);
