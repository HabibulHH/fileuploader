import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  DeleteObjectsCommand,
  ObjectCannedACL,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  IStorageStrategy,
  FileUploadResult,
  FileDeleteResult,
  SignedUrlOptions,
} from '../interfaces/storage-strategy.interface';

export interface AWSS3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  acl?: ObjectCannedACL;
  endpoint?: string;
}

@Injectable()
export class AWSS3Strategy implements IStorageStrategy {
  protected readonly logger = new Logger(AWSS3Strategy.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly acl: ObjectCannedACL;

  constructor(protected readonly config: AWSS3Config) {
    this.bucket = config.bucket;
    this.acl = config.acl || ObjectCannedACL.private;

    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      ...(config.endpoint && { endpoint: config.endpoint }),
    });
  }

  private getPublicUrl(key: string): string {
    if (this.config.endpoint) {
      return `${this.config.endpoint}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }

  async upload(
    file: Buffer | Express.Multer.File,
    filename: string,
    options?: Record<string, any>,
  ): Promise<FileUploadResult> {
    try {
      const buffer = Buffer.isBuffer(file) ? file : file.buffer;
      const mimetype = Buffer.isBuffer(file)
        ? options?.mimetype || 'application/octet-stream'
        : file.mimetype;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: filename,
        Body: buffer,
        ContentType: mimetype,
        ACL: this.acl,
        ...options,
      });

      await this.s3Client.send(command);

      this.logger.log(`File uploaded to S3: ${filename}`);

      return {
        path: filename,
        url: this.acl === 'public-read' ? this.getPublicUrl(filename) : undefined,
        key: filename,
        bucket: this.bucket,
        size: buffer.length,
        mimetype,
      };
    } catch (error) {
      this.logger.error(`S3 upload failed for ${filename}: ${error.message}`);
      throw error;
    }
  }

  async uploadMultiple(
    files: Array<Buffer | Express.Multer.File>,
    filenames: string[],
    options?: Record<string, any>,
  ): Promise<FileUploadResult[]> {
    const uploadPromises = files.map((file, index) =>
      this.upload(file, filenames[index], options),
    );
    return Promise.all(uploadPromises);
  }

  async delete(key: string): Promise<FileDeleteResult> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted from S3: ${key}`);

      return { success: true, message: 'File deleted successfully' };
    } catch (error) {
      this.logger.error(`S3 delete failed for ${key}: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  async deleteMultiple(keys: string[]): Promise<FileDeleteResult[]> {
    try {
      // S3 supports batch delete
      const command = new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: {
          Objects: keys.map((key) => ({ Key: key })),
        },
      });

      const response = await this.s3Client.send(command);

      this.logger.log(`Batch deleted ${keys.length} files from S3`);

      return keys.map((key) => ({
        success: true,
        message: 'File deleted successfully',
      }));
    } catch (error) {
      this.logger.error(`S3 batch delete failed: ${error.message}`);
      return keys.map(() => ({
        success: false,
        message: error.message,
      }));
    }
  }

  async get(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const chunks: Uint8Array[] = [];

      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error(`S3 get file failed for ${key}: ${error.message}`);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  async getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ...(options?.contentType && { ResponseContentType: options.contentType }),
        ...(options?.contentDisposition && {
          ResponseContentDisposition: options.contentDisposition,
        }),
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: options?.expiresIn || 3600, // Default 1 hour
      });

      return signedUrl;
    } catch (error) {
      this.logger.error(`S3 get signed URL failed for ${key}: ${error.message}`);
      throw error;
    }
  }

  async getMetadata(key: string): Promise<Record<string, any>> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        size: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        etag: response.ETag,
        metadata: response.Metadata,
      };
    } catch (error) {
      this.logger.error(`S3 get metadata failed for ${key}: ${error.message}`);
      throw error;
    }
  }

  async copy(sourceKey: string, destinationKey: string): Promise<FileUploadResult> {
    try {
      const command = new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey,
        ACL: this.acl,
      });

      await this.s3Client.send(command);
      const metadata = await this.getMetadata(destinationKey);

      this.logger.log(`File copied in S3 from ${sourceKey} to ${destinationKey}`);

      return {
        path: destinationKey,
        url: this.acl === 'public-read' ? this.getPublicUrl(destinationKey) : undefined,
        key: destinationKey,
        bucket: this.bucket,
        size: metadata.size,
        mimetype: metadata.contentType,
      };
    } catch (error) {
      this.logger.error(`S3 copy failed: ${error.message}`);
      throw error;
    }
  }

  async move(sourceKey: string, destinationKey: string): Promise<FileUploadResult> {
    try {
      const result = await this.copy(sourceKey, destinationKey);
      await this.delete(sourceKey);

      this.logger.log(`File moved in S3 from ${sourceKey} to ${destinationKey}`);
      return result;
    } catch (error) {
      this.logger.error(`S3 move failed: ${error.message}`);
      throw error;
    }
  }
}
