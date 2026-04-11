import { clearAdminToken, getAdminToken, notifyUnauthorized } from './auth';

const API_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:5052';

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

function authHeaders(additional?: HeadersInit) {
  return {
    Authorization: `Bearer ${getAdminToken()}`,
    ...(additional ?? {}),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...authHeaders(init?.headers),
    },
  });

  if (response.status === 401) {
    clearAdminToken();
    notifyUnauthorized();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
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
  return request<{ id: number; active: boolean }>(`/users/${id}/active`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
  });
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
  return request<{ id: number; key: string; label: string; enabled: boolean }>('/editions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function toggleEdition(id: number, enabled: boolean) {
  return request<{ id: number; enabled: boolean }>(`/editions/${id}/enabled`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });
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
  return request<{ id: number; title: string; body: string; active: boolean }>('/announcements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function toggleAnnouncement(id: number, active: boolean) {
  return request<{ id: number; active: boolean }>(`/announcements/${id}/active`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
  });
}

export function fetchSettings(pagination?: PaginationInput) {
  return request<PaginatedResponse<{ id: number; key: string; value: string }>>(
    withPagination('/settings', pagination),
  );
}

export function upsertSetting(payload: { id?: number; key: string; value: string }) {
  return request<{ id: number; key: string; value: string }>('/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function fetchFlags(pagination?: PaginationInput) {
  return request<PaginatedResponse<{ id: number; key: string; enabled: boolean }>>(
    withPagination('/settings/flags', pagination),
  );
}

export function toggleFlag(id: number, enabled: boolean) {
  return request<{ id: number; key: string; enabled: boolean }>(`/settings/flags/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });
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

  const response = await fetch(`${API_URL}/asset-packs/${edition}/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });

  if (response.status === 401) {
    clearAdminToken();
    notifyUnauthorized();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }
  return response.json();
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

  const response = await fetch(`${API_URL}/asset-packs/${edition}/pages/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });

  if (response.status === 401) {
    clearAdminToken();
    notifyUnauthorized();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    throw new Error(`Page upload failed: ${response.status}`);
  }

  return response.json();
}

export function deleteAssetPage(edition: string, version: string, pageNumber: number) {
  return request(`/asset-packs/${edition}/${encodeURIComponent(version)}/pages/${pageNumber}`, {
    method: 'DELETE',
  });
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

  const response = await fetch(
    `${API_URL}/asset-packs/${edition}/${encodeURIComponent(version)}/pages/${pageNumber}`,
    {
      method: 'PATCH',
      headers: authHeaders(),
      body: form,
    },
  );

  if (response.status === 401) {
    clearAdminToken();
    notifyUnauthorized();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    throw new Error(`Page update failed: ${response.status}`);
  }

  return response.json();
}

export async function activateAssetPack(edition: string, version: string) {
  return request(`/asset-packs/${edition}/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version }),
  });
}

export function assetPreviewUrl(relativePath: string) {
  return new URL(relativePath, `${API_URL}/`).toString();
}

export async function uploadContentDataset(key: string, version: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  form.append('version', version);

  const response = await fetch(`${API_URL}/content-datasets/${key}/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });

  if (response.status === 401) {
    clearAdminToken();
    notifyUnauthorized();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }
  return response.json();
}

export async function activateContentDataset(key: string, version: string) {
  return request(`/content-datasets/${key}/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version }),
  });
}
