const VERSION = "1";
const LIMIT = 40_000;
const DAYS = 90;

const opened: { db?: Promise<IDBDatabase> } = {};
const counts = { batches: 0 };

const today = () => Math.floor(Date.now() / 86_400_000);

async function done<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () =>
      reject(request.error ?? new Error("IndexedDB")),
    );
  });
}

async function store(mode: IDBTransactionMode) {
  opened.db ??= (async () => {
    try {
      const request = indexedDB.open("dragoman", 1);
      request.addEventListener("upgradeneeded", () =>
        request.result
          .createObjectStore("translations")
          .createIndex("day", "day"),
      );
      return await done(request);
    } catch (error) {
      delete opened.db;
      throw error;
    }
  })();
  const db = await opened.db;
  return db.transaction("translations", mode).objectStore("translations");
}

async function digest(parts: Array<string>) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode([VERSION, ...parts].join("\u{0}")),
  );
  return hash.slice(0, 12);
}

export async function recall(
  lookups: Array<Array<string>>,
  isTouched: boolean,
): Promise<Array<string | null>> {
  if (lookups.length === 0) return [];
  try {
    const keys = await Promise.all(lookups.map(async (parts) => digest(parts)));
    const translations = await store(isTouched ? "readwrite" : "readonly");
    const day = today();
    return await Promise.all(
      keys.map(async (key) => {
        const entry = await done(
          translations.get(key) as IDBRequest<
            { text: string; day: number } | undefined
          >,
        );
        if (entry == null) return null;
        if (isTouched && entry.day !== day)
          translations.put({ text: entry.text, day }, key);
        return entry.text;
      }),
    );
  } catch {
    return lookups.map(() => null);
  }
}

export async function remember(entries: Array<[Array<string>, string]>) {
  const kept = entries.filter(([, text]) => text.trim() !== "");
  if (kept.length === 0) return;
  try {
    const keys = await Promise.all(kept.map(async ([parts]) => digest(parts)));
    const translations = await store("readwrite");
    const day = today();
    for (const [i, [, text]] of kept.entries())
      translations.put({ text, day }, keys[i]);
    if (counts.batches++ % 50 !== 0) return;
    const pruned = await store("readwrite");
    const total = await done(pruned.count());
    const cutoff = day - DAYS;
    let excess = total > LIMIT ? total - LIMIT * 0.8 : 0;
    const cursor = pruned.index("day").openKeyCursor();
    cursor.onsuccess = () => {
      const position = cursor.result;
      if (position == null || (excess <= 0 && Number(position.key) >= cutoff))
        return;
      pruned.delete(position.primaryKey);
      excess--;
      position.continue();
    };
  } catch {}
}

export async function forget() {
  const translations = await store("readwrite");
  await done(translations.clear());
}
