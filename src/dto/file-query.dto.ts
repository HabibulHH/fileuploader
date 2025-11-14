import { IsString, IsOptional, IsInt, Min, IsEnum, IsBoolean, IsArray, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StorageType } from '../entities/file.entity';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum FileSortField {
  NAME = 'name',
  SIZE = 'size',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  MIMETYPE = 'mimetype',
}

export class FileQueryDto {
  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search by filename', example: 'document' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by folder ID' })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional({ description: 'Filter by storage type', enum: StorageType })
  @IsOptional()
  @IsEnum(StorageType)
  storageType?: StorageType;

  @ApiPropertyOptional({ description: 'Filter by MIME type', example: 'image/png' })
  @IsOptional()
  @IsString()
  mimetype?: string;

  @ApiPropertyOptional({ description: 'Filter by file extension', example: 'pdf' })
  @IsOptional()
  @IsString()
  extension?: string;

  @ApiPropertyOptional({ description: 'Filter by tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Filter by public/private', default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Filter by uploader ID' })
  @IsOptional()
  @IsString()
  uploadedBy?: string;

  @ApiPropertyOptional({ description: 'Minimum file size in bytes' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minSize?: number;

  @ApiPropertyOptional({ description: 'Maximum file size in bytes' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxSize?: number;

  @ApiPropertyOptional({ description: 'Created after this date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdAfter?: Date;

  @ApiPropertyOptional({ description: 'Created before this date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdBefore?: Date;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: FileSortField,
    default: FileSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(FileSortField)
  sortBy?: FileSortField = FileSortField.CREATED_AT;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({ description: 'Include soft-deleted files', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeDeleted?: boolean = false;
}

export class FileListResponseDto {
  @ApiPropertyOptional({ description: 'List of files' })
  items: any[]; // Will be File entities

  @ApiPropertyOptional({ description: 'Total count of files matching criteria' })
  total: number;

  @ApiPropertyOptional({ description: 'Current page number' })
  page: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  limit: number;

  @ApiPropertyOptional({ description: 'Total number of pages' })
  totalPages: number;

  @ApiPropertyOptional({ description: 'Has next page' })
  hasNextPage: boolean;

  @ApiPropertyOptional({ description: 'Has previous page' })
  hasPreviousPage: boolean;
}
