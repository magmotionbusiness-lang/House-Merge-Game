/** localStorage that never throws (private mode, blocked storage). */
export const store = {
  str(key: string, fallback: string): string {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  },
  num(key: string, fallback: number): number {
    const v = Number(this.str(key, ''));
    return Number.isFinite(v) && this.str(key, '') !== '' ? v : fallback;
  },
  set(key: string, value: string | number) {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      /* ignore */
    }
  },
};
