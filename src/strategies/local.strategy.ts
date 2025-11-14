import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import {
  IStorageStrategy,
  FileUploadResult,
  FileDeleteResult,
  SignedUrlOptions,
} from '../interfaces/storage-strategy.interface';

export interface LocalStorageConfig {
  uploadPath: string;
  baseUrl?: string;
  createFolderIfNotExists?: boolean;
}

@Injectable()
export class LocalStorageStrategy implements IStorageStrategy {
  private readonly logger = new Logger(LocalStorageStrategy.name);
  private readonly uploadPath: string;
  private readonly baseUrl: string;

  constructor(private readonly config: LocalStorageConfig) {
    this.uploadPath = config.uploadPath;
    this.baseUrl = config.baseUrl || '';

    if (config.createFolderIfNotExists !== false) {
      this.ensureUploadDirectoryExists();
    }
  }

  private async ensureUploadDirectoryExists(): Promise<void> {
    try {
      if (!existsSync(this.uploadPath)) {
        await fs.mkdir(this.uploadPath, { recursive: true });
        this.logger.log(`Created upload directory: ${this.uploadPath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create upload directory: ${error.message}`);
      throw error;
    }
  }

  private getFullPath(filename: string): string {
    return path.join(this.uploadPath, filename);
  }

  private getPublicUrl(filename: string): string {
    if (!this.baseUrl) return '';
    return `${this.baseUrl}/${filename}`;
  }

  async upload(
    file: Buffer | Express.Multer.File,
    filename: string,
    options?: Record<string, any>,
  ): Promise<FileUploadResult> {
    try {
      const fullPath = this.getFullPath(filename);
      const directory = path.dirname(fullPath);

      // Ensure subdirectory exists
      if (!existsSync(directory)) {
        await fs.mkdir(directory, { recursive: true });
      }

      const buffer = Buffer.isBuffer(file) ? file : file.buffer;
      await fs.writeFile(fullPath, buffer);

      const stats = await fs.stat(fullPath);
      const mimetype = Buffer.isBuffer(file) ? 'application/octet-stream' : file.mimetype;

      this.logger.log(`File uploaded successfully: ${filename}`);

      return {
        path: fullPath,
        url: this.getPublicUrl(filename),
        size: stats.size,
        mimetype,
      };
    } catch (error) {
      this.logger.error(`Upload failed for ${filename}: ${error.message}`);
      throw error;
    }
  }

  async uploadMultiple(
    files: Array<Buffer | Express.Multer.File>,
    filenames: string[],
    options?: Record<string, any>,
  ): Promise<FileUploadResult[]> {
    const results: FileUploadResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const result = await this.upload(files[i], filenames[i], options);
      results.push(result);
    }

    return results;
  }

  async delete(filepath: string): Promise<FileDeleteResult> {
    try {
      const fullPath = this.getFullPath(filepath);

      if (existsSync(fullPath)) {
        await fs.unlink(fullPath);
        this.logger.log(`File deleted successfully: ${filepath}`);
        return { success: true, message: 'File deleted successfully' };
      }

      return { success: false, message: 'File not found' };
    } catch (error) {
      this.logger.error(`Delete failed for ${filepath}: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  async deleteMultiple(filepaths: string[]): Promise<FileDeleteResult[]> {
    const results: FileDeleteResult[] = [];

    for (const filepath of filepaths) {
      const result = await this.delete(filepath);
      results.push(result);
    }

    return results;
  }

  async get(filepath: string): Promise<Buffer> {
    try {
      const fullPath = this.getFullPath(filepath);
      return await fs.readFile(fullPath);
    } catch (error) {
      this.logger.error(`Get file failed for ${filepath}: ${error.message}`);
      throw error;
    }
  }

  async exists(filepath: string): Promise<boolean> {
    const fullPath = this.getFullPath(filepath);
    return existsSync(fullPath);
  }

  async getSignedUrl(filepath: string, options?: SignedUrlOptions): Promise<string> {
    // For local storage, return the public URL (no signing needed)
    // In production, you might want to implement a token-based system
    return this.getPublicUrl(filepath);
  }

  async getMetadata(filepath: string): Promise<Record<string, any>> {
    try {
      const fullPath = this.getFullPath(filepath);
      const stats = await fs.stat(fullPath);

      return {
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      };
    } catch (error) {
      this.logger.error(`Get metadata failed for ${filepath}: ${error.message}`);
      throw error;
    }
  }

  async copy(sourcePath: string, destinationPath: string): Promise<FileUploadResult> {
    try {
      const sourceFullPath = this.getFullPath(sourcePath);
      const destFullPath = this.getFullPath(destinationPath);
      const destDirectory = path.dirname(destFullPath);

      if (!existsSync(destDirectory)) {
        await fs.mkdir(destDirectory, { recursive: true });
      }

      await fs.copyFile(sourceFullPath, destFullPath);
      const stats = await fs.stat(destFullPath);

      this.logger.log(`File copied from ${sourcePath} to ${destinationPath}`);

      return {
        path: destFullPath,
        url: this.getPublicUrl(destinationPath),
        size: stats.size,
        mimetype: 'application/octet-stream',
      };
    } catch (error) {
      this.logger.error(`Copy failed: ${error.message}`);
      throw error;
    }
  }

  async move(sourcePath: string, destinationPath: string): Promise<FileUploadResult> {
    try {
      const result = await this.copy(sourcePath, destinationPath);
      await this.delete(sourcePath);

      this.logger.log(`File moved from ${sourcePath} to ${destinationPath}`);
      return result;
    } catch (error) {
      this.logger.error(`Move failed: ${error.message}`);
      throw error;
    }
  }
}
