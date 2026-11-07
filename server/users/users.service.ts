import { MoreThanOrEqual, Repository } from 'typeorm';
import { createHash, timingSafeEqual } from 'crypto';
import { MemoryCacheService } from '../common/cache/memory-cache.service.js';
import { AppUser } from '../entities/app_user.entity.js';
import { HttpError } from '../errors.js';
import {
  buildPaginatedResponse,
  normalizePagination,
} from '../common/pagination/pagination.js';

const SYNC_AUTH_KEY = '__readerSyncAuth';

type SyncSummary = {
  notesCount: number;
  favoritePagesCount: number;
  bookmarksCount: number;
  historyCount: number;
  hifzCount: number;
};

export class UsersService {
  constructor(
    private readonly repo: Repository<AppUser>,
    private readonly cache: MemoryCacheService,
  ) {}

  async findAll(rawPage?: number | string, rawPageSize?: number | string) {
    const { page, pageSize, skip, take } = normalizePagination(
      rawPage,
      rawPageSize,
    );
    const [users, totalItems] = await this.repo.findAndCount({
      order: { id: 'DESC' },
      skip,
      take,
    });
    const items = users.map((user) => ({
      ...this._buildUserSummary(user),
      id: user.id,
      email: user.email,
      deviceId: user.deviceId,
      active: user.active,
      lastPageNumber: user.lastPageNumber,
      syncUpdatedAt: user.syncUpdatedAt,
      appVersion: user.appVersion,
      hasSyncPayload: !!user.syncPayloadJson,
    }));

    return buildPaginatedResponse(items, totalItems, page, pageSize);
  }

