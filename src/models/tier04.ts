import { Builder, base, shade } from './kit';
import { chimney } from './parts';

/** Log Cabin: stacked round logs, a dark roof, a stone chimney and a porch step. */
export function build(_H: number, color: string) {
  const b = new Builder();
  const y = base(b, color);
  const w = 0.66;
  const d = 0.5;
  const logs = 5;
  const lr = 0.035;
  for (let i = 0; i < logs; i++) {
    const ly = y + lr + i * lr * 2;
    b.cyl(lr, lr, w + 0.06, 'wood', i % 2 ? color : shade(color, 1.12), { y: ly, x: -(w + 0.06) / 2, z: d / 2 - lr, rz: -Math.PI / 2 }, 8);
    b.cyl(lr, lr, w + 0.06, 'wood', i % 2 ? color : shade(color, 1.12), { y: ly, x: -(w + 0.06) / 2, z: -d / 2 + lr, rz: -Math.PI / 2 }, 8);
  }
  b.box(w - 0.02, logs * lr * 2, d - 0.04, 'wood', shade(color, 0.9), { y });
  b.gable(w, 0.24, d, 'roof', shade(color, 0.62), { y: y + logs * lr * 2 }, 0.07);
  b.box(0.14, 0.24, 0.02, 'wood', shade(color, 0.55), { y, z: d / 2 + 0.005 });
  b.box(0.12, 0.1, 0.02, 'gloss', '#ffd98a', { y: y + 0.13, x: 0.2, z: d / 2 + 0.005 });
  b.box(0.22, 0.03, 0.08, 'matte', '#9e9e9e', { y, z: d / 2 + 0.05 });
  chimney(b, -0.22, -0.08, y + 0.3, 0.2);
  return b.finish();
}
