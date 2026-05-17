import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  AdminUser,
  Announcement,
  AppSetting,
  AppUser,
  AssetPack,
  ContentDataset,
  Edition,
  FeatureFlag,
} from './entities/index.js';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  entities: [
    AdminUser,
    Announcement,
    AppSetting,
    AppUser,
    AssetPack,
    ContentDataset,
    Edition,
    FeatureFlag,
  ],
  synchronize: process.env.DB_SYNCHRONIZE !== 'false',
  logging: process.env.DB_LOGGING === 'true',
});
