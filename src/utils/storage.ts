// localStorage-backed storage — replaces expo-secure-store in the desktop app.
const PREFIX = 'pump_monitor_';

export function getItem(key: string): Promise<string | null> {
  return Promise.resolve(localStorage.getItem(PREFIX + key));
}

export function setItem(key: string, value: string): Promise<void> {
  localStorage.setItem(PREFIX + key, value);
  return Promise.resolve();
}

export function deleteItem(key: string): Promise<void> {
  localStorage.removeItem(PREFIX + key);
  return Promise.resolve();
}
