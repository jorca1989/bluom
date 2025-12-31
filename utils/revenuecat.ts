import Purchases, {
  CustomerInfo,
  Offerings,
  PurchasesPackage,
  PurchasesOffering,
} from 'react-native-purchases';

let configuredForUserId: string | null = null;

export function getRevenueCatGoogleKey(): string | null {
  const key = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY;
  if (!key) return null;
  return String(key);
}

export async function configureRevenueCat(appUserId: string) {
  const apiKey = getRevenueCatGoogleKey();
  if (!apiKey) {
    // Keep this non-fatal in dev so the app can run without purchases configured yet.
    // eslint-disable-next-line no-console
    console.warn('[revenuecat] Missing EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY');
    return;
  }
  if (configuredForUserId === appUserId) return;

  Purchases.setLogLevel(Purchases.LOG_LEVEL.INFO);
  Purchases.configure({ apiKey, appUserID: appUserId });
  configuredForUserId = appUserId;
}

export async function getCustomerInfoSafe(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[revenuecat] getCustomerInfo failed', e);
    return null;
  }
}

export async function getOfferingsSafe(): Promise<Offerings | null> {
  try {
    return await Purchases.getOfferings();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[revenuecat] getOfferings failed', e);
    return null;
  }
}

export function pickProOffering(offerings: Offerings | null): PurchasesOffering | null {
  if (!offerings) return null;
  return offerings.current ?? null;
}

export function pickMonthlyAndAnnualPackages(offering: PurchasesOffering | null): {
  monthly?: PurchasesPackage;
  annual?: PurchasesPackage;
  all: PurchasesPackage[];
} {
  const pkgs = offering?.availablePackages ?? [];
  const monthly = pkgs.find((p) => String(p.packageType).toLowerCase().includes('monthly'));
  const annual = pkgs.find((p) => String(p.packageType).toLowerCase().includes('annual'));
  return { monthly, annual, all: pkgs };
}

export async function purchasePackageSafe(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  try {
    const res = await Purchases.purchasePackage(pkg);
    return res?.customerInfo ?? null;
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    // User cancelled -> not an error for UI
    if (msg.toLowerCase().includes('cancel')) return null;
    throw e;
  }
}


