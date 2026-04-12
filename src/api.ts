import { clearAdminToken, getAdminToken, notifyUnauthorized } from './auth';

const API_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:5052';
const GET_CACHE_TTL_MS = 15_000;
const REQUEST_TIMEOUT_MS = 12_000;

type CachedResponse = {
  expiresAt: number;
  value: unknown;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  meta: PaginationMeta;
};

type PaginationInput = {
  page?: number;
  pageSize?: number;
};

export type AssetPackPage = {
  logicalPageNumber: number;
  importedPageNumber: number;
  fileName: string;
  fileExtension: string;
  relativePath: string;
};

export type AssetPackSummary = {
  id: number;
  edition: string;
  version: string;
  active: boolean;
  storagePath?: string;
  pageCount: number;
  fileExtension: string;
  sizeBytes: number;
  availableImportedPages: number[];
  pages?: AssetPackPage[];
};

const responseCache = new Map<string, CachedResponse>();
const inflightRequests = new Map<string, Promise<unknown>>();

function authHeaders(additional?: HeadersInit) {
  const headers = new Headers(additional);
  const token = getAdminToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const requestKey = `${method}:${path}`;
  const isGetRequest = method === 'GET';

  if (isGetRequest) {
    const cached = responseCache.get(requestKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    const inflight = inflightRequests.get(requestKey);
    if (inflight) {
      return inflight as Promise<T>;
    }
  }

  const controller = new AbortController();
  const timeoutHandle = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const execute = fetch(`${API_URL}${path}`, {
    ...init,
    signal: controller.signal,
    headers: authHeaders(init?.headers),
  })
    .then(async (response) => {
      if (response.status === 401) {
        clearAdminToken();
        invalidateApiCache();
        notifyUnauthorized();
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      const rawBody = await response.text();
      if (!rawBody.trim()) {
        return undefined as T;
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        return JSON.parse(rawBody) as T;
      }

      return rawBody as T;
    })
    .catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Request timed out');
      }

      throw error;
    })
    .finally(() => {
      window.clearTimeout(timeoutHandle);
    });

  if (!isGetRequest) {
    return execute;
  }

  const pending = execute
    .then((value) => {
      responseCache.set(requestKey, {
        expiresAt: Date.now() + GET_CACHE_TTL_MS,
        value,
      });
      return value;
    })
    .finally(() => {
      inflightRequests.delete(requestKey);
    });

  inflightRequests.set(requestKey, pending);
  return pending;
}

function invalidateApiCache(prefixes?: string[]) {
  if (!prefixes || prefixes.length === 0) {
    responseCache.clear();
    inflightRequests.clear();
    return;
  }

  for (const key of Array.from(responseCache.keys())) {
    if (prefixes.some((prefix) => key.includes(prefix))) {
      responseCache.delete(key);
    }
  }

  for (const key of Array.from(inflightRequests.keys())) {
    if (prefixes.some((prefix) => key.includes(prefix))) {
      inflightRequests.delete(key);
    }
  }
}

async function mutate<T>(
  path: string,
  init: RequestInit,
  invalidationPrefixes: string[],
): Promise<T> {
  const response = await request<T>(path, init);
  invalidateApiCache(invalidationPrefixes);
  return response;
}

