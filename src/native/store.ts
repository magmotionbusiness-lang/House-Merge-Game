import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { isNative } from './platform';
import { NATIVE_IDS } from './ids';
import { store as storage } from '../game/storage';

/**
 * In-app purchases (StoreKit, no server needed): a one-time "Remove Ads".
 * It sets the same `bm.noads` flag the ad rules already honour, so
 * between-round ads stop for good; rewarded ads stay available because the
 * player chooses them. Restore Purchases is required by Apple and lives in Settings.
 */
export interface StoreService {
  available(): boolean;
  /** Localised price string from the App Store, e.g. "$2.99" (null until loaded). */
  price(): string | null;
  buyRemoveAds(): Promise<boolean>;
  restore(): Promise<boolean>;
}

const owned = () => storage.num('bm.noads', 0) === 1;
const grant = () => storage.set('bm.noads', 1);

class NativeStore implements StoreService {
  private priceString: string | null = null;

  constructor() {
    void this.init();
  }

  private async init() {
    try {
      const { products } = await NativePurchases.getProducts({ productIdentifiers: [NATIVE_IDS.removeAdsProduct], productType: PURCHASE_TYPE.INAPP });
      this.priceString = products[0]?.priceString ?? null;
      // Silently re-check ownership on launch (new phone, reinstall).
      if (!owned()) await this.check();
    } catch {
      /* store unavailable (simulator, no network) */
    }
  }

  private async check() {
    const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP });
    if (purchases.some((p) => p.productIdentifier === NATIVE_IDS.removeAdsProduct)) {
      grant();
      return true;
    }
    return false;
  }

  available() {
    return true;
  }

  price() {
    return this.priceString;
  }

  async buyRemoveAds() {
    try {
      const t = await NativePurchases.purchaseProduct({ productIdentifier: NATIVE_IDS.removeAdsProduct, productType: PURCHASE_TYPE.INAPP });
      if (t?.productIdentifier === NATIVE_IDS.removeAdsProduct) {
        grant();
        return true;
      }
    } catch {
      /* cancelled or failed */
    }
    return false;
  }

  async restore() {
    try {
      await NativePurchases.restorePurchases();
      return await this.check();
    } catch {
      return false;
    }
  }
}

/** The web build has no store: the button is hidden. */
class WebStore implements StoreService {
  available() {
    return false;
  }
  price() {
    return null;
  }
  async buyRemoveAds() {
    return false;
  }
  async restore() {
    return owned();
  }
}

export const storeService: StoreService = isNative ? new NativeStore() : new WebStore();
export const ownsRemoveAds = owned;
