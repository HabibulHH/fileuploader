import { IsString, IsOptional, IsBoolean, IsArray, IsObject, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StorageType } from '../entities/file.entity';

export class FileUploadDto {
  @ApiPropertyOptional({ description: 'Custom filename (auto-generated if not provided)' })
  @IsOptional()
  @IsString()
  filename?: string;

  @ApiPropertyOptional({ description: 'Folder ID to organize the file' })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional({ description: 'File description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Tags for categorization', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Make file publicly accessible', default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Storage type to use',
    enum: StorageType,
    default: StorageType.LOCAL,
  })
  @IsOptional()
  @IsEnum(StorageType)
  storageType?: StorageType;

  @ApiPropertyOptional({
    description: 'Additional metadata as JSON',
    type: 'object',
    additionalProperties: true
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'User ID who uploaded the file' })
  @IsOptional()
  @IsString()
  uploadedBy?: string;
}

export class MultipleFileUploadDto extends FileUploadDto {
  @ApiPropertyOptional({
    description: 'Apply same settings to all files',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  applyToAll?: boolean;
}

export class FileUploadResponseDto {
  @ApiProperty({ description: 'File ID' })
  id: string;

  @ApiProperty({ description: 'Original filename' })
  originalName: string;

  @ApiProperty({ description: 'Stored filename' })
  name: string;

  @ApiProperty({ description: 'File path or storage key' })
  path: string;

  @ApiProperty({ description: 'Public URL (if available)' })
  url?: string;

  @ApiProperty({ description: 'File size in bytes' })
  size: number;

  @ApiProperty({ description: 'MIME type' })
  mimetype: string;

  @ApiProperty({ description: 'Storage type used' })
  storageType: StorageType;

  @ApiProperty({ description: 'Upload timestamp' })
  createdAt: Date;
}

export class MultipleFileUploadResponseDto {
  @ApiProperty({ description: 'Successfully uploaded files', type: [FileUploadResponseDto] })
  successful: FileUploadResponseDto[];

  @ApiProperty({ description: 'Failed uploads with error messages' })
  failed: Array<{
    filename: string;
    error: string;
  }>;

  @ApiProperty({ description: 'Total files processed' })
  total: number;

  @ApiProperty({ description: 'Number of successful uploads' })
  successCount: number;

  @ApiProperty({ description: 'Number of failed uploads' })
  failureCount: number;
}
