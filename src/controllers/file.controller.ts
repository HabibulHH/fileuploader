import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FileService } from '../services/file.service';
import {
  FileUploadDto,
  FileQueryDto,
  FileListResponseDto,
  FileUploadResponseDto,
  MultipleFileUploadResponseDto,
  BulkDeleteDto,
  BulkRestoreDto,
  BulkUpdateMetadataDto,
  BulkOperationResultDto,
} from '../dto';
import { File } from '../entities/file.entity';

@ApiTags('Files')
@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        filename: { type: 'string' },
        folderId: { type: 'string' },
        description: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        isPublic: { type: 'boolean' },
        storageType: { type: 'string', enum: ['local', 'aws_s3', 'digital_ocean', 'linux_folder'] },
        metadata: { type: 'object' },
        uploadedBy: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully', type: File })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: FileUploadDto,
  ): Promise<File> {
    return this.fileService.uploadFile(file, uploadDto);
  }

  @Post('upload/multiple')
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        folderId: { type: 'string' },
        description: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        isPublic: { type: 'boolean' },
        storageType: { type: 'string', enum: ['local', 'aws_s3', 'digital_ocean', 'linux_folder'] },
        metadata: { type: 'object' },
        uploadedBy: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Files uploaded', type: MultipleFileUploadResponseDto })
  @UseInterceptors(FilesInterceptor('files', 20)) // Max 20 files
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() uploadDto: FileUploadDto,
  ): Promise<MultipleFileUploadResponseDto> {
    const result = await this.fileService.uploadMultiple(files, uploadDto);

    return {
      successful: result.successful,
      failed: result.failed,
      total: files.length,
      successCount: result.successful.length,
      failureCount: result.failed.length,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List files with filtering, sorting, and pagination' })
  @ApiResponse({ status: 200, description: 'Files retrieved successfully', type: FileListResponseDto })
  async listFiles(@Query() queryDto: FileQueryDto): Promise<FileListResponseDto> {
    return this.fileService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file by ID' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File found', type: File })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFile(@Param('id') id: string): Promise<File> {
    return this.fileService.findById(id);
  }

  @Get(':id/signed-url')
  @ApiOperation({ summary: 'Get signed URL for file download' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiQuery({ name: 'expiresIn', required: false, description: 'URL expiration in seconds', example: 3600 })
  @ApiResponse({ status: 200, description: 'Signed URL generated', schema: { type: 'object', properties: { url: { type: 'string' } } } })
  async getSignedUrl(
    @Param('id') id: string,
    @Query('expiresIn') expiresIn?: number,
  ): Promise<{ url: string }> {
    const url = await this.fileService.getSignedUrl(id, expiresIn);
    return { url };
  }

  @Patch(':id/metadata')
  @ApiOperation({ summary: 'Update file metadata' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'Metadata updated', type: File })
  async updateMetadata(
    @Param('id') id: string,
    @Body() updates: { description?: string; tags?: string[]; isPublic?: boolean; metadata?: Record<string, any> },
  ): Promise<File> {
    return this.fileService.updateMetadata(id, updates);
  }

  @Delete(':id/soft')
  @ApiOperation({ summary: 'Soft delete a file (can be restored)' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiQuery({ name: 'deletedBy', required: false, description: 'User ID performing deletion' })
  @ApiResponse({ status: 200, description: 'File soft deleted', type: File })
  @HttpCode(HttpStatus.OK)
  async softDelete(
    @Param('id') id: string,
    @Query('deletedBy') deletedBy?: string,
  ): Promise<File> {
    return this.fileService.softDelete(id, deletedBy);
  }

  @Delete(':id/hard')
  @ApiOperation({ summary: 'Hard delete a file (permanently removes from storage)' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 204, description: 'File permanently deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async hardDelete(@Param('id') id: string): Promise<void> {
    await this.fileService.hardDelete(id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted file' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File restored', type: File })
  async restore(@Param('id') id: string): Promise<File> {
    return this.fileService.restore(id);
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Bulk delete files (soft or hard)' })
  @ApiResponse({ status: 200, description: 'Bulk delete completed', type: BulkOperationResultDto })
  async bulkDelete(@Body() dto: BulkDeleteDto): Promise<BulkOperationResultDto> {
    if (dto.soft !== false) {
      return this.fileService.bulkSoftDelete(dto);
    } else {
      return this.fileService.bulkHardDelete(dto);
    }
  }

  @Post('bulk/restore')
  @ApiOperation({ summary: 'Bulk restore soft-deleted files' })
  @ApiResponse({ status: 200, description: 'Bulk restore completed', type: BulkOperationResultDto })
  async bulkRestore(@Body() dto: BulkRestoreDto): Promise<BulkOperationResultDto> {
    return this.fileService.bulkRestore(dto);
  }

  @Patch('bulk/metadata')
  @ApiOperation({ summary: 'Bulk update file metadata' })
  @ApiResponse({ status: 200, description: 'Bulk update completed', type: BulkOperationResultDto })
  async bulkUpdateMetadata(@Body() dto: BulkUpdateMetadataDto): Promise<BulkOperationResultDto> {
    return this.fileService.bulkUpdateMetadata(dto);
  }
}
