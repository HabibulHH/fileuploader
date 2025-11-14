import { Injectable, Logger } from '@nestjs/common';
import { IStorageStrategy } from '../interfaces/storage-strategy.interface';
import { LocalStorageStrategy } from '../strategies/local.strategy';
import { AWSS3Strategy } from '../strategies/aws-s3.strategy';
import { DigitalOceanStrategy } from '../strategies/digital-ocean.strategy';
import { LinuxFolderStrategy } from '../strategies/linux-folder.strategy';
import { StorageType } from '../entities/file.entity';

export interface StorageConfigMap {
  [StorageType.LOCAL]?: any;
  [StorageType.AWS_S3]?: any;
  [StorageType.DIGITAL_OCEAN]?: any;
  [StorageType.LINUX_FOLDER]?: any;
}

@Injectable()
export class StorageFactory {
  private readonly logger = new Logger(StorageFactory.name);
  private strategies: Map<StorageType, IStorageStrategy> = new Map();

  constructor(private readonly configs: StorageConfigMap) {
    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    // Initialize Local Storage Strategy
    if (this.configs[StorageType.LOCAL]) {
      const strategy = new LocalStorageStrategy(this.configs[StorageType.LOCAL]);
      this.strategies.set(StorageType.LOCAL, strategy);
      this.logger.log('Local Storage Strategy initialized');
    }

    // Initialize AWS S3 Strategy
    if (this.configs[StorageType.AWS_S3]) {
      const strategy = new AWSS3Strategy(this.configs[StorageType.AWS_S3]);
      this.strategies.set(StorageType.AWS_S3, strategy);
      this.logger.log('AWS S3 Strategy initialized');
    }

    // Initialize Digital Ocean Strategy
    if (this.configs[StorageType.DIGITAL_OCEAN]) {
      const strategy = new DigitalOceanStrategy(this.configs[StorageType.DIGITAL_OCEAN]);
      this.strategies.set(StorageType.DIGITAL_OCEAN, strategy);
      this.logger.log('Digital Ocean Strategy initialized');
    }

    // Initialize Linux Folder Strategy
    if (this.configs[StorageType.LINUX_FOLDER]) {
      const strategy = new LinuxFolderStrategy(this.configs[StorageType.LINUX_FOLDER]);
      this.strategies.set(StorageType.LINUX_FOLDER, strategy);
      this.logger.log('Linux Folder Strategy initialized');
    }

    if (this.strategies.size === 0) {
      this.logger.warn('No storage strategies configured!');
    }
  }

  /**
   * Get storage strategy by type
   * @param type - Storage type
   */
  getStrategy(type: StorageType): IStorageStrategy {
    const strategy = this.strategies.get(type);

    if (!strategy) {
      throw new Error(
        `Storage strategy not found for type: ${type}. Make sure it's configured in the module.`,
      );
    }

    return strategy;
  }

  /**
   * Get default storage strategy (first available)
   */
  getDefaultStrategy(): IStorageStrategy {
    const firstStrategy = this.strategies.values().next().value;

    if (!firstStrategy) {
      throw new Error('No storage strategies available');
    }

    return firstStrategy;
  }

  /**
   * Check if a storage type is available
   */
  hasStrategy(type: StorageType): boolean {
    return this.strategies.has(type);
  }

  /**
   * Get all available storage types
   */
  getAvailableTypes(): StorageType[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Add or update a strategy dynamically
   */
  registerStrategy(type: StorageType, strategy: IStorageStrategy): void {
    this.strategies.set(type, strategy);
    this.logger.log(`Strategy registered for type: ${type}`);
  }

  /**
   * Remove a strategy
   */
  unregisterStrategy(type: StorageType): void {
    this.strategies.delete(type);
    this.logger.log(`Strategy unregistered for type: ${type}`);
  }
}
