# @pocketschool/nestjs-file-uploader

A comprehensive, production-ready file upload module for NestJS with support for multiple storage providers using the Strategy Pattern.

## Features

✨ **Multiple Storage Providers**
- Local Filesystem Storage
- AWS S3
- Digital Ocean Spaces (with CDN support)
- Linux Folder (with permissions management)

🎯 **Strategy Pattern Implementation**
- Easily switch between storage providers
- Runtime storage selection
- Extensible architecture for custom providers

📦 **Complete File Management**
- Single & bulk file uploads
- Soft & hard delete with restore capability
- File metadata (tags, description, custom fields)
- Folder organization with tree structure
- File search with advanced filters

🔒 **Enterprise Features**
- File validation (size, MIME type, extensions)
- Virus scanning hooks
- Signed URLs for private files
- Transaction support for bulk operations
- Comprehensive error handling

📊 **Advanced Querying**
- Pagination, sorting, filtering
- Search by name, MIME type, folder, date range
- Soft-deleted file management

🛠️ **Developer Friendly**
- Full TypeScript support
- Swagger/OpenAPI documentation
- Dynamic module configuration
- Database migrations included

## Installation

```bash
npm install @pocketschool/nestjs-file-uploader
```

### Peer Dependencies

```bash
npm install @nestjs/common @nestjs/core @nestjs/platform-express @nestjs/typeorm typeorm reflect-metadata rxjs
```

## Quick Start

### 1. Import the Module

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileUploadModule } from '@pocketschool/nestjs-file-uploader';
import { StorageType } from '@pocketschool/nestjs-file-uploader';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      // your database config
    }),
    FileUploadModule.forRoot({
      storage: {
        [StorageType.LOCAL]: {
          uploadPath: './uploads',
          baseUrl: 'http://localhost:3000/uploads',
        },
      },
      defaultStorageType: StorageType.LOCAL,
    }),
  ],
})
export class AppModule {}
```

### 2. Run Database Migrations

Copy the migration template from `src/migrations/CreateFileAndFolderTables.template.ts` to your project's migrations folder and run:

```bash
npm run migration:run
```

### 3. Start Uploading Files

The module automatically registers REST endpoints:

```bash
# Upload a single file
POST /files/upload

# Upload multiple files
POST /files/upload/multiple

# List files
GET /files

# Get file by ID
GET /files/:id

# Delete file (soft)
DELETE /files/:id/soft

# Delete file (hard)
DELETE /files/:id/hard
```

## Configuration

### Local Storage

```typescript
FileUploadModule.forRoot({
  storage: {
    [StorageType.LOCAL]: {
      uploadPath: './uploads',
      baseUrl: 'http://localhost:3000/uploads',
      createFolderIfNotExists: true,
    },
  },
});
```

### AWS S3

```typescript
FileUploadModule.forRoot({
  storage: {
    [StorageType.AWS_S3]: {
      region: 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      bucket: 'my-bucket',
      acl: 'public-read', // or 'private'
    },
  },
});
```

### Digital Ocean Spaces

```typescript
FileUploadModule.forRoot({
  storage: {
    [StorageType.DIGITAL_OCEAN]: {
      region: 'nyc3', // or 'sgp1', 'fra1', etc.
      accessKeyId: process.env.DO_SPACES_KEY,
      secretAccessKey: process.env.DO_SPACES_SECRET,
      bucket: 'my-space',
      acl: 'public-read',
      cdnEndpoint: 'https://my-cdn.com', // optional CDN
    },
  },
});
```

### Linux Folder (with permissions)

```typescript
FileUploadModule.forRoot({
  storage: {
    [StorageType.LINUX_FOLDER]: {
      uploadPath: '/var/www/uploads',
      baseUrl: 'https://example.com/uploads',
      permissions: '0644', // file permissions
      owner: { uid: 1000, gid: 1000 }, // optional
    },
  },
});
```

### Multiple Storage Providers

```typescript
FileUploadModule.forRoot({
  storage: {
    [StorageType.LOCAL]: { /* config */ },
    [StorageType.AWS_S3]: { /* config */ },
    [StorageType.DIGITAL_OCEAN]: { /* config */ },
  },
  defaultStorageType: StorageType.AWS_S3,
  validation: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    allowedExtensions: ['jpg', 'png', 'pdf'],
  },
});
```

## Async Configuration

```typescript
FileUploadModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    storage: {
      [StorageType.AWS_S3]: {
        region: configService.get('AWS_REGION'),
        accessKeyId: configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY'),
        bucket: configService.get('AWS_BUCKET'),
      },
    },
  }),
  inject: [ConfigService],
});
```

## Usage Examples

### Upload a File

```typescript
import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService, FileUploadDto, StorageType } from '@pocketschool/nestjs-file-uploader';

