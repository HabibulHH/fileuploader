import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository } from 'typeorm';
import { Folder } from '../entities/folder.entity';
import { File } from '../entities/file.entity';
import {
  CreateFolderDto,
  UpdateFolderDto,
  MoveFolderDto,
  FolderResponseDto,
  FolderTreeResponseDto,
} from '../dto';
import {
  FolderNotFoundException,
  FolderNotEmptyException,
} from '../exceptions/file-upload.exceptions';

@Injectable()
export class FolderService {
  private readonly logger = new Logger(FolderService.name);

  constructor(
    @InjectRepository(Folder)
    private readonly folderRepository: TreeRepository<Folder>,
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
  ) {}

  /**
   * Create a new folder
   */
  async create(dto: CreateFolderDto): Promise<Folder> {
    // Validate parent folder if provided
    let parent: Folder | null = null;
    if (dto.parentId) {
      parent = await this.folderRepository.findOne({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new FolderNotFoundException(dto.parentId);
      }
    }

    const folder = this.folderRepository.create({
      name: dto.name,
      description: dto.description,
      parentId: dto.parentId,
      parent,
      isPublic: dto.isPublic ?? true,
      metadata: dto.metadata,
      createdBy: dto.createdBy,
    });

    const savedFolder = await this.folderRepository.save(folder);

    // Update path
    await this.updateFolderPath(savedFolder.id);

    this.logger.log(`Folder created: ${savedFolder.id}`);
    return savedFolder;
  }

  /**
   * Find folder by ID
   */
  async findById(id: string): Promise<Folder> {
    const folder = await this.folderRepository.findOne({
      where: { id },
      relations: ['parent'],
    });

    if (!folder) {
      throw new FolderNotFoundException(id);
    }

    return folder;
  }

  /**
   * Get all folders (flat list)
   */
  async findAll(): Promise<Folder[]> {
    return this.folderRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get folder tree structure
   */
  async getTree(): Promise<FolderTreeResponseDto[]> {
    const trees = await this.folderRepository.findTrees();
    return trees as FolderTreeResponseDto[];
  }

  /**
   * Get children of a folder
   */
  async getChildren(parentId: string): Promise<Folder[]> {
    const parent = await this.findById(parentId);
    return this.folderRepository.findDescendants(parent, { depth: 1 });
  }

  /**
   * Get all descendants of a folder (recursive)
   */
  async getAllDescendants(parentId: string): Promise<Folder[]> {
    const parent = await this.findById(parentId);
    return this.folderRepository.findDescendants(parent);
  }

  /**
   * Get ancestors of a folder (path to root)
   */
  async getAncestors(folderId: string): Promise<Folder[]> {
    const folder = await this.findById(folderId);
    return this.folderRepository.findAncestors(folder);
  }

  /**
   * Update folder
   */
  async update(id: string, dto: UpdateFolderDto): Promise<Folder> {
    const folder = await this.findById(id);

    Object.assign(folder, dto);
    const updatedFolder = await this.folderRepository.save(folder);

    this.logger.log(`Folder updated: ${id}`);
    return updatedFolder;
  }

  /**
   * Move folder to a new parent
   */
  async move(id: string, dto: MoveFolderDto): Promise<Folder> {
    const folder = await this.findById(id);

    // Validate target parent
    let targetParent: Folder | null = null;
    if (dto.targetParentId) {
      targetParent = await this.findById(dto.targetParentId);

      // Prevent moving folder into itself or its descendants
      const descendants = await this.getAllDescendants(id);
      const descendantIds = descendants.map((d) => d.id);
      if (descendantIds.includes(dto.targetParentId)) {
        throw new Error('Cannot move folder into itself or its descendants');
      }
    }

    folder.parentId = dto.targetParentId;
    folder.parent = targetParent;

    const movedFolder = await this.folderRepository.save(folder);

    // Update paths for this folder and all descendants
    await this.updateFolderPath(id);

    this.logger.log(`Folder moved: ${id}`);
    return movedFolder;
  }

  /**
   * Soft delete folder
   */
  async softDelete(id: string, deletedBy?: string): Promise<Folder> {
    const folder = await this.findById(id);

    folder.deletedBy = deletedBy;
    await this.folderRepository.softDelete(id);

    // Also soft delete all files in this folder
    await this.fileRepository
      .createQueryBuilder()
      .softDelete()
      .where('folderId = :folderId', { folderId: id })
      .execute();

    this.logger.log(`Folder soft deleted: ${id}`);
    return folder;
  }

  /**
   * Hard delete folder (requires empty folder)
   */
  async hardDelete(id: string, force = false): Promise<void> {
    const folder = await this.folderRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!folder) {
      throw new FolderNotFoundException(id);
    }

    // Check if folder has files
    const fileCount = await this.fileRepository.count({
      where: { folderId: id },
      withDeleted: true,
    });

    if (fileCount > 0 && !force) {
      throw new FolderNotEmptyException(id);
    }

    // If force, delete all files in folder
    if (force && fileCount > 0) {
      await this.fileRepository.delete({ folderId: id });
    }

    // Check for child folders
    const children = await this.folderRepository.find({
      where: { parentId: id },
      withDeleted: true,
    });

    if (children.length > 0 && !force) {
      throw new FolderNotEmptyException(id);
    }

    // If force, recursively delete child folders
    if (force && children.length > 0) {
      for (const child of children) {
        await this.hardDelete(child.id, true);
      }
    }

    await this.folderRepository.remove(folder);
    this.logger.log(`Folder hard deleted: ${id}`);
  }

  /**
   * Restore soft-deleted folder
   */
  async restore(id: string): Promise<Folder> {
    const folder = await this.folderRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!folder) {
      throw new FolderNotFoundException(id);
    }

    await this.folderRepository.restore(id);

    // Also restore files in this folder
    await this.fileRepository
      .createQueryBuilder()
      .restore()
      .where('folderId = :folderId', { folderId: id })
      .execute();

    const restoredFolder = await this.findById(id);
    this.logger.log(`Folder restored: ${id}`);
    return restoredFolder;
  }

  /**
   * Get folder with file count
   */
  async getFolderWithStats(id: string): Promise<Folder & { fileCount: number; totalSize: number }> {
    const folder = await this.findById(id);

    const stats = await this.fileRepository
      .createQueryBuilder('file')
      .select('COUNT(file.id)', 'count')
      .addSelect('COALESCE(SUM(file.size), 0)', 'totalSize')
      .where('file.folderId = :folderId', { folderId: id })
      .andWhere('file.deletedAt IS NULL')
      .getRawOne();

    return {
      ...folder,
      fileCount: parseInt(stats.count, 10),
      totalSize: parseInt(stats.totalSize, 10),
    };
  }

  /**
   * Update folder path based on parent hierarchy
   */
  private async updateFolderPath(folderId: string): Promise<void> {
    const folder = await this.findById(folderId);
    const ancestors = await this.getAncestors(folderId);

    // Build path from ancestors
    const pathParts = ancestors.reverse().map((f) => f.name);
    folder.path = '/' + pathParts.join('/');

    await this.folderRepository.save(folder);

    // Recursively update paths for all descendants
    const descendants = await this.getAllDescendants(folderId);
    for (const descendant of descendants) {
      if (descendant.id !== folderId) {
        await this.updateFolderPath(descendant.id);
      }
    }
  }
}
