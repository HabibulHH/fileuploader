import { IsArray, IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkDeleteDto {
  @ApiProperty({ description: 'Array of file IDs to delete', type: [String] })
  @IsArray()
  @IsString({ each: true })
  fileIds: string[];

  @ApiPropertyOptional({ description: 'Soft delete (default) or hard delete', default: true })
  @IsOptional()
  @IsBoolean()
  soft?: boolean = true;

  @ApiPropertyOptional({ description: 'User ID performing the deletion' })
  @IsOptional()
  @IsString()
  deletedBy?: string;
}

export class BulkRestoreDto {
  @ApiProperty({ description: 'Array of file IDs to restore', type: [String] })
  @IsArray()
  @IsString({ each: true })
  fileIds: string[];
}

export class BulkMoveDto {
  @ApiProperty({ description: 'Array of file IDs to move', type: [String] })
  @IsArray()
  @IsString({ each: true })
  fileIds: string[];

  @ApiProperty({ description: 'Target folder ID (null for root)' })
  @IsOptional()
  @IsString()
  targetFolderId?: string;
}

export class BulkUpdateMetadataDto {
  @ApiProperty({ description: 'Array of file IDs to update', type: [String] })
  @IsArray()
  @IsString({ each: true })
  fileIds: string[];

  @ApiPropertyOptional({ description: 'Update tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Update description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Update public/private status' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Add/update metadata fields' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class BulkOperationResultDto {
  @ApiProperty({ description: 'Successfully processed file IDs', type: [String] })
  successful: string[];

  @ApiProperty({ description: 'Failed operations with error messages' })
  failed: Array<{
    fileId: string;
    error: string;
  }>;

  @ApiProperty({ description: 'Total files processed' })
  total: number;

  @ApiProperty({ description: 'Number of successful operations' })
  successCount: number;

  @ApiProperty({ description: 'Number of failed operations' })
  failureCount: number;
}

export class BulkDownloadDto {
  @ApiProperty({ description: 'Array of file IDs to download', type: [String] })
  @IsArray()
  @IsString({ each: true })
  fileIds: string[];

  @ApiPropertyOptional({ description: 'Archive name for ZIP file', default: 'files.zip' })
  @IsOptional()
  @IsString()
  archiveName?: string;
}
