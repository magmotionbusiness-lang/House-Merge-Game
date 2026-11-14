import { Capacitor } from '@capacitor/core';

/** True inside the iOS/Android app, false in a browser. */
export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