  async findSyncState(id: number) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) {
      return null;
    }

    const payload = this._parsePayload(user.syncPayloadJson);
    return {
      ...this._buildUserSummary(user),
      id: user.id,
      email: user.email,
      deviceId: user.deviceId,
      active: user.active,
      lastPageNumber: user.lastPageNumber,
      syncUpdatedAt: user.syncUpdatedAt,
      appVersion: user.appVersion,
      payload,
    };
  }

  async toggleActive(id: number, active: boolean) {
    await this.repo.update({ id }, { active });
    const user = await this.repo.findOne({ where: { id } });
    this._invalidateAdminCaches();
    return user ? {
      ...user,
      syncPayloadJson: user.syncPayloadJson ? JSON.stringify(this._parsePayload(user.syncPayloadJson)) : null,
    } : null;
  }

  async pushSync(payload: {
    deviceId: string;
    email?: string | null;
    appVersion?: string | null;
    lastPageNumber?: number | null;
    payload?: Record<string, unknown>;
  }, token?: string) {
    const deviceId = this._syncDeviceId(payload.deviceId);
    const tokenHash = this._syncTokenHash(token);
    if (payload.email != null && payload.email !== '') {
      throw new HttpError(400, 'Email cannot establish reader ownership.');
    }
    if (!payload.payload || typeof payload.payload !== 'object' || Array.isArray(payload.payload) ||
        Object.prototype.hasOwnProperty.call(payload.payload, SYNC_AUTH_KEY)) {
      throw new HttpError(400, 'A reader snapshot without reserved server fields is required.');
    }
    return this._withSyncLock(deviceId, async (repo) => {
      const matches = await repo.find({ where: { deviceId } });
      if (matches.length > 1) throw new HttpError(409, 'Reader identity is ambiguous.');
      let user = matches[0];
      if (user) this._verifySyncOwner(user, tokenHash);
      else user = repo.create({ deviceId, email: null, active: true });
      if (!user.active) throw new HttpError(403, 'This reader has been disabled by an administrator.');

      const now = new Date();
      user.lastActiveAt = now;
      user.lastPageNumber = payload.lastPageNumber ?? user.lastPageNumber ?? null;
      user.syncUpdatedAt = now;
      user.appVersion = payload.appVersion?.trim() || user.appVersion || null;
      user.syncPayloadJson = JSON.stringify({
        ...payload.payload,
        deviceId,
        [SYNC_AUTH_KEY]: { version: 1, tokenHash },
      });
      const saved = await repo.save(user);
      this._invalidateAdminCaches();
      return { success: true, userId: saved.id, syncUpdatedAt: saved.syncUpdatedAt };
    });
  }

  async pullSync(deviceId: string, token?: string) {
    const normalized = this._syncDeviceId(deviceId);
    const tokenHash = this._syncTokenHash(token);
    const matches = await this.repo.find({ where: { deviceId: normalized } });
    if (matches.length > 1) throw new HttpError(409, 'Reader identity is ambiguous.');
    const user = matches[0];
    if (!user) return { success: true, found: false };
    this._verifySyncOwner(user, tokenHash);
    if (!user.active) throw new HttpError(403, 'This reader has been disabled by an administrator.');
    return {
      success: true, found: true,
      ...this._buildUserSummary(user),
      email: user.email, lastPageNumber: user.lastPageNumber,
      syncUpdatedAt: user.syncUpdatedAt, payload: this._parsePayload(user.syncPayloadJson),
    };
  }

  private _syncDeviceId(value: unknown) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,255}$/.test(value.trim())) {
      throw new HttpError(400, 'A valid reader device ID is required.');
    }
    return value.trim().toLowerCase();
  }

  private _syncTokenHash(token: unknown) {
    if (typeof token !== 'string' || token.length !== 43 || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
      throw new HttpError(401, 'A reader sync credential is required.');
    }
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private _verifySyncOwner(user: AppUser, providedHash: string) {
    const metadata = this._safeRecord(this._rawPayload(user.syncPayloadJson)[SYNC_AUTH_KEY]);
    const expectedHash = metadata.tokenHash;
    if (metadata.version !== 1 || typeof expectedHash !== 'string' || !/^[a-f0-9]{64}$/.test(expectedHash) ||
        !timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(providedHash, 'hex'))) {
      throw new HttpError(401, 'Reader sync credential is invalid. Existing backups remain available to the administrator.');
    }
  }

  private async _withSyncLock<T>(deviceId: string, run: (repo: Repository<AppUser>) => Promise<T>): Promise<T> {
    const runner = this.repo.manager.connection.createQueryRunner();
    const lockName = 'quran-sync:' + createHash('sha256').update(deviceId).digest('hex').slice(0, 48);
    await runner.connect();
    let locked = false;
    try {
      const result = await runner.query('SELECT GET_LOCK(?, 5) AS acquired', [lockName]);
      locked = Number(result[0]?.acquired) === 1;
      if (!locked) throw new HttpError(503, 'Reader sync is busy. Try again.');
      await runner.startTransaction();
      try {
        const value = await run(runner.manager.getRepository(AppUser));
        await runner.commitTransaction();
        return value;
      } catch (error) {
        await runner.rollbackTransaction();
        throw error;
      }
    } finally {
      try { if (locked) await runner.query('SELECT RELEASE_LOCK(?) AS released', [lockName]); }
      finally { await runner.release(); }
    }
  }

  async getActivitySummary() {
    const now = Date.now();
    const countSince = (days: number) => this.repo.count({
      where: { lastActiveAt: MoreThanOrEqual(new Date(now - days * 86_400_000)) },
    });
    const [dailyActiveUsers, weeklyActiveUsers, monthlyActiveUsers] = await Promise.all([
      countSince(1),
      countSince(7),
      countSince(30),
    ]);
    return {
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      avgSessionMinutes: null,
    };
  }

  async getSyncAggregateSummary() {
    return this.cache.getOrSet('admin:sync-aggregate', 10_000, async () => {
      const users = await this.repo.find({
        select: {
          active: true,
          syncPayloadJson: true,
          syncUpdatedAt: true,
        },
      });

      let syncedUsers = 0;
      let activeSyncedUsers = 0;
      let totalNotes = 0;
      let totalFavoritePages = 0;
      let totalBookmarks = 0;
      let totalHistoryEntries = 0;
      let totalHifzEntries = 0;
      let latestSyncAt: Date | null = null;

      for (const user of users) {
        const hasSync = !!user.syncPayloadJson?.trim();
        if (!hasSync) {
          continue;
        }

        syncedUsers += 1;
        if (user.active) {
          activeSyncedUsers += 1;
        }

        const summary = this._summarizePayload(this._parsePayload(user.syncPayloadJson));
        totalNotes += summary.notesCount;
        totalFavoritePages += summary.favoritePagesCount;
        totalBookmarks += summary.bookmarksCount;
        totalHistoryEntries += summary.historyCount;
        totalHifzEntries += summary.hifzCount;

        if (
          user.syncUpdatedAt &&
          (latestSyncAt == null || user.syncUpdatedAt > latestSyncAt)
        ) {
          latestSyncAt = user.syncUpdatedAt;
        }
      }

      return {
        syncedUsers,
        activeSyncedUsers,
        totalNotes,
        totalFavoritePages,
        totalBookmarks,
        totalHistoryEntries,
        totalHifzEntries,
        latestSyncAt,
      };
    });
  }

  private _invalidateAdminCaches() {
    this.cache.deleteByPrefix('admin:');
  }

  private _rawPayload(jsonPayload: string | null): Record<string, unknown> {
    if (!jsonPayload?.trim()) return {};
    try { return this._safeRecord(JSON.parse(jsonPayload)); }
    catch (_) { return {}; }
  }

  private _parsePayload(jsonPayload: string | null) {
    const payload = { ...this._rawPayload(jsonPayload) };
    delete payload[SYNC_AUTH_KEY];
    return payload;
  }

  private _buildUserSummary(user: AppUser) {
    return this._summarizePayload(this._parsePayload(user.syncPayloadJson));
  }

  private _summarizePayload(payload: Record<string, unknown>): SyncSummary {
    const pageNotes = this._safeRecord(payload.pageNotes);
    return {
      notesCount: Object.keys(pageNotes).length,
      favoritePagesCount: this._safeArray(payload.favoritePages).length,
      bookmarksCount: this._safeArray(payload.bookmarks).length,
      historyCount: this._safeArray(payload.readingHistory).length,
      hifzCount: this._safeArray(payload.hifzReviewEntries).length,
    };
  }

  private _safeArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private _safeRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }
}
