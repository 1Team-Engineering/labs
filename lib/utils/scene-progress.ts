const STORAGE_KEY_PREFIX = '1t-scene-progress-';

function storageKey(classroomId: string): string {
  return `${STORAGE_KEY_PREFIX}${classroomId}`;
}

export function getViewedScenes(classroomId: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(classroomId));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function markSceneViewed(classroomId: string, sceneId: string): void {
  try {
    const viewed = getViewedScenes(classroomId);
    viewed.add(sceneId);
    localStorage.setItem(storageKey(classroomId), JSON.stringify([...viewed]));
  } catch {
    // localStorage unavailable — silent fail
  }
}

export function clearProgress(classroomId: string): void {
  try {
    localStorage.removeItem(storageKey(classroomId));
  } catch {
    // silent fail
  }
}
