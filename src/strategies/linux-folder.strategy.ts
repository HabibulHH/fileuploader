import { Injectable, Logger } from '@nestjs/common';
import { LocalStorageStrategy } from './local.strategy';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

export interface LinuxFolderConfig {
  uploadPath: string;
  baseUrl?: string;
  createFolderIfNotExists?: boolean;
  permissions?: string; // e.g., '0755', '0644'
  owner?: { uid: number; gid: number };
}

@Injectable()
export class LinuxFolderStrategy extends LocalStorageStrategy {
  private readonly permissions: string;
  private readonly owner?: { uid: number; gid: number };

  constructor(config: LinuxFolderConfig) {
    super({
      uploadPath: config.uploadPath,
      baseUrl: config.baseUrl,
      createFolderIfNotExists: config.createFolderIfNotExists,
    });

    this.permissions = config.permissions || '0644';
    this.owner = config.owner;

    this.logger.log('Linux Folder strategy initialized');
  }

  private async setFilePermissions(filepath: string): Promise<void> {
    try {
      // Set file permissions (chmod)
      await fs.chmod(filepath, parseInt(this.permissions, 8));

      // Set file owner (chown) if specified
      if (this.owner) {
        await fs.chown(filepath, this.owner.uid, this.owner.gid);
      }

      this.logger.debug(`Permissions set for ${filepath}: ${this.permissions}`);
    } catch (error) {
      this.logger.warn(`Failed to set permissions for ${filepath}: ${error.message}`);
      // Don't throw - this might fail due to insufficient privileges
    }
  }

  /**
   * Override upload to set Linux-specific permissions
   */
  async upload(
    file: Buffer | Express.Multer.File,
    filename: string,
    options?: Record<string, any>,
  ) {
    const result = await super.upload(file, filename, options);

    // Set Linux-specific permissions
    await this.setFilePermissions(result.path);

    return result;
  }

  /**
   * Override copy to set Linux-specific permissions
   */
  async copy(sourcePath: string, destinationPath: string) {
    const result = await super.copy(sourcePath, destinationPath);

    // Set Linux-specific permissions for copied file
    await this.setFilePermissions(result.path);

    return result;
  }

  /**
   * Get extended Linux file metadata including permissions
   */
  async getMetadata(filepath: string): Promise<Record<string, any>> {
    const metadata = await super.getMetadata(filepath);

    try {
      const fullPath = path.join(this.config.uploadPath, filepath);
      const stats = await fs.stat(fullPath);

      return {
        ...metadata,
        mode: stats.mode,
        permissions: (stats.mode & parseInt('777', 8)).toString(8),
        uid: stats.uid,
        gid: stats.gid,
        inode: stats.ino,
        nlink: stats.nlink,
      };
    } catch (error) {
      this.logger.error(`Failed to get extended metadata: ${error.message}`);
      return metadata;
    }
  }

  /**
   * Create a symbolic link (Linux-specific feature)
   */
  async createSymlink(targetPath: string, linkPath: string): Promise<void> {
    try {
      const fullTargetPath = path.join(this.config.uploadPath, targetPath);
      const fullLinkPath = path.join(this.config.uploadPath, linkPath);

      if (!existsSync(fullTargetPath)) {
        throw new Error(`Target file does not exist: ${targetPath}`);
      }

      await fs.symlink(fullTargetPath, fullLinkPath);
      this.logger.log(`Symlink created: ${linkPath} -> ${targetPath}`);
    } catch (error) {
      this.logger.error(`Failed to create symlink: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a path is a symbolic link
   */
  async isSymlink(filepath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.config.uploadPath, filepath);
      const stats = await fs.lstat(fullPath);
      return stats.isSymbolicLink();
    } catch (error) {
      return false;
    }
  }

  /**
   * Read symbolic link target
   */
  async readSymlink(filepath: string): Promise<string> {
    try {
      const fullPath = path.join(this.config.uploadPath, filepath);
      return await fs.readlink(fullPath);
    } catch (error) {
      this.logger.error(`Failed to read symlink: ${error.message}`);
      throw error;
    }
  }
}
