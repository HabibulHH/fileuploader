import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between, Like, IsNull } from 'typeorm';
import { File, StorageType } from '../entities/file.entity';
import { Folder } from '../entities/folder.entity';
import { StorageFactory } from './storage.factory';
import {
  FileUploadDto,
  FileQueryDto,
  FileListResponseDto,
  BulkDeleteDto,
  BulkRestoreDto,
  BulkMoveDto,
  BulkUpdateMetadataDto,
  BulkOperationResultDto,
} from '../dto';
import {
  FileNotFoundException,
  FolderNotFoundException,
  FileAlreadyDeletedException,
  StorageOperationException,
} from '../exceptions/file-upload.exceptions';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    @InjectRepository(Folder)
    private readonly folderRepository: Repository<Folder>,
    private readonly storageFactory: StorageFactory,
  ) {}

  /**
   * Upload a single file
   */
  async uploadFile(
    file: Express.Multer.File,
    uploadDto: FileUploadDto,
  ): Promise<File> {
    try {
      // Validate folder if provided
      if (uploadDto.folderId) {
        const folder = await this.folderRepository.findOne({
          where: { id: uploadDto.folderId },
        });
        if (!folder) {
          throw new FolderNotFoundException(uploadDto.folderId);
        }
      }

      // Determine storage type
      const storageType = uploadDto.storageType || StorageType.LOCAL;
      const strategy = this.storageFactory.getStrategy(storageType);

      // Generate unique filename
      const ext = path.extname(file.originalname);
      const filename = uploadDto.filename || `${uuidv4()}${ext}`;

      // Upload to storage
      const uploadResult = await strategy.upload(file, filename);

      // Create file record in database
      const fileEntity = this.fileRepository.create({
        name: filename,
        originalName: file.originalname,
        path: uploadResult.path,
        url: uploadResult.url,
        size: uploadResult.size,
        mimetype: uploadResult.mimetype,
        extension: ext.replace('.', ''),
        storageType,
        storageBucket: uploadResult.bucket,
        storageKey: uploadResult.key,
        folderId: uploadDto.folderId,
        uploadedBy: uploadDto.uploadedBy,
        description: uploadDto.description,
        tags: uploadDto.tags,
        isPublic: uploadDto.isPublic ?? true,
        metadata: uploadDto.metadata,
      });

      const savedFile = await this.fileRepository.save(fileEntity);

      // Update folder file count if applicable
      if (uploadDto.folderId) {
        await this.updateFolderStats(uploadDto.folderId);
      }

      this.logger.log(`File uploaded successfully: ${savedFile.id}`);
      return savedFile;
    } catch (error) {
      this.logger.error(`File upload failed: ${error.message}`);
      throw new StorageOperationException('upload', error.message);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(
    files: Express.Multer.File[],
    uploadDto: FileUploadDto,
  ): Promise<{ successful: File[]; failed: Array<{ filename: string; error: string }> }> {
    const successful: File[] = [];
    const failed: Array<{ filename: string; error: string }> = [];

    for (const file of files) {
      try {
        const uploadedFile = await this.uploadFile(file, uploadDto);
        successful.push(uploadedFile);
      } catch (error) {
        failed.push({
          filename: file.originalname,
          error: error.message,
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Get file by ID
   */
  async findById(id: string, includeDeleted = false): Promise<File> {
    const file = await this.fileRepository.findOne({
      where: { id },
      withDeleted: includeDeleted,
      relations: ['folder'],
    });

    if (!file) {
      throw new FileNotFoundException(id);
    }

    return file;
  }

  /**
   * List files with filtering, sorting, and pagination
   */
  async findAll(queryDto: FileQueryDto): Promise<FileListResponseDto> {
    const {
      page = 1,
      limit = 10,
      search,
      folderId,
      storageType,
      mimetype,
      extension,
      tags,
      isPublic,
      uploadedBy,
      minSize,
      maxSize,
      createdAfter,
      createdBefore,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      includeDeleted = false,
    } = queryDto;

    const queryBuilder = this.fileRepository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.folder', 'folder');

    // Apply filters
    if (search) {
      queryBuilder.andWhere('(file.name LIKE :search OR file.originalName LIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (folderId !== undefined) {
      if (folderId === null || folderId === 'null') {
        queryBuilder.andWhere('file.folderId IS NULL');
      } else {
        queryBuilder.andWhere('file.folderId = :folderId', { folderId });
      }
    }

    if (storageType) {
      queryBuilder.andWhere('file.storageType = :storageType', { storageType });
    }

    if (mimetype) {
      queryBuilder.andWhere('file.mimetype = :mimetype', { mimetype });
    }

    if (extension) {
      queryBuilder.andWhere('file.extension = :extension', { extension });
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('file.tags && :tags', { tags });
    }

    if (isPublic !== undefined) {
      queryBuilder.andWhere('file.isPublic = :isPublic', { isPublic });
    }

    if (uploadedBy) {
      queryBuilder.andWhere('file.uploadedBy = :uploadedBy', { uploadedBy });
    }

    if (minSize !== undefined) {
      queryBuilder.andWhere('file.size >= :minSize', { minSize });
    }

    if (maxSize !== undefined) {
      queryBuilder.andWhere('file.size <= :maxSize', { maxSize });
    }

    if (createdAfter) {
      queryBuilder.andWhere('file.createdAt >= :createdAfter', { createdAfter });
    }

    if (createdBefore) {
      queryBuilder.andWhere('file.createdAt <= :createdBefore', { createdBefore });
    }

    // Include deleted files if requested
    if (includeDeleted) {
      queryBuilder.withDeleted();
    }

    // Apply sorting
    queryBuilder.orderBy(`file.${sortBy}`, sortOrder);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Execute query
    const [items, total] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Soft delete a file
   */
  async softDelete(id: string, deletedBy?: string): Promise<File> {
    const file = await this.findById(id);

    if (file.deletedAt) {
      throw new FileAlreadyDeletedException(id);
    }

    if (deletedBy) {
      file.deletedBy = deletedBy;
    }
    await this.fileRepository.softDelete(id);

    this.logger.log(`File soft deleted: ${id}`);
    return file;
  }

  /**
   * Hard delete a file (remove from database and storage)
   */
  async hardDelete(id: string): Promise<void> {
    const file = await this.fileRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!file) {
      throw new FileNotFoundException(id);
    }

    try {
      // Delete from storage
      const strategy = this.storageFactory.getStrategy(file.storageType);
      await strategy.delete(file.storageKey || file.path);

      // Delete from database
      await this.fileRepository.remove(file);

      // Update folder stats if applicable
      if (file.folderId) {
        await this.updateFolderStats(file.folderId);
      }

      this.logger.log(`File hard deleted: ${id}`);
    } catch (error) {
      this.logger.error(`Hard delete failed for ${id}: ${error.message}`);
      throw new StorageOperationException('hard delete', error.message);
    }
  }

  /**
   * Restore a soft-deleted file
   */
  async restore(id: string): Promise<File> {
    const file = await this.fileRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!file) {
      throw new FileNotFoundException(id);
    }

    if (!file.deletedAt) {
      return file;
    }

    await this.fileRepository.restore(id);
    const restoredFile = await this.findById(id);

    this.logger.log(`File restored: ${id}`);
    return restoredFile;
  }

  /**
   * Update file metadata
   */
  async updateMetadata(
    id: string,
    updates: Partial<Pick<File, 'description' | 'tags' | 'isPublic' | 'metadata'>>,
  ): Promise<File> {
    const file = await this.findById(id);

    Object.assign(file, updates);
    const updatedFile = await this.fileRepository.save(file);

    this.logger.log(`File metadata updated: ${id}`);
    return updatedFile;
  }

  /**
   * Bulk soft delete files
   */
  async bulkSoftDelete(dto: BulkDeleteDto): Promise<BulkOperationResultDto> {
    const results: BulkOperationResultDto = {
      successful: [],
      failed: [],
      total: dto.fileIds.length,
      successCount: 0,
      failureCount: 0,
    };

    for (const fileId of dto.fileIds) {
      try {
        await this.softDelete(fileId, dto.deletedBy);
        results.successful.push(fileId);
        results.successCount++;
      } catch (error) {
        results.failed.push({ fileId, error: error.message });
        results.failureCount++;
      }
    }

    return results;
  }

  /**
   * Bulk hard delete files
   */
  async bulkHardDelete(dto: BulkDeleteDto): Promise<BulkOperationResultDto> {
    const results: BulkOperationResultDto = {
      successful: [],
      failed: [],
      total: dto.fileIds.length,
      successCount: 0,
      failureCount: 0,
    };

    for (const fileId of dto.fileIds) {
      try {
        await this.hardDelete(fileId);
        results.successful.push(fileId);
        results.successCount++;
      } catch (error) {
        results.failed.push({ fileId, error: error.message });
        results.failureCount++;
      }
    }

    return results;
  }

  /**
   * Bulk restore files
   */
  async bulkRestore(dto: BulkRestoreDto): Promise<BulkOperationResultDto> {
    const results: BulkOperationResultDto = {
      successful: [],
      failed: [],
      total: dto.fileIds.length,
      successCount: 0,
      failureCount: 0,
    };

    for (const fileId of dto.fileIds) {
      try {
        await this.restore(fileId);
        results.successful.push(fileId);
        results.successCount++;
      } catch (error) {
        results.failed.push({ fileId, error: error.message });
        results.failureCount++;
      }
    }

    return results;
  }

  /**
   * Bulk update metadata
   */
  async bulkUpdateMetadata(dto: BulkUpdateMetadataDto): Promise<BulkOperationResultDto> {
    const results: BulkOperationResultDto = {
      successful: [],
      failed: [],
      total: dto.fileIds.length,
      successCount: 0,
      failureCount: 0,
    };

    const updates: any = {};
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.tags !== undefined) updates.tags = dto.tags;
    if (dto.isPublic !== undefined) updates.isPublic = dto.isPublic;
    if (dto.metadata !== undefined) updates.metadata = dto.metadata;

    for (const fileId of dto.fileIds) {
      try {
        await this.updateMetadata(fileId, updates);
        results.successful.push(fileId);
        results.successCount++;
      } catch (error) {
        results.failed.push({ fileId, error: error.message });
        results.failureCount++;
      }
    }

    return results;
  }

  /**
   * Get signed URL for file download
   */
  async getSignedUrl(id: string, expiresIn = 3600): Promise<string> {
    const file = await this.findById(id);
    const strategy = this.storageFactory.getStrategy(file.storageType);

    return strategy.getSignedUrl(file.storageKey || file.path, { expiresIn });
  }

  /**
   * Update folder statistics (file count and total size)
   */
  private async updateFolderStats(folderId: string): Promise<void> {
    const stats = await this.fileRepository
      .createQueryBuilder('file')
      .select('COUNT(file.id)', 'count')
      .addSelect('COALESCE(SUM(file.size), 0)', 'totalSize')
      .where('file.folderId = :folderId', { folderId })
      .andWhere('file.deletedAt IS NULL')
      .getRawOne();

    await this.folderRepository.update(folderId, {
      fileCount: parseInt(stats.count, 10),
      totalSize: parseInt(stats.totalSize, 10),
    });
  }
}
