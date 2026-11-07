import * as fs from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';
import { MemoryCacheService } from '../common/cache/memory-cache.service.js';
import { storagePath } from '../common/storage-paths.js';
import { ContentDataset } from '../entities/content_dataset.entity.js';
import { HttpError } from '../errors.js';
import {
  buildPaginatedResponse,
  normalizePagination,
} from '../common/pagination/pagination.js';

export class ContentDatasetsService {
  constructor(
    private readonly repo: Repository<ContentDataset>,
    private readonly cache: MemoryCacheService,
  ) {}

  async list(rawPage?: number | string, rawPageSize?: number | string) {
    const { page, pageSize, skip, take } = normalizePagination(
      rawPage,
      rawPageSize,
    );
    const [items, totalItems] = await this.repo.findAndCount({
      order: { key: 'ASC', version: 'DESC' },
      skip,
      take,
    });
    return buildPaginatedResponse(items, totalItems, page, pageSize);
  }

  async uploadDataset(key: string, version: string, filePath: string) {
    let targetPath: string | undefined;
    let copied = false;
    try {
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(version)) {
        throw new HttpError(400, 'Use a version containing letters, numbers, dots, hyphens, or underscores.');
      }
      this._validateDataset(key, filePath);
      if (await this.repo.findOne({ where: { key, version } })) {
        throw new HttpError(409, 'This dataset version already exists. Upload a new version instead.');
      }
      const root = storagePath('content_datasets', key);
      fs.mkdirSync(root, { recursive: true });
      targetPath = path.join(root, `${version}.json`);
      fs.copyFileSync(filePath, targetPath, fs.constants.COPYFILE_EXCL);
      copied = true;
      const stats = fs.statSync(targetPath);
      const dataset = await this.repo.save(
        this.repo.create({
          key,
          version,
          storagePath: targetPath,
          publicPath: `/assets/content_datasets/${key}/${version}.json`,
          sizeBytes: stats.size,
          active: false,
        }),
      );
      this._invalidateCaches();
      return dataset;
    } catch (error) {
      if (copied && targetPath) {
        fs.rmSync(targetPath, { force: true });
      }
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        throw new HttpError(409, 'This dataset version already exists. Upload a new version instead.');
      }
      throw error;
    } finally {
      fs.rmSync(filePath, { force: true });
    }
  }

  async activateDataset(key: string, version: string) {
    const datasets = await this.repo.find({ where: { key } });
    const matches = datasets.filter((dataset) => dataset.version === version);
    const selected = matches.find((dataset) => dataset.active) ?? matches[0];
    if (!selected) {
      throw new HttpError(404, 'Dataset version was not found.');
    }
    this._validateDataset(key, selected.storagePath);
    for (const dataset of datasets) {
      dataset.active = dataset.id === selected.id;
    }
    await this.repo.save(datasets);
    this._invalidateCaches();
    return selected;
  }

  activeDatasets() {
    return this.cache.getOrSet('content-datasets:active', 300_000, () =>
      this.repo.find({
        where: { active: true },
        select: { key: true, version: true, publicPath: true },
      }),
    );
  }

  private _validateDataset(key: string, filePath: string) {
    const allowedKeys = ['navigation_index', 'page_insights', 'text_pages', 'taj_navigation_overrides'];
    if (!allowedKeys.includes(key)) {
      throw new HttpError(400, 'Unsupported content dataset key.');
    }
    if (path.extname(filePath).toLowerCase() !== '.json') {
      throw new HttpError(400, 'Upload a JSON file.');
    }
    let payload: unknown;
    try {
      payload = JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^﻿/, ''));
    } catch {
      throw new HttpError(400, 'Dataset must contain valid JSON in a readable file.');
    }
    const invalid = (field: string): never => {
      throw new HttpError(400, `Invalid ${key} dataset: ${field}.`);
    };
    const record = (value: unknown, field: string): Record<string, unknown> => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return invalid(`${field} must be an object`);
      }
      return value as Record<string, unknown>;
    };
    const list = (value: unknown, field: string): Record<string, unknown>[] => {
      if (!Array.isArray(value) || value.length === 0) {
        return invalid(`${field} must be a non-empty array`);
      }
      return value.map((item, index) => record(item, `${field}[${index}]`));
    };
    const positiveInteger = (value: unknown) =>
      typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
    const requiredText = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
    const pageAnchor = (value: unknown) => positiveInteger(value) ||
      (typeof value === 'string' && /^(\d+)(?:\.(?:jpe?g|png|webp))?$/i.test(value) && Number.isSafeInteger(parseInt(value, 10)) && parseInt(value, 10) > 0);
    const uniqueIntegers = (items: Record<string, unknown>[], field: string, label: string, maximum?: number) => {
      const ids = items.map((item) => item[field]);
      if (ids.some((id) => !positiveInteger(id) || (maximum !== undefined && Number(id) > maximum)) ||
          new Set(ids).size !== ids.length) {
        invalid(`${label} must contain unique positive ${field} values`);
      }
    };
    const root = record(payload, 'root');
    if (key === 'navigation_index') {
      const surahs = list(root.surahs, 'surahs');
      const siparas = list(root.siparas, 'siparas');
      uniqueIntegers(surahs, 'id', 'surahs', 114);
      uniqueIntegers(siparas, 'number', 'siparas', 30);
      for (const item of [...surahs, ...siparas]) {
        if (!requiredText(item.nameSimple ?? item.name) || !pageAnchor(item.standardStartPage) ||
            (item.tajScanStartPage !== undefined && !pageAnchor(item.tajScanStartPage))) {
          invalid('navigation entries require a name and valid page anchors');
        }
        for (const field of ['nameSimple', 'name', 'nameComplex', 'nameArabic', 'translatedName']) {
          if (item[field] !== undefined && typeof item[field] !== 'string') {
            invalid(`${field} must be text`);
          }
        }
      }
    } else if (key === 'page_insights' || key === 'text_pages') {
      const pages = list(root.pages, 'pages');
      uniqueIntegers(pages, 'pageNumber', 'pages');
      if (key === 'text_pages') {
        for (const page of pages) {
          const lines = list(page.lines, 'lines');
          uniqueIntegers(lines, 'lineNumber', 'lines');
          if (lines.some((line) => !requiredText(line.text))) {
            invalid('each text line requires non-empty text');
          }
        }
      } else {
        const chapters = list(root.chapters, 'chapters');
        uniqueIntegers(chapters, 'id', 'chapters', 114);
        for (const chapter of chapters) {
          if (!requiredText(chapter.nameSimple) || !positiveInteger(chapter.versesCount)) {
            invalid('chapters require nameSimple and a positive versesCount');
          }
          for (const field of ['nameArabic', 'translatedName', 'revelationPlace']) {
            if (typeof chapter[field] !== 'string') {
              invalid(`chapter ${field} must be text`);
            }
          }
          if (!Array.isArray(chapter.pages) || chapter.pages.length === 0 ||
              !chapter.pages.every(positiveInteger)) {
            invalid('chapter pages must be a non-empty array of positive integers');
          }
        }
        for (const page of pages) {
          for (const field of ['chapterIds', 'juzNumbers', 'hizbNumbers', 'rubElHizbNumbers', 'rukuNumbers', 'manzilNumbers']) {
            if (!Array.isArray(page[field]) ||
                !(page[field] as unknown[]).every(positiveInteger)) {
              invalid(`${field} must be an array of positive integers`);
            }
          }
          if (!Array.isArray(page.sajdahVerseKeys) ||
              !page.sajdahVerseKeys.every((value) => typeof value === 'string')) {
            invalid('sajdahVerseKeys must be an array of text values');
          }
          for (const field of ['translationEn', 'translationUr']) {
            if (page[field] != null && typeof page[field] !== 'string') {
              invalid(`${field} must be text`);
            }
          }
          if (!Array.isArray(page.verses)) {
            invalid('verses must be an array');
          }
          for (const value of page.verses as unknown[]) {
            const verse = record(value, 'verse');
            if (!requiredText(verse.verseKey) || !positiveInteger(verse.chapterId) ||
                !positiveInteger(verse.verseNumber)) {
              invalid('verses require verseKey, chapterId, and verseNumber');
            }
            for (const field of ['juzNumber', 'hizbNumber', 'rubElHizbNumber', 'rukuNumber', 'manzilNumber']) {
              if (!positiveInteger(verse[field])) {
                invalid(`verse ${field} must be a positive integer`);
              }
            }
            if (verse.sajdahNumber != null && !positiveInteger(verse.sajdahNumber)) {
              invalid('verse sajdahNumber must be null or a positive integer');
            }
            for (const field of ['translationEn', 'translationUr']) {
              if (verse[field] != null && typeof verse[field] !== 'string') {
                invalid(`verse ${field} must be text`);
              }
            }
          }
        }
      }
    } else {
      for (const [field, maximum] of [['surahStartPages', 114], ['siparaStartPages', 30]] as const) {
        const overrides = record(root[field], field);
        if (Object.entries(overrides).some(([id, page]) => !/^[1-9]\d*$/.test(id) ||
            Number(id) > maximum || !positiveInteger(page))) {
          invalid(`${field} requires valid identifiers and positive page numbers`);
        }
      }
    }
  }

  private _invalidateCaches() {
    this.cache.delete('content-datasets:active');
    this.cache.deleteByPrefix('public-config:');
    this.cache.deleteByPrefix('public-search:');
    this.cache.deleteByPrefix('admin:');
  }
}
