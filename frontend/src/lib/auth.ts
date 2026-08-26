const STORAGE_KEY = "vidz_access_key";

export function getAccessKey(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setAccessKey(key: string) {
  localStorage.setItem(STORAGE_KEY, key);
}

export function clearAccessKey() {
  localStorage.removeItem(STORAGE_KEY);
}
