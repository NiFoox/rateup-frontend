export interface StoredUser {
  id: string;
  name: string;
  roles?: string[];
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const DEFAULT_USER: StoredUser = {
  id: 'demo-user',
  name: 'Demo User',
  roles: ['player']
};

const USER_KEY = 'app.currentUser';

const resolveStorage = (): StorageLike | null => {
  try {
    if (typeof globalThis.localStorage !== 'undefined') {
      return globalThis.localStorage;
    }
  } catch {
    // Ignore errors that may occur when localStorage is not available.
  }
  return null;
};

export class TokenStorage {
  private static storage = resolveStorage();

  static getUser(): StoredUser {
    const storage = this.storage;
    if (!storage) {
      return DEFAULT_USER;
    }

    const raw = storage.getItem(USER_KEY);
    if (!raw) {
      storage.setItem(USER_KEY, JSON.stringify(DEFAULT_USER));
      return DEFAULT_USER;
    }

    try {
      const parsed = JSON.parse(raw) as StoredUser;
      if (parsed && typeof parsed.id === 'string' && typeof parsed.name === 'string') {
        return {
          id: parsed.id,
          name: parsed.name,
          roles: parsed.roles ?? DEFAULT_USER.roles
        };
      }
    } catch {
      // Ignore invalid payloads and fall back to the default user.
    }

    storage.setItem(USER_KEY, JSON.stringify(DEFAULT_USER));
    return DEFAULT_USER;
  }
}
