import './env.js';
import 'reflect-metadata';
import express, {
  type ErrorRequestHandler,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import multer from 'multer';
import { diskStorage } from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { QueryFailedError } from 'typeorm';
import { AdminService } from './admin/admin.service.js';
import { AnnouncementsService } from './announcements/announcements.service.js';
import { AssetPacksService } from './asset_packs/asset_packs.service.js';
import { AuthService } from './auth/auth.service.js';
import { ContentDatasetsService } from './content_datasets/content_datasets.service.js';
import { AppDataSource } from './db.js';
import {
  AdminUser,
  Announcement,
  AppSetting,
  AppUser,
  ContentDataset,
  Edition,
  FeatureFlag,
} from './entities/index.js';
import { HttpError, isHttpError } from './errors.js';
import { EditionsService } from './editions/editions.service.js';
import { ensureStorageDirectory, ensureStorageRoot, storageRoot } from './common/storage-paths.js';
import { MemoryCacheService } from './common/cache/memory-cache.service.js';
import { PublicAiService } from './public/public_ai.service.js';
import { PublicSearchService } from './public/public_search.service.js';
import { seedDefaults } from './seed/seed-admin.js';
import { SettingsService } from './settings/settings.service.js';
import { UsersService } from './users/users.service.js';

type AsyncRoute = (req: Request, res: Response) => Promise<unknown> | unknown;
type StartupState = {
  status: 'starting' | 'ok' | 'error';
  error?: string;
  updatedAt: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');
const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 3000);

function route(handler: AsyncRoute): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res))
      .then((result) => {
        if (!res.headersSent) {
          res.json(result);
        }
      })
      .catch(next);
  };
}

function getBearerToken(req: Request) {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

async function verifyLoginCaptcha(captchaToken: unknown) {
  const siteKey = process.env.VITE_RECAPTCHA_SITE_KEY?.trim();
  const secretKey = process.env.RECAPTCHA_SECRET_KEY?.trim();
  if (!siteKey && !secretKey) {
    return;
  }
  if (!siteKey || !secretKey) {
    throw new HttpError(503, 'Sign-in verification is not configured.');
  }
  if (typeof captchaToken !== 'string' || !captchaToken.trim()) {
    throw new HttpError(403, 'Complete reCAPTCHA before signing in.');
  }

  let expectedHostname: string;
  try {
    expectedHostname = new URL(process.env.APP_URL || 'https://quranadmin.opplexify.com').hostname;
  } catch {
    throw new HttpError(503, 'Sign-in verification is not configured.');
  }

  let result: Record<string, unknown>;
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: secretKey, response: captchaToken.trim() }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      throw new Error('reCAPTCHA service unavailable');
    }
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Invalid reCAPTCHA response');
    }
    result = payload as Record<string, unknown>;
  } catch {
    throw new HttpError(503, 'Unable to verify reCAPTCHA. Please try again.');
  }

  const age = Date.now() - Date.parse(typeof result.challenge_ts === 'string' ? result.challenge_ts : '');
  if (
    result.success !== true ||
    result.action !== 'login' ||
    (result.hostname !== expectedHostname && result.hostname !== 'quran.opplexify.com') ||
    typeof result.score !== 'number' ||
    !Number.isFinite(result.score) ||
    result.score < 0.5 ||
    result.score > 1 ||
    !Number.isFinite(age) ||
    age < -30000 ||
    age > 120000
  ) {
    throw new HttpError(403, 'reCAPTCHA verification failed. Please try again.');
  }
}

function isDatabaseMissingConfiguration(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }
  return (
    error.message.includes('Access denied') ||
    error.message.includes('ECONNREFUSED') ||
    error.message.includes('Unknown database') ||
    error.message.includes('getaddrinfo')
  );
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function unavailableHandler(startupState: StartupState, serviceName: string): RequestHandler {
  return (_req, res) => {
    res.status(503).json({
      message: `${serviceName} is not available yet`,
      status: startupState.status,
      error: startupState.error,
      timestamp: new Date().toISOString(),
    });
  };
}

function publishedAnnouncements<T extends { publishAt: Date | null }>(items: T[], now = Date.now()) {
  return items.filter((item) => !item.publishAt || item.publishAt.getTime() <= now);
}

function registerReactFallback(app: express.Express) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

