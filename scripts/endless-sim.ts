/** How far does the bot get in Endless? Highest tier reached before the site overflows. */
import { initPhysics } from '../src/physics/world';
import { Sim, greedyBot } from '../src/sim/sim';
import { Rng } from '../src/core/rng';
import { endlessContract, isComplete } from '../src/core/contracts';

// Usage: npx tsx scripts/endless-sim.ts [runs]   (DELIVER=0 turns contract delivery off)
await initPhysics();
const runs = Number(process.argv[2] ?? 30);
const results: number[] = [];
const shots: number[] = [];
for (let r = 0; r < runs; r++) {
  const sim = new Sim({ id: 'e', name: 'endless', shots: null, contracts: [{ tier: 3, count: 1 }] }, 500 + r);
  const rng = new Rng(r + 1);
  const bot = greedyBot(new Rng(r + 77));
  sim.deliver = process.env.DELIVER !== '0';
  sim.contracts = [endlessContract(rng, 3), endlessContract(rng, 4)];
  while (!sim.overflow && sim.shots < Number(process.env.MAXSHOTS ?? 600)) {
    sim.shoot(bot(sim));
    // Endless refills finished contracts.
    sim.contracts = sim.contracts.map((c) => (isComplete(c) ? endlessContract(rng, Math.max(sim.highest, 4), sim.contracts.map((o) => o.tier)) : c));
  }
  results.push(sim.highest);
  shots.push(sim.shots);
  sim.free();
}
results.sort((a, b) => a - b);
const avg = (a: number[]) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
console.log(`runs ${runs} · highest tier: median ${results[Math.floor(runs / 2)]}, max ${results[runs - 1]}, avg ${avg(results)} · shots avg ${avg(shots)}`);
console.log('distribution', results.join(' '));