function jsonMutation<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body: unknown,
  invalidationPrefixes: string[],
) {
  return mutate<T>(
    path,
    {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    invalidationPrefixes,
  );
}

function formMutation<T>(
  path: string,
  method: 'POST' | 'PATCH',
  body: FormData,
  invalidationPrefixes: string[],
) {
  return mutate<T>(
    path,
    {
      method,
      body,
    },
    invalidationPrefixes,
  );
}

function withPagination(path: string, pagination?: PaginationInput) {
  if (!pagination) {
    return path;
  }

  const params = new URLSearchParams();
  if (pagination.page) {
    params.set('page', String(pagination.page));
  }
  if (pagination.pageSize) {
    params.set('pageSize', String(pagination.pageSize));
  }

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export function login(email: string, password: string) {
  return fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then(async (res) => {
    if (!res.ok) {
      throw new Error(`Login failed: ${res.status}`);
    }
    invalidateApiCache();
    return res.json() as Promise<{ accessToken: string }>;
  });
}

export function fetchOverview() {
  return request<{
    appName: string;
    activeUsers: number;
    totalUsers: number;
    syncedUsers: number;
    activeSyncedUsers: number;
    totalNotes: number;
    totalFavoritePages: number;
    totalBookmarks: number;
    totalHistoryEntries: number;
    totalHifzEntries: number;
    totalSessions: number;
    enabledEditions: number;
    totalEditions: number;
    activeAssetPacks: number;
    totalAssetPacks: number;
    activeDatasets: number;
    totalDatasets: number;
    activeAnnouncements: number;
    totalAnnouncements: number;
    enabledFlags: number;
    totalFlags: number;
    settingsCount: number;
    defaultEdition: string;
    aiLanguage: string;
    aiDepth: string;
    aiProvider: string;
    aiModel: string;
    aiStatusLabel: string;
    lastAnnouncementTitle: string | null;
    lastSync: string | null;
  }>(
    '/admin/overview',
  );
}

export function fetchContentStatus() {
  return request<{
    editionsAvailable: string[];
    editions: { key: string; label: string; enabled: boolean }[];
    assetsOnDevice: boolean;
    assetPacks: { edition: string; version: string; pageCount: number }[];
    contentDatasets: { key: string; version: string }[];
    enabledFlags: string[];
    settings: { key: string; value: string }[];
    announcements: { id: number; title: string; body: string }[];
    lastIndexBuild: string | null;
  }>(
    '/admin/content',
  );
}

export function fetchUsers(pagination?: PaginationInput) {
  return request<PaginatedResponse<{
    id: number;
    email: string | null;
    deviceId: string | null;
    active: boolean;
    lastPageNumber: number | null;
    syncUpdatedAt: string | null;
    appVersion: string | null;
    hasSyncPayload: boolean;
    notesCount: number;
    favoritePagesCount: number;
    bookmarksCount: number;
    historyCount: number;
    hifzCount: number;
  }>>(withPagination('/users', pagination));
}

export function updateUserActive(id: number, active: boolean) {
  return jsonMutation<{ id: number; active: boolean }>(
    `/users/${id}/active`,
    'PATCH',
    { active },
    ['/users', '/admin/overview'],
  );
}

export function fetchUserSync(id: number) {
  return request<{
    id: number;
    email: string | null;
    deviceId: string | null;
    active: boolean;
    lastPageNumber: number | null;
    syncUpdatedAt: string | null;
    appVersion: string | null;
    notesCount: number;
    favoritePagesCount: number;
    bookmarksCount: number;
    historyCount: number;
    hifzCount: number;
    payload: Record<string, unknown>;
  }>(`/users/${id}/sync`);
}

export function fetchEditions(pagination?: PaginationInput) {
  return request<PaginatedResponse<{ id: number; key: string; label: string; enabled: boolean }>>(
    withPagination('/editions', pagination),
  );
}

export function upsertEdition(payload: { id?: number; key: string; label: string; enabled?: boolean }) {
  return jsonMutation<{ id: number; key: string; label: string; enabled: boolean }>(
    '/editions',
    'POST',
    payload,
    ['/editions', '/admin/content', '/admin/overview', '/public/config'],
  );
}

export function toggleEdition(id: number, enabled: boolean) {
  return jsonMutation<{ id: number; enabled: boolean }>(
    `/editions/${id}/enabled`,
    'PATCH',
    { enabled },
    ['/editions', '/admin/content', '/admin/overview', '/public/config'],
  );
}

export function fetchAnnouncements(pagination?: PaginationInput) {
  return request<
    PaginatedResponse<{ id: number; title: string; body: string; active: boolean; publishAt?: string | null }>
  >(withPagination('/announcements', pagination));
}

export function upsertAnnouncement(payload: {
  id?: number;
  title: string;
  body: string;
  active?: boolean;
  publishAt?: string;
}) {
  return jsonMutation<{ id: number; title: string; body: string; active: boolean }>(
    '/announcements',
    'POST',
    payload,
    ['/announcements', '/admin/overview', '/public/config'],
  );
}

export function toggleAnnouncement(id: number, active: boolean) {
  return jsonMutation<{ id: number; active: boolean }>(
    `/announcements/${id}/active`,
    'PATCH',
    { active },
    ['/announcements', '/admin/overview', '/public/config'],
  );
}

export function fetchSettings(pagination?: PaginationInput) {
  return request<PaginatedResponse<{ id: number; key: string; value: string }>>(
    withPagination('/settings', pagination),
  );
}

export function upsertSetting(payload: { id?: number; key: string; value: string }) {
  return jsonMutation<{ id: number; key: string; value: string }>(
    '/settings',
    'POST',
    payload,
    ['/settings', '/admin/overview', '/admin/content', '/public/config'],
  );
}

export function fetchSettingByKey(key: string) {
  return request<{ id: number; key: string; value: string } | null>(
    `/settings/by-key/${encodeURIComponent(key)}`,
  );
}

export function fetchFlags(pagination?: PaginationInput) {
  return request<PaginatedResponse<{ id: number; key: string; enabled: boolean }>>(
    withPagination('/settings/flags', pagination),
  );
}

export function toggleFlag(id: number, enabled: boolean) {
  return jsonMutation<{ id: number; key: string; enabled: boolean }>(
    `/settings/flags/${id}`,
    'PATCH',
    { enabled },
    ['/settings/flags', '/admin/overview', '/admin/content', '/public/config'],
  );
}

export function fetchAnalytics() {
  return request<{ dailyActiveUsers: number; weeklyActiveUsers: number; monthlyActiveUsers: number; avgSessionMinutes: number }>(
    '/analytics/summary',
  );
}

export function fetchAssetPacks(pagination?: PaginationInput) {
  return request<PaginatedResponse<AssetPackSummary>>(
    withPagination('/asset-packs', pagination),
  );
}

export function importMobileAppAssets(
  sourcePath: string,
  version: string,
  editions?: string[],
) {
  return request<AssetPackSummary[]>('/asset-packs/import/mobile-assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourcePath, version, editions }),
  });
}

export function fetchAssetPackPages(
  edition: string,
  version: string,
  pagination?: PaginationInput,
) {
  return request<{
    edition: string;
    version: string;
    active: boolean;
    pageCount: number;
    fileExtension: string;
    sizeBytes: number;
    availableImportedPages: number[];
    pages: AssetPackPage[];
    meta: PaginationMeta;
  }>(
    withPagination(
      `/asset-packs/${edition}/${encodeURIComponent(version)}/pages`,
      pagination,
    ),
  );
}

export function fetchContentDatasets(pagination?: PaginationInput) {
  return request<
    PaginatedResponse<{
      id: number;
      key: string;
      version: string;
      active: boolean;
      sizeBytes: number;
      publicPath: string;
    }>
  >(withPagination('/content-datasets', pagination));
}

export async function uploadAssetPack(edition: string, version: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  form.append('version', version);
  return formMutation(
    `/asset-packs/${edition}/upload`,
    'POST',
    form,
    ['/asset-packs', '/admin/content', '/admin/overview', '/public/config'],
  );
}

export async function uploadAssetPage(
  edition: string,
  version: string,
  pageNumber: number,
  file: File,
) {
  const form = new FormData();
  form.append('file', file);
  form.append('version', version);
  form.append('pageNumber', String(pageNumber));
  return formMutation(
    `/asset-packs/${edition}/pages/upload`,
    'POST',
    form,
    [`/asset-packs/${edition}/${encodeURIComponent(version)}/pages`, '/asset-packs', '/public/config'],
  );
}

export function deleteAssetPage(edition: string, version: string, pageNumber: number) {
  return mutate(
    `/asset-packs/${edition}/${encodeURIComponent(version)}/pages/${pageNumber}`,
    {
      method: 'DELETE',
    },
    [`/asset-packs/${edition}/${encodeURIComponent(version)}/pages`, '/asset-packs', '/public/config'],
  );
}

export async function updateAssetPage(
  edition: string,
  version: string,
  pageNumber: number,
  payload: { nextPageNumber?: number; file?: File | null },
) {
  const form = new FormData();
  if (payload.nextPageNumber !== undefined) {
    form.append('nextPageNumber', String(payload.nextPageNumber));
  }
  if (payload.file) {
    form.append('file', payload.file);
  }
  return formMutation(
    `/asset-packs/${edition}/${encodeURIComponent(version)}/pages/${pageNumber}`,
    'PATCH',
    form,
    [`/asset-packs/${edition}/${encodeURIComponent(version)}/pages`, '/asset-packs', '/public/config'],
  );
}

export async function activateAssetPack(edition: string, version: string) {
  return jsonMutation(
    `/asset-packs/${edition}/activate`,
    'POST',
    { version },
    ['/asset-packs', '/admin/content', '/admin/overview', '/public/config'],
  );
}

export function assetPreviewUrl(relativePath: string) {
  return new URL(relativePath, `${API_URL}/`).toString();
}

export async function uploadContentDataset(key: string, version: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  form.append('version', version);
  return formMutation(
    `/content-datasets/${key}/upload`,
    'POST',
    form,
    ['/content-datasets', '/admin/content', '/admin/overview', '/public/config'],
  );
}

export async function activateContentDataset(key: string, version: string) {
  return jsonMutation(
    `/content-datasets/${key}/activate`,
    'POST',
    { version },
    ['/content-datasets', '/admin/content', '/admin/overview', '/public/config'],
  );
}
