import { Repository } from 'typeorm';
import { MemoryCacheService } from '../common/cache/memory-cache.service.js';
import { AppSetting } from '../entities/app_setting.entity.js';
import { FeatureFlag } from '../entities/feature_flag.entity.js';
import {
  buildPaginatedResponse,
  normalizePagination,
} from '../common/pagination/pagination.js';

export class SettingsService {
  constructor(
    private readonly settingsRepo: Repository<AppSetting>,
    private readonly flagsRepo: Repository<FeatureFlag>,
    private readonly cache: MemoryCacheService,
  ) {}

  async getSettings(rawPage?: number | string, rawPageSize?: number | string) {
    const { page, pageSize, skip, take } = normalizePagination(
      rawPage,
      rawPageSize,
    );
    const [items, totalItems] = await this.settingsRepo.findAndCount({
      order: { key: 'ASC' },
      skip,
      take,
    });
    return buildPaginatedResponse(items, totalItems, page, pageSize);
  }

  async upsertSetting(payload: Partial<AppSetting>) {
    const saved = await this.settingsRepo.save(payload);
    this._invalidateCaches();
    return saved;
  }

  getSettingByKey(key: string) {
    return this.settingsRepo.findOne({
      where: { key: key.trim() },
    });
  }

  async getFlags(rawPage?: number | string, rawPageSize?: number | string) {
    const { page, pageSize, skip, take } = normalizePagination(
      rawPage,
      rawPageSize,
    );
    const [items, totalItems] = await this.flagsRepo.findAndCount({
      order: { key: 'ASC' },
      skip,
      take,
    });
    return buildPaginatedResponse(items, totalItems, page, pageSize);
  }

  async toggleFlag(id: number, enabled: boolean) {
    await this.flagsRepo.update({ id }, { enabled });
    const flag = await this.flagsRepo.findOne({ where: { id } });
    this._invalidateCaches();
    return flag;
  }

  private _invalidateCaches() {
    this.cache.deleteByPrefix('public-config:');
    this.cache.deleteByPrefix('public-ai:');
    this.cache.deleteByPrefix('admin:');
  }
}
