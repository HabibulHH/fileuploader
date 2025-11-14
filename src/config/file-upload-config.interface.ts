import { ModuleMetadata, Type } from '@nestjs/common';
import { StorageType } from '../entities/file.entity';
import { LocalStorageConfig } from '../strategies/local.strategy';
import { AWSS3Config } from '../strategies/aws-s3.strategy';
import { DigitalOceanSpacesConfig } from '../strategies/digital-ocean.strategy';
import { LinuxFolderConfig } from '../strategies/linux-folder.strategy';

export interface FileValidationConfig {
  maxFileSize?: number; // in bytes
  allowedMimeTypes?: string[]; // e.g., ['image/jpeg', 'image/png']
  allowedExtensions?: string[]; // e.g., ['jpg', 'png', 'pdf']
  virusScanHook?: (file: Express.Multer.File) => Promise<boolean>;
}

export interface StorageConfigs {
  [StorageType.LOCAL]?: LocalStorageConfig;
  [StorageType.AWS_S3]?: AWSS3Config;
  [StorageType.DIGITAL_OCEAN]?: DigitalOceanSpacesConfig;
  [StorageType.LINUX_FOLDER]?: LinuxFolderConfig;
}

export interface FileUploadModuleConfig {
  /**
   * Storage provider configurations
   */
  storage: StorageConfigs;

  /**
   * Default storage type to use if not specified
   */
  defaultStorageType?: StorageType;

  /**
   * File validation rules
   */
  validation?: FileValidationConfig;

  /**
   * Enable automatic file cleanup for orphaned files
   */
  enableAutoCleanup?: boolean;

  /**
   * Cleanup interval in milliseconds (default: 24 hours)
   */
  cleanupInterval?: number;
}

export interface FileUploadModuleOptionsFactory {
  createFileUploadOptions(): Promise<FileUploadModuleConfig> | FileUploadModuleConfig;
}

export interface FileUploadModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<FileUploadModuleOptionsFactory>;
  useClass?: Type<FileUploadModuleOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<FileUploadModuleConfig> | FileUploadModuleConfig;
  inject?: any[];
}
