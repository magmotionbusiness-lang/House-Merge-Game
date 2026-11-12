/**
 * Balancing bot. Plays every campaign level many times headlessly with the
 * greedy bot, records how many shots each win took, and picks the shot limit
 * that gives the target win rate for that level (95% early, 55-70% late, with
 * easier breathers after each Big Build).
 *
 *   npm run balance                 report only (docs/balance.csv)
 *   npm run balance -- --write      also write the tuned shot limits into levels/*.json
 *   npm run balance -- --runs 1000  more runs per level (default 300)
 *   npm run balance -- --district 2 one district only (run several in parallel)
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
const files = [1, 2, 3, 4, 5, 6, 7, 8].map((d) => `levels/district-${String(d).padStart(2, '0')}.json`);
const ONLY = args.includes('--district') ? Number(args[args.indexOf('--district') + 1]) : 0;

/**
 * Target win rate: falls through each district (33 levels) and a little more
 * with every district, with a dip on each Big Build (every 11th) and an easy
 * breather after it.
 */
function target(district: number, n: number): number {
  if (district === 1 && n <= 3) return 0.97;
  // Districts 1-5 step down 6% each; later districts only 2% more each, so the curve flattens out.
  let t = 0.95 - 0.2 * ((n - 1) / 32) - 0.06 * Math.min(district - 1, 4) - 0.02 * Math.max(0, district - 5);
  if (n % 11 === 0) t -= 0.05; // Big Build
  if (n % 11 === 1 && n > 1) t += 0.1; // breather after a Big Build
  return Math.min(0.97, Math.max(0.5, t));
}

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return NaN;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))];
}

await initPhysics();
const districts = files.map((f) => validateDistrict(JSON.parse(readFileSync(f, 'utf8')) as District));
const rows: string[] = ['level,name,target_win_rate,shot_limit,win_rate,avg_shots_to_win,median_shots,p90_shots,overflow_rate,best_possible_win_rate'];
const t0 = Date.now();

for (const d of districts) {
  if (ONLY && d.id !== ONLY) continue;
  d.levels.forEach((level: LevelDef, i) => {
    const n = i + 1;
    const tgt = target(d.id, n);
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
writeFileSync(ONLY ? `docs/balance-d${ONLY}.csv` : 'docs/balance.csv', rows.join('\n') + '\n');
if (WRITE) files.forEach((f, i) => (!ONLY || districts[i].id === ONLY) && writeFileSync(f, JSON.stringify(districts[i], null, 2) + '\n'));
console.log(`\n${RUNS} runs per level, ${((Date.now() - t0) / 1000).toFixed(0)} s. Wrote docs/balance.csv${WRITE ? ' and tuned shot limits' : ''}.`);
