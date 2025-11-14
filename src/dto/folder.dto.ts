import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFolderDto {
  @ApiProperty({ description: 'Folder name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Folder description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Parent folder ID (null for root level)' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Make folder publicly accessible', default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Additional metadata as JSON',
    type: 'object',
    additionalProperties: true
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'User ID who created the folder' })
  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class UpdateFolderDto {
  @ApiPropertyOptional({ description: 'Folder name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Folder description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Make folder publicly accessible' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Additional metadata as JSON',
    type: 'object',
    additionalProperties: true
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class MoveFolderDto {
  @ApiProperty({ description: 'Target parent folder ID (null for root level)' })
  @IsOptional()
  @IsString()
  targetParentId?: string;
}

export class FolderResponseDto {
  @ApiProperty({ description: 'Folder ID' })
  id: string;

  @ApiProperty({ description: 'Folder name' })
  name: string;

  @ApiProperty({ description: 'Folder description' })
  description?: string;

  @ApiProperty({ description: 'Folder path' })
  path?: string;

  @ApiProperty({ description: 'Parent folder ID' })
  parentId?: string;

  @ApiProperty({ description: 'Number of files in folder' })
  fileCount: number;

  @ApiProperty({ description: 'Total size of files in folder (bytes)' })
  totalSize: number;

  @ApiProperty({ description: 'Is folder public' })
  isPublic: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class FolderTreeResponseDto extends FolderResponseDto {
  @ApiProperty({ description: 'Child folders', type: [FolderTreeResponseDto] })
  children?: FolderTreeResponseDto[];
}