async function bootstrap() {
  const startupState: StartupState = {
    status: 'starting',
    updatedAt: new Date().toISOString(),
  };

  const app = express();
  app.set('trust proxy', true);

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  app.get('/health', (_req, res) => {
    res.status(startupState.status === 'error' ? 503 : 200).json({
      status: startupState.status === 'ok' ? 'ok' : startupState.status,
      app: process.env.APP_NAME || 'quran-admin-backend',
      env: process.env.NODE_ENV || 'development',
      database: AppDataSource.isInitialized ? 'connected' : 'not-connected',
      storageRoot,
      error: startupState.error,
      updatedAt: startupState.updatedAt,
      timestamp: new Date().toISOString(),
    });
  });

  app.listen(port, host, () => {
    console.log(`Quran admin app listening on ${host}:${port}`);
    console.log(`Serving React app from ${distPath}`);
    console.log(`Configured persistent assets root: ${storageRoot}`);
  });

  let assetsRegistered = false;

  try {
    ensureStorageRoot();

    app.use(
      '/assets',
      express.static(storageRoot, {
        cacheControl: true,
        etag: true,
        fallthrough: false,
        immutable: true,
        index: false,
        lastModified: true,
        maxAge: '365d',
      }),
    );
    assetsRegistered = true;

    await AppDataSource.initialize();
    await seedDefaults(AppDataSource);

    const cache = new MemoryCacheService();
    const assetPacksService = new AssetPacksService(cache);
    const authService = new AuthService(AppDataSource.getRepository(AdminUser));
    const adminService = new AdminService(
      AppDataSource.getRepository(AppUser),
      AppDataSource.getRepository(Edition),
      AppDataSource.getRepository(ContentDataset),
      AppDataSource.getRepository(Announcement),
      AppDataSource.getRepository(AppSetting),
      AppDataSource.getRepository(FeatureFlag),
      assetPacksService,
      cache,
    );
    const usersService = new UsersService(AppDataSource.getRepository(AppUser), cache);
    const editionsService = new EditionsService(AppDataSource.getRepository(Edition), cache);
    const announcementsService = new AnnouncementsService(
      AppDataSource.getRepository(Announcement),
      cache,
    );
    const settingsService = new SettingsService(
      AppDataSource.getRepository(AppSetting),
      AppDataSource.getRepository(FeatureFlag),
      cache,
    );
    const contentDatasetsService = new ContentDatasetsService(
      AppDataSource.getRepository(ContentDataset),
      cache,
    );
    const publicAiService = new PublicAiService(AppDataSource.getRepository(AppSetting), cache);
    const publicSearchService = new PublicSearchService(
      AppDataSource.getRepository(ContentDataset),
      cache,
    );

  const apiRouter = express.Router();
  const publicRouter = express.Router();
  const upload = multer({
    storage: diskStorage({
      destination: ensureStorageDirectory('tmp'),
      filename: (_req, file, cb) => {
        const timestamp = Date.now();
        const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${timestamp}-${safe}`);
      },
    }),
  });

  apiRouter.post(
    '/auth/login',
    route(async (req) => {
      const body = req.body as { email?: string; password?: string; captchaToken?: unknown };
      await verifyLoginCaptcha(body.captchaToken);
      return authService.login(body.email ?? '', body.password ?? '');
    }),
  );

  apiRouter.use((req, _res, next) => {
    const token = getBearerToken(req);
    if (!token) {
      next(new HttpError(401, 'Unauthorized'));
      return;
    }

    try {
      authService.verifyToken(token);
      next();
    } catch {
      next(new HttpError(401, 'Unauthorized'));
    }
  });

  apiRouter.get('/admin/overview', route(() => adminService.getOverview()));
  apiRouter.get('/admin/content', route(() => adminService.getContentStatus()));

  apiRouter.get(
    '/users',
    route((req) => usersService.findAll(req.query.page as string, req.query.pageSize as string)),
  );
  apiRouter.get('/users/:id/sync', route((req) => usersService.findSyncState(Number(req.params.id))));
  apiRouter.patch(
    '/users/:id/active',
    route((req) =>
      usersService.toggleActive(Number(req.params.id), Boolean((req.body as { active?: boolean }).active)),
    ),
  );

  apiRouter.get(
    '/editions',
    route((req) => editionsService.findAll(req.query.page as string, req.query.pageSize as string)),
  );
  apiRouter.post('/editions', route((req) => editionsService.upsert(req.body as Partial<Edition>)));
  apiRouter.patch(
    '/editions/:id/enabled',
    route((req) =>
      editionsService.toggle(Number(req.params.id), Boolean((req.body as { enabled?: boolean }).enabled)),
    ),
  );

  apiRouter.get(
    '/announcements',
    route((req) => announcementsService.findAll(req.query.page as string, req.query.pageSize as string)),
  );
  apiRouter.post(
    '/announcements',
    route((req) => {
      const body = req.body as {
        id?: number;
        title?: string;
        body?: string;
        active?: boolean;
        publishAt?: string;
      };
      return announcementsService.upsert({
        ...body,
        publishAt: body.publishAt ? new Date(body.publishAt) : null,
      });
    }),
  );
  apiRouter.patch(
    '/announcements/:id/active',
    route((req) =>
      announcementsService.toggle(Number(req.params.id), Boolean((req.body as { active?: boolean }).active)),
    ),
  );

  apiRouter.get(
    '/settings',
    route((req) => settingsService.getSettings(req.query.page as string, req.query.pageSize as string)),
  );
  apiRouter.post('/settings', route((req) => settingsService.upsertSetting(req.body as Partial<AppSetting>)));
  apiRouter.get('/settings/by-key/:key', route((req) => settingsService.getSettingByKey(req.params.key)));
  apiRouter.get(
    '/settings/flags',
    route((req) => settingsService.getFlags(req.query.page as string, req.query.pageSize as string)),
  );
  apiRouter.patch(
    '/settings/flags/:id',
    route((req) =>
      settingsService.toggleFlag(Number(req.params.id), Boolean((req.body as { enabled?: boolean }).enabled)),
    ),
  );

  apiRouter.get('/analytics/summary', route(() => usersService.getActivitySummary()));

  apiRouter.get(
    '/content-datasets',
    route((req) => contentDatasetsService.list(req.query.page as string, req.query.pageSize as string)),
  );
  apiRouter.get('/content-datasets/active', route(() => contentDatasetsService.activeDatasets()));
  apiRouter.post(
    '/content-datasets/:key/upload',
    upload.single('file'),
    route((req) => {
      const body = req.body as { version?: string };
      if (!req.file) {
        return { error: 'file missing' };
      }
      if (!body.version) {
        return { error: 'version missing' };
      }
      return contentDatasetsService.uploadDataset(req.params.key, body.version, req.file.path);
    }),
  );
  apiRouter.post(
    '/content-datasets/:key/activate',
    route((req) =>
      contentDatasetsService.activateDataset(
        req.params.key,
        String((req.body as { version?: string }).version ?? ''),
      ),
    ),
  );

  publicRouter.get(
    '/config',
    route(async (req) => {
      const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
      const hostHeader = req.get('host');
      const cacheKey = `public-config:${proto}:${hostHeader ?? 'unknown-host'}`;

      const config = await cache.getOrSet(cacheKey, 60_000, async () => {
        const publicBaseUrl = hostHeader ? `${proto}://${hostHeader}` : '';
        const assetsBaseUrl = publicBaseUrl ? `${publicBaseUrl}/assets` : '';
        const [
          activeAssetPacks,
          zipAssetPacks,
          activeDatasets,
          editions,
          settings,
          flags,
          announcements,
        ] = await Promise.all([
          assetPacksService.activePacks(),
          assetPacksService.zipCatalog(),
          contentDatasetsService.activeDatasets(),
          AppDataSource.getRepository(Edition).find({
            order: { id: 'ASC' },
            select: { key: true, label: true, enabled: true },
          }),
          AppDataSource.getRepository(AppSetting).find({
            select: { key: true, value: true },
          }),
          AppDataSource.getRepository(FeatureFlag).find({
            select: { key: true, enabled: true },
          }),
          AppDataSource.getRepository(Announcement).find({
            where: { active: true },
            select: { id: true, title: true, body: true, publishAt: true },
          }),
        ]);

        return {
          assetsBaseUrl,
          assetPacks: activeAssetPacks.map((pack) => ({
            edition: pack.edition,
            folderName: pack.folderName,
            version: pack.version,
            pageCount: pack.pageCount,
            fileExtension: pack.fileExtension,
            availableImportedPages: pack.availableImportedPages,
            contiguousImportedPageStart: pack.contiguousImportedPageStart,
            contiguousImportedPageEnd: pack.contiguousImportedPageEnd,
          })),
          zipAssetPacks: zipAssetPacks.map((pack) => ({
            key: pack.key,
            edition: pack.edition,
            fileName: pack.fileName,
            sizeBytes: pack.sizeBytes,
            modifiedAt: pack.modifiedAt,
            url: publicBaseUrl ? `${publicBaseUrl}${pack.publicPath}` : pack.publicPath,
          })),
          contentDatasets: activeDatasets.map((dataset) => ({
            key: dataset.key,
            version: dataset.version,
            url: publicBaseUrl ? `${publicBaseUrl}${dataset.publicPath}` : dataset.publicPath,
          })),
          editions: editions.map((edition) => ({
            key: edition.key,
            label: edition.label,
            enabled: edition.enabled,
          })),
          settings: settings
            .filter((setting) => isPublicSetting(setting.key))
            .map((setting) => ({ key: setting.key, value: setting.value })),
          featureFlags: flags.map((flag) => ({
            key: flag.key,
            enabled: flag.enabled,
          })),
          announcements: announcements.map((item) => ({
            id: item.id,
            title: item.title,
            body: item.body,
            publishAt: item.publishAt,
          })),
          serverTime: new Date().toISOString(),
        };
      });
      return {
        ...config,
        announcements: publishedAnnouncements(config.announcements),
      };
    }),
  );

  publicRouter.get(
    '/asset-packs.json',
    route(async (req) => {
      const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
      const hostHeader = req.get('host');
      const publicBaseUrl = hostHeader ? `${proto}://${hostHeader}` : '';
      const packs = await assetPacksService.zipCatalog();

      return {
        assetPacks: packs.map((pack) => ({
          key: pack.key,
          edition: pack.edition,
          fileName: pack.fileName,
          sizeBytes: pack.sizeBytes,
          modifiedAt: pack.modifiedAt,
          url: publicBaseUrl ? `${publicBaseUrl}${pack.publicPath}` : pack.publicPath,
        })),
      };
    }),
  );

  publicRouter.post('/ai/run', route((req) => publicAiService.runTool(req.body)));
  publicRouter.get('/search/surahs', route((req) => publicSearchService.searchSurahs(String(req.query.q ?? ''))));
  publicRouter.get('/search/juzs', route((req) => publicSearchService.searchJuzs(String(req.query.q ?? ''))));
  publicRouter.get(
    '/search/markers',
    route((req) =>
      publicSearchService.searchMarkers(
        String(req.query.category ?? 'ruku'),
        String(req.query.q ?? ''),
      ),
    ),
  );
  publicRouter.get(
    '/search/ayahs',
    route((req) =>
      publicSearchService.searchAyahs(
        String(req.query.q ?? ''),
        req.query.limit ? Number(req.query.limit) : undefined,
      ),
    ),
  );
  publicRouter.get(
    '/search/text',
    route((req) =>
      publicSearchService.searchText(
        String(req.query.q ?? ''),
        req.query.limit ? Number(req.query.limit) : undefined,
      ),
    ),
  );
  publicRouter.post('/sync/push', route((req) => usersService.pushSync(req.body)));
  publicRouter.get('/sync/pull', route((req) => usersService.pullSync(String(req.query.deviceId ?? ''))));

  app.use('/api', apiRouter);
  app.use('/public', publicRouter);
  registerReactFallback(app);
  app.use(errorHandler);

  startupState.status = 'ok';
  startupState.error = undefined;
  startupState.updatedAt = new Date().toISOString();
  console.log(`Serving persistent assets from ${storageRoot}`);
  } catch (error: unknown) {
    startupState.status = 'error';
    startupState.error = describeError(error);
    startupState.updatedAt = new Date().toISOString();

    if (isDatabaseMissingConfiguration(error)) {
      console.error('Database startup failed. Check DB_HOST, DB_USER, DB_PASS, and DB_NAME.');
    }

    console.error(error);

    if (!assetsRegistered) {
      app.use('/assets', unavailableHandler(startupState, 'Persistent assets'));
    }

    app.use('/api', unavailableHandler(startupState, 'Admin API'));
    app.use('/public', unavailableHandler(startupState, 'Public API'));
    registerReactFallback(app);
    app.use(errorHandler);
  }
}

function isPublicSetting(key: string) {
  const normalized = key.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return !(
    normalized === 'ai_secret' ||
    normalized === 'ai_custom_headers_json' ||
    normalized === 'ai_system_prompt' ||
    normalized.includes('password') ||
    normalized.includes('secret') ||
    normalized.includes('token') ||
    normalized.endsWith('_key')
  );
}

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (isHttpError(error)) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  const staticStatus =
    typeof (error as { status?: unknown }).status === 'number'
      ? (error as { status: number }).status
      : null;
  if (staticStatus && staticStatus >= 400 && staticStatus < 500) {
    res.status(staticStatus).json({ message: error.message || 'Request failed' });
    return;
  }

  if (error instanceof QueryFailedError) {
    res.status(500).json({ message: 'Database request failed' });
    return;
  }

  console.error(error);
  res.status(500).json({ message: 'Internal server error' });
};

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

bootstrap().catch((error: unknown) => {
  if (isDatabaseMissingConfiguration(error)) {
    console.error('Database startup failed. Check DB_HOST, DB_USER, DB_PASS, and DB_NAME.');
  }
  console.error(error);
  process.exit(1);
});
