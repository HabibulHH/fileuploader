import { Injectable, Logger } from '@nestjs/common';
import { AWSS3Strategy } from './aws-s3.strategy';

export interface DigitalOceanSpacesConfig {
  region: string; // e.g., 'nyc3', 'sgp1', 'fra1'
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string; // Space name
  acl?: string;
  cdnEndpoint?: string; // Optional CDN endpoint
}

@Injectable()
export class DigitalOceanStrategy extends AWSS3Strategy {
  private readonly logger = new Logger(DigitalOceanStrategy.name);
  private readonly cdnEndpoint?: string;

  constructor(config: DigitalOceanSpacesConfig) {
    // Digital Ocean Spaces is S3-compatible, so we extend the AWS S3 strategy
    // The endpoint format is: https://{region}.digitaloceanspaces.com
    super({
      region: config.region,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      bucket: config.bucket,
      acl: config.acl,
      endpoint: `https://${config.region}.digitaloceanspaces.com`,
    });

    this.cdnEndpoint = config.cdnEndpoint;
    this.logger.log('Digital Ocean Spaces strategy initialized');
  }

  /**
   * Override to use CDN endpoint if available
   */
  private getPublicUrl(key: string): string {
    if (this.cdnEndpoint) {
      return `${this.cdnEndpoint}/${key}`;
    }
    // Fallback to standard Digital Ocean Spaces URL
    return `https://${this.config.bucket}.${this.config.region}.digitaloceanspaces.com/${key}`;
  }

  /**
   * Override upload to use CDN URL if available
   */
  async upload(
    file: Buffer | Express.Multer.File,
    filename: string,
    options?: Record<string, any>,
  ) {
    const result = await super.upload(file, filename, options);

    // Replace URL with CDN URL if available
    if (this.cdnEndpoint && result.url) {
      result.url = this.getPublicUrl(filename);
    }

    return result;
  }

  /**
   * Override copy to use CDN URL if available
   */
  async copy(sourceKey: string, destinationKey: string) {
    const result = await super.copy(sourceKey, destinationKey);

    // Replace URL with CDN URL if available
    if (this.cdnEndpoint && result.url) {
      result.url = this.getPublicUrl(destinationKey);
    }

    return result;
  }

  /**
   * Override move to use CDN URL if available
   */
  async move(sourceKey: string, destinationKey: string) {
    const result = await super.move(sourceKey, destinationKey);

    // Replace URL with CDN URL if available
    if (this.cdnEndpoint && result.url) {
      result.url = this.getPublicUrl(destinationKey);
    }

    return result;
  }
}
