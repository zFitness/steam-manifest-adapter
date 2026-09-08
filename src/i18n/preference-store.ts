import AsyncStorage from 'expo-sqlite/kv-store';

import {
  DEFAULT_PREFERENCE,
  isLocalePreference,
  type LocalePreference,
} from './resolve-locale';

const STORAGE_KEY = 'settings.localePreference';

/**
 * Reads the persisted language preference.
 *
 * Any failure — storage unavailable, or a value that is not one of the three
 * supported preferences — falls back to `'system'` rather than throwing, so a
 * corrupted value cannot stop the app from starting.
 */
export async function readPreference(): Promise<LocalePreference> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return isLocalePreference(stored) ? stored : DEFAULT_PREFERENCE;
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

/** Persists the language preference. Failures are swallowed by design. */
export async function writePreference(preference: LocalePreference): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Losing the write only costs the preference on next launch; never crash.
  }
}
