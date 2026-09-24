// ============================================================================
// INDEXEDDB PERSISTENCE — analyses (with embedded images) are stored here.
// localStorage is used only for small preferences (theme, mode, last id).
// ============================================================================
import type { Analysis } from "../core/types";

const DB_NAME = "ferrite-analyzer-pro";
const DB_VERSION = 1;
const STORE = "analyses";
const VALIDATION_STORE = "validation";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(VALIDATION_STORE)) {
        db.createObjectStore(VALIDATION_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAnalysis(analysis: Analysis): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(analysis);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAnalysis(id: string): Promise<Analysis | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadAllAnalyses(): Promise<Analysis[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAnalysis(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export interface StoredValidationRun {
  id: string;
  analysisId: string;
  sampleId: string;
  label: string;
  referenceValue: number | null;
  measuredValue: number;
  blind: boolean;
  revealedAt: string | null;
  createdAt: string;
}

export async function saveValidationRun(run: StoredValidationRun): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VALIDATION_STORE, "readwrite");
    tx.objectStore(VALIDATION_STORE).put(run);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAllValidationRuns(): Promise<StoredValidationRun[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VALIDATION_STORE, "readonly");
    const req = tx.objectStore(VALIDATION_STORE).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteValidationRun(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VALIDATION_STORE, "readwrite");
    tx.objectStore(VALIDATION_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- small preferences (localStorage) ---
const PREFS_KEY = "ferrite-analyzer-pro:prefs";

export interface Prefs {
  theme: "dark" | "light";
  mode: "simple" | "expert";
  reduceMotion: boolean;
  customCursor: boolean;
  lastAnalysisId: string | null;
  introSeen: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  theme: "dark",
  mode: "simple",
  reduceMotion: false,
  customCursor: true,
  lastAnalysisId: null,
  introSeen: false,
};

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: Prefs): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
