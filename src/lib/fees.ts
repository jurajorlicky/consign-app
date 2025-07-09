import { supabase } from './supabase';

interface AdminSettings {
  fee_percent: number;
  fee_fixed: number;
}

let cachedSettings: AdminSettings | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getFees(): Promise<AdminSettings> {
  const now = Date.now();
  
  // Return cached settings if they're still valid
  if (cachedSettings && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedSettings;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('fee_percent, fee_fixed')
      .single()
      .abortSignal(controller.signal);

    clearTimeout(timeoutId);

    if (error) throw error;

    if (data) {
      cachedSettings = {
        fee_percent: data.fee_percent,
        fee_fixed: data.fee_fixed
      };
      cacheTimestamp = now;
      return cachedSettings;
    }

    // Default values if no settings found
    const defaultSettings = { fee_percent: 0.2, fee_fixed: 5 };
    cachedSettings = defaultSettings;
    cacheTimestamp = now;
    return defaultSettings;
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('Error fetching admin settings:', error);
    
    // Return cached settings if available, otherwise defaults
    if (cachedSettings) {
      return cachedSettings;
    }
    
    const defaultSettings = { fee_percent: 0.2, fee_fixed: 5 };
    return defaultSettings;
  }
}

export function calculatePayout(price: number, feePercent: number, feeFixed: number): number {
  const result = price * (1 - feePercent) - feeFixed;
  return Math.max(0, result); // Ensure payout is never negative
}

// Clear cache function for manual refresh
export function clearFeesCache(): void {
  cachedSettings = null;
  cacheTimestamp = 0;
}