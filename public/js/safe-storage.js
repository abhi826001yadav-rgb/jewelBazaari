export function isStorageAvailable(storage) {
    if (!storage) {
        return false;
    }

    try {
        const probeKey = '__jb_storage_probe__';
        storage.setItem(probeKey, '1');
        storage.removeItem(probeKey);
        return true;
    } catch {
        return false;
    }
}

export function safeGetItem(storage, key) {
    if (!isStorageAvailable(storage)) {
        return null;
    }

    try {
        return storage.getItem(key);
    } catch {
        return null;
    }
}

export function safeSetItem(storage, key, value) {
    if (!isStorageAvailable(storage)) {
        return false;
    }

    try {
        storage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}

export function safeRemoveItem(storage, key) {
    if (!isStorageAvailable(storage)) {
        return false;
    }

    try {
        storage.removeItem(key);
        return true;
    } catch {
        return false;
    }
}