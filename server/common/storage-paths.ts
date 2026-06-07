import * as fs from 'fs';
import * as path from 'path';

const configuredStorageRoot = process.env.STORAGE_ROOT?.trim();
const defaultStorageRoot = path.join(process.cwd(), 'storage');
const initialStorageDirectories = ['tmp', 'asset_packs', 'content_datasets'];

function isPlaceholderStorageRoot(value: string) {
  return value.includes('/your-user/');
}

export const storageRoot = (() => {
  if (!configuredStorageRoot || isPlaceholderStorageRoot(configuredStorageRoot)) {
    return defaultStorageRoot;
  }

  return path.isAbsolute(configuredStorageRoot)
    ? configuredStorageRoot
    : path.resolve(process.cwd(), configuredStorageRoot);
})();

export function storagePath(...segments: string[]) {
  return path.join(storageRoot, ...segments);
}

export function ensureStorageRoot() {
  fs.mkdirSync(storageRoot, { recursive: true });
  for (const directory of initialStorageDirectories) {
    fs.mkdirSync(path.join(storageRoot, directory), { recursive: true });
  }
  return storageRoot;
}

export function ensureStorageDirectory(...segments: string[]) {
  const directory = storagePath(...segments);
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}