@Controller('upload')
export class UploadController {
  constructor(private readonly fileService: FileService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.fileService.uploadFile(file, {
      storageType: StorageType.AWS_S3,
      tags: ['user-avatar'],
      isPublic: true,
      uploadedBy: 'user-123',
    });
  }
}
```

### List Files with Filters

```typescript
const files = await this.fileService.findAll({
  page: 1,
  limit: 20,
  search: 'document',
  mimetype: 'application/pdf',
  tags: ['important'],
  minSize: 1024,
  maxSize: 1024 * 1024 * 10,
  createdAfter: new Date('2024-01-01'),
  sortBy: 'createdAt',
  sortOrder: 'DESC',
});
```

### Bulk Delete Files

```typescript
const result = await this.fileService.bulkSoftDelete({
  fileIds: ['id1', 'id2', 'id3'],
  soft: true,
  deletedBy: 'admin-123',
});

console.log(`Deleted ${result.successCount} files`);
```

### Get Signed URL for Private Files

```typescript
const url = await this.fileService.getSignedUrl('file-id', 3600); // expires in 1 hour
```

### Working with Folders

```typescript
import { FolderService } from '@pocketschool/nestjs-file-uploader';

// Create folder
const folder = await this.folderService.create({
  name: 'Documents',
  description: 'User documents',
  parentId: null, // root level
});

// Get folder tree
const tree = await this.folderService.getTree();

// Move folder
await this.folderService.move(folderId, {
  targetParentId: newParentId,
});
```

## API Endpoints

### Files

- `POST /files/upload` - Upload single file
- `POST /files/upload/multiple` - Upload multiple files
- `GET /files` - List files (with filters)
- `GET /files/:id` - Get file by ID
- `GET /files/:id/signed-url` - Get signed URL
- `PATCH /files/:id/metadata` - Update file metadata
- `DELETE /files/:id/soft` - Soft delete
- `DELETE /files/:id/hard` - Hard delete
- `POST /files/:id/restore` - Restore deleted file
- `POST /files/bulk/delete` - Bulk delete
- `POST /files/bulk/restore` - Bulk restore
- `PATCH /files/bulk/metadata` - Bulk update metadata

### Folders

- `POST /folders` - Create folder
- `GET /folders` - List all folders
- `GET /folders/tree` - Get folder tree
- `GET /folders/:id` - Get folder by ID
- `GET /folders/:id/stats` - Get folder stats
- `GET /folders/:id/children` - Get direct children
- `GET /folders/:id/descendants` - Get all descendants
- `GET /folders/:id/ancestors` - Get ancestors (path to root)
- `PATCH /folders/:id` - Update folder
- `PATCH /folders/:id/move` - Move folder
- `DELETE /folders/:id/soft` - Soft delete
- `DELETE /folders/:id/hard` - Hard delete (requires empty or force)
- `POST /folders/:id/restore` - Restore deleted folder

## Database Schema

### Files Table
- `id` (uuid, primary key)
- `name`, `originalName`, `path`, `url`
- `size`, `mimetype`, `extension`
- `storageType`, `storageBucket`, `storageKey`
- `folderId` (foreign key)
- `uploadedBy`, `deletedBy`
- `description`, `tags`, `metadata` (jsonb)
- `isPublic`, `checksum`
- `createdAt`, `updatedAt`, `deletedAt` (soft delete)

### Folders Table
- `id` (uuid, primary key)
- `name`, `description`, `path`
- `parentId` (self-referencing foreign key)
- `fileCount`, `totalSize`
- `metadata` (jsonb)
- `isPublic`
- `createdAt`, `updatedAt`, `deletedAt`

## Advanced Features

### Custom Storage Strategy

```typescript
import { IStorageStrategy } from '@pocketschool/nestjs-file-uploader';

class MyCustomStorageStrategy implements IStorageStrategy {
  async upload(file, filename, options) {
    // Your custom upload logic
  }
  // ... implement other methods
}

// Register it
storageFactory.registerStrategy(StorageType.CUSTOM, new MyCustomStorageStrategy());
```

### Virus Scanning Hook

```typescript
FileUploadModule.forRoot({
  storage: { /* ... */ },
  validation: {
    virusScanHook: async (file) => {
      const isClean = await myVirusScanner.scan(file.buffer);
      return isClean; // return true if safe
    },
  },
});
```

## Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## License

MIT

## Contributing

Contributions welcome! Please read our contributing guidelines.

## Support

For issues and questions, please use [GitHub Issues](https://github.com/yourusername/lms-engine/issues).

---

**Made with ❤️ by PocketSchool**
