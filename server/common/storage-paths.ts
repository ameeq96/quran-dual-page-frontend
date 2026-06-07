import * as fs from 'fs';
import * as path from 'path';

const configuredStorageRoot = process.env.STORAGE_ROOT?.trim();

export const storageRoot = (() => {
  return configuredStorageRoot
    ? path.isAbsolute(configuredStorageRoot)
      ? configuredStorageRoot
      : path.resolve(process.cwd(), configuredStorageRoot)
    : path.join(process.cwd(), 'storage');
})();

export function storagePath(...segments: string[]) {
  return path.join(storageRoot, ...segments);
}

export function ensureStorageRoot() {
  fs.mkdirSync(storageRoot, { recursive: true });
  return storageRoot;
}

export function ensureStorageDirectory(...segments: string[]) {
  const directory = storagePath(...segments);
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}
