const DB_NAME = 'MindVaultDB';
const STORE_NAME = 'workspace';
const DB_VERSION = 1;

function openDB() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this browser.'));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error || new Error('Unable to open the workspace database.'));
    request.onblocked = () => reject(new Error('The workspace database upgrade is blocked by another open tab.'));
  });
}

export async function saveWorkspace(data) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      db.close();
      callback(value);
    };

    let tx;
    try {
      tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(data, 'root');
    } catch (error) {
      finish(reject, error);
      return;
    }

    tx.oncomplete = () => finish(resolve);
    tx.onerror = () => finish(reject, tx.error || new Error('Unable to save the workspace.'));
    tx.onabort = () => finish(reject, tx.error || new Error('Workspace save was aborted.'));
  });
}

export async function loadWorkspace() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    let settled = false;
    let value = null;
    const finish = (callback, result) => {
      if (settled) return;
      settled = true;
      db.close();
      callback(result);
    };

    let tx;
    try {
      tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get('root');
      request.onsuccess = () => { value = request.result ?? null; };
      request.onerror = () => finish(reject, request.error || new Error('Unable to read the workspace.'));
    } catch (error) {
      finish(reject, error);
      return;
    }

    tx.oncomplete = () => finish(resolve, value);
    tx.onerror = () => finish(reject, tx.error || new Error('Unable to read the workspace.'));
    tx.onabort = () => finish(reject, tx.error || new Error('Workspace read was aborted.'));
  });
}
