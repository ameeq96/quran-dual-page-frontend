import { Repository } from 'typeorm';
import { MemoryCacheService } from './memory-cache.js';
import { Announcement } from '../entities/announcement.entity.js';
import {
  buildPaginatedResponse,
  normalizePagination,
} from '../common/pagination.js';

export class AnnouncementsService {
  constructor(
    private readonly repo: Repository<Announcement>,
    private readonly cache: MemoryCacheService,
  ) {}

  async findAll(rawPage?: number | string, rawPageSize?: number | string) {
    const { page, pageSize, skip, take } = normalizePagination(
      rawPage,
      rawPageSize,
    );
    const [items, totalItems] = await this.repo.findAndCount({
      order: { id: 'DESC' },
      skip,
      take,
    });
    return buildPaginatedResponse(items, totalItems, page, pageSize);
  }

  async upsert(payload: Partial<Announcement>) {
    const saved = await this.repo.save(payload);
    this._invalidateCaches();
    return saved;
  }

  async toggle(id: number, active: boolean) {
    await this.repo.update({ id }, { active });
    const announcement = await this.repo.findOne({ where: { id } });
    this._invalidateCaches();
    return announcement;
  }

  private _invalidateCaches() {
    this.cache.deleteByPrefix('public-config:');
    this.cache.deleteByPrefix('admin:');
  }
}
