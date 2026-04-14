/**
 * Einfaches In-Memory-Caching-Modul für serverseitige API-Routen.
 * Kein externer Service erforderlich – nutzt eine Map im Node.js-Prozess.
 *
 * Wichtig: Der Cache lebt nur im laufenden Prozess. Bei einem Neustart
 * (z. B. Deployment) wird er automatisch zurückgesetzt.
 */

// Standard-TTL: 60 Sekunden (als Konstante anpassbar)
export const CACHE_TTL_MS = 60 * 1_000;

interface CacheEntry<T> {
  data: T;
  /** Unix-Timestamp in ms, ab dem der Eintrag als abgelaufen gilt */
  expiresAt: number;
}

// Zentraler Cache-Speicher – einmaliger Singleton pro Prozess
const store = new Map<string, CacheEntry<unknown>>();

/**
 * Gibt den gecachten Wert zum angegebenen Key zurück.
 * Liefert `null`, wenn kein Eintrag existiert oder dieser abgelaufen ist.
 */
export function getFromCache<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    // Abgelaufener Eintrag sofort entfernen
    store.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Speichert `data` unter dem angegebenen `key` im Cache.
 * @param key     Eindeutiger Cache-Schlüssel
 * @param data    Zu cachender Wert
 * @param ttlMs   Time-to-Live in Millisekunden (Standard: CACHE_TTL_MS)
 */
export function setCache<T>(
  key: string,
  data: T,
  ttlMs: number = CACHE_TTL_MS
): void {
  store.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Invalidiert Cache-Einträge.
 * - Mit `prefix`: Löscht alle Einträge, deren Key mit dem Präfix beginnt.
 * - Ohne Argument: Leert den gesamten Cache.
 */
export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }

  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}
