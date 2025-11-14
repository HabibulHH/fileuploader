import { Module, DynamicModule, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { File } from './entities/file.entity';
import { Folder } from './entities/folder.entity';
import { FileService } from './services/file.service';
import { FolderService } from './services/folder.service';
import { StorageFactory } from './services/storage.factory';
import { FileController } from './controllers/file.controller';
import { FolderController } from './controllers/folder.controller';
import {
  FileUploadModuleConfig,
  FileUploadModuleAsyncOptions,
  FileUploadModuleOptionsFactory,
} from './config/file-upload-config.interface';

export const FILE_UPLOAD_MODULE_OPTIONS = 'FILE_UPLOAD_MODULE_OPTIONS';

@Module({})
export class FileUploadModule {
  /**
   * Synchronous configuration
   */
  static forRoot(config: FileUploadModuleConfig): DynamicModule {
    return {
      module: FileUploadModule,
      imports: [TypeOrmModule.forFeature([File, Folder])],
      controllers: [FileController, FolderController],
      providers: [
        {
          provide: FILE_UPLOAD_MODULE_OPTIONS,
          useValue: config,
        },
        {
          provide: StorageFactory,
          useFactory: (options: FileUploadModuleConfig) => {
            return new StorageFactory(options.storage);
          },
          inject: [FILE_UPLOAD_MODULE_OPTIONS],
        },
        FileService,
        FolderService,
      ],
      exports: [FileService, FolderService, StorageFactory],
    };
  }

  /**
   * Asynchronous configuration
   */
  static forRootAsync(options: FileUploadModuleAsyncOptions): DynamicModule {
    return {
      module: FileUploadModule,
      imports: [
        TypeOrmModule.forFeature([File, Folder]),
        ...(options.imports || []),
      ],
      controllers: [FileController, FolderController],
      providers: [
        ...this.createAsyncProviders(options),
        {
          provide: StorageFactory,
          useFactory: (config: FileUploadModuleConfig) => {
            return new StorageFactory(config.storage);
          },
          inject: [FILE_UPLOAD_MODULE_OPTIONS],
        },
        FileService,
        FolderService,
      ],
      exports: [FileService, FolderService, StorageFactory],
    };
  }

  private static createAsyncProviders(
    options: FileUploadModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    if (!options.useClass) {
      throw new Error('useClass must be provided when using class-based async configuration');
    }

    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: FileUploadModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: FILE_UPLOAD_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    const injectToken = options.useExisting || options.useClass;
    if (!injectToken) {
      throw new Error('useExisting or useClass must be provided for factory-based async configuration');
    }

    return {
      provide: FILE_UPLOAD_MODULE_OPTIONS,
      useFactory: async (optionsFactory: FileUploadModuleOptionsFactory) =>
        await optionsFactory.createFileUploadOptions(),
      inject: [injectToken],
    };
  }
}
