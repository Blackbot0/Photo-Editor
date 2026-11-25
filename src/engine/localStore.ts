import { DEFAULT_SETTINGS, INITIAL_MODEL_PACKS } from '../data/catalog';
import { AIModelPack, LocalProject, StudioSettings } from '../types/studio';

const DB_NAME = 'lumavault_offline_studio_v1';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_KV = 'kv';

const LS_PROJECTS_KEY = 'lumavault_projects_v1';
const LS_MODELS_KEY = 'lumavault_models_v1';
const LS_SETTINGS_KEY = 'lumavault_settings_v1';

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_KV)) {
          db.createObjectStore(STORE_KV, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function loadLocalProjects(): Promise<LocalProject[]> {
  const db = await openDb();
  if (db) {
    try {
      const projects = await new Promise<LocalProject[]>((resolve) => {
        const tx = db.transaction(STORE_PROJECTS, 'readonly');
        const store = tx.objectStore(STORE_PROJECTS);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as LocalProject[]) || []);
        req.onerror = () => resolve([]);
      });
      if (projects.length > 0) {
        return projects.sort((a, b) => b.updatedAt - a.updatedAt);
      }
    } catch {
      // Fallback below
    }
  }
  try {
    const raw = localStorage.getItem(LS_PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalProject[];
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function saveLocalProject(project: LocalProject): Promise<void> {
  const db = await openDb();
  if (db) {
    try {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_PROJECTS, 'readwrite');
        tx.objectStore(STORE_PROJECTS).put(project);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // Fallback to localStorage
    }
  }
  try {
    const existing = await loadLocalProjects();
    const filtered = existing.filter((p) => p.id !== project.id);
    const next = [project, ...filtered].slice(0, 24);
    localStorage.setItem(LS_PROJECTS_KEY, JSON.stringify(next));
  } catch {
    // Quota safety
  }
}

export async function deleteLocalProject(projectId: string): Promise<void> {
  const db = await openDb();
  if (db) {
    try {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_PROJECTS, 'readwrite');
        tx.objectStore(STORE_PROJECTS).delete(projectId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // ignore
    }
  }
  try {
    const raw = localStorage.getItem(LS_PROJECTS_KEY);
    if (raw) {
      const parsed = (JSON.parse(raw) as LocalProject[]).filter((p) => p.id !== projectId);
      localStorage.setItem(LS_PROJECTS_KEY, JSON.stringify(parsed));
    }
  } catch {
    // ignore
  }
}

export function loadModelPacks(): AIModelPack[] {
  try {
    const raw = localStorage.getItem(LS_MODELS_KEY);
    if (!raw) return INITIAL_MODEL_PACKS;
    const saved = JSON.parse(raw) as Record<string, boolean>;
    return INITIAL_MODEL_PACKS.map((pack) => ({
      ...pack,
      installed: pack.builtIn ? true : saved[pack.id] ?? pack.installed,
    }));
  } catch {
    return INITIAL_MODEL_PACKS;
  }
}

export function saveModelPacks(packs: AIModelPack[]): void {
  try {
    const map: Record<string, boolean> = {};
    for (const p of packs) {
      map[p.id] = p.installed;
    }
    localStorage.setItem(LS_MODELS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function loadStudioSettings(): StudioSettings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<StudioSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStudioSettings(settings: StudioSettings): void {
  try {
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export async function clearAllLocalStudioData(): Promise<void> {
  try {
    localStorage.removeItem(LS_PROJECTS_KEY);
    localStorage.removeItem(LS_MODELS_KEY);
    localStorage.removeItem(LS_SETTINGS_KEY);
  } catch {
    // ignore
  }
  const db = await openDb();
  if (db) {
    try {
      await new Promise<void>((resolve) => {
        const tx = db.transaction([STORE_PROJECTS, STORE_KV], 'readwrite');
        tx.objectStore(STORE_PROJECTS).clear();
        tx.objectStore(STORE_KV).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // ignore
    }
  }
}

export function estimateLocalStorageMB(projects: LocalProject[], packs: AIModelPack[]): {
  modelsMB: number;
  projectsMB: number;
  totalMB: number;
} {
  const modelsMB = packs.filter((p) => p.installed).reduce((sum, p) => sum + p.sizeMB, 0);
  const projectBytes = projects.reduce((sum, p) => sum + (p.thumbnailDataUrl?.length ?? 0) + 4096, 0);
  const projectsMB = Number(Math.max(0.2, projectBytes / (1024 * 1024)).toFixed(1));
  return {
    modelsMB,
    projectsMB,
    totalMB: Number((modelsMB + projectsMB).toFixed(1)),
  };
}
