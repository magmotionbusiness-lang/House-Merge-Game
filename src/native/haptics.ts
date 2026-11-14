import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNative } from './platform';
import { settings } from '../game/settings';

/**
 * Haptics for the moments that matter. Native: the iPhone Taptic Engine.
 * Web: navigator.vibrate where the browser supports it (Android), else nothing.
 * Off when the player turns Vibration off in Settings.
 */
const web = (ms: number | number[]) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
};

let last = 0;
/** Never more than ~25 buzzes a second, so big chains don't turn into a drone. */
const allow = () => {
  const now = performance.now();
  if (now - last < 40) return false;
  last = now;
  return settings.haptics !== false;
};

export const haptics = {
  /** UI taps and the shot leaving the launcher. */
  light() {
    if (!allow()) return;
    if (isNative) void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
    else web(8);
  },
  /** A merge: heavier for bigger buildings and longer combos. */
  merge(tier: number, combo: number) {
    if (!allow()) return;
    const style = tier >= 10 || combo >= 3 ? ImpactStyle.Heavy : tier >= 6 || combo >= 2 ? ImpactStyle.Medium : ImpactStyle.Light;
    if (isNative) void Haptics.impact({ style }).catch(() => undefined);
    else web(style === ImpactStyle.Heavy ? 30 : style === ImpactStyle.Medium ? 18 : 10);
  },
  /** Level complete, new best, a new map. */
  success() {
    if (!allow()) return;
    if (isNative) void Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
    else web([20, 40, 30]);
  },
  /** The board overflowed. */
  fail() {
    if (!allow()) return;
    if (isNative) void Haptics.notification({ type: NotificationType.Error }).catch(() => undefined);
    else web([40, 30, 40]);
  },
};
