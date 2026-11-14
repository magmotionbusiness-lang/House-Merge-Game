import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { isNative } from './platform';

/**
 * Native app glue: light status bar text over the game, the launch screen
 * handed over to the game's own loading screen as soon as the page paints,
 * and pause/resume hooks (the game saves and pauses when the app goes to the
 * background, even when iOS doesn't fire visibilitychange).
 */
export function initNative(hooks: { pause(): void; resume?(): void }) {
  if (!isNative) return;
  void StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
  void StatusBar.setOverlaysWebView({ overlay: true }).catch(() => undefined);
  requestAnimationFrame(() => void SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => undefined));
  void App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) hooks.pause();
    else hooks.resume?.();
  });
  document.documentElement.classList.add('native');
}
