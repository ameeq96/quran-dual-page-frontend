import { Repository } from 'typeorm';
import { MemoryCacheService } from '../common/cache/memory-cache.service.js';
import { Edition } from '../entities/edition.entity.js';
import {
  buildPaginatedResponse,
  normalizePagination,
} from '../common/pagination/pagination.js';

export class EditionsService {
  constructor(
    private readonly repo: Repository<Edition>,
    private readonly cache: MemoryCacheService,
  ) {}

  async findAll(rawPage?: number | string, rawPageSize?: number | string) {
    const { page, pageSize, skip, take } = normalizePagination(
      rawPage,
      rawPageSize,
    );
    const [items, totalItems] = await this.repo.findAndCount({
      order: { id: 'ASC' },
      skip,
      take,
    });
    return buildPaginatedResponse(items, totalItems, page, pageSize);
  }

  async upsert(payload: Partial<Edition>) {
    const saved = await this.repo.save(payload);
    this._invalidateCaches();
    return saved;
  }

  async toggle(id: number, enabled: boolean) {
    await this.repo.update({ id }, { enabled });
    const edition = await this.repo.findOne({ where: { id } });
    this._invalidateCaches();
    return edition;
  }

  private _invalidateCaches() {
    this.cache.deleteByPrefix('public-config:');
    this.cache.deleteByPrefix('admin:');
  }
}
