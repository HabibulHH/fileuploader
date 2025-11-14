import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FolderService } from '../services/folder.service';
import {
  CreateFolderDto,
  UpdateFolderDto,
  MoveFolderDto,
  FolderResponseDto,
  FolderTreeResponseDto,
} from '../dto';
import { Folder } from '../entities/folder.entity';

@ApiTags('Folders')
@Controller('folders')
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new folder' })
  @ApiResponse({ status: 201, description: 'Folder created successfully', type: Folder })
  async create(@Body() dto: CreateFolderDto): Promise<Folder> {
    return this.folderService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all folders (flat list)' })
  @ApiResponse({ status: 200, description: 'Folders retrieved', type: [Folder] })
  async findAll(): Promise<Folder[]> {
    return this.folderService.findAll();
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get folder tree structure' })
  @ApiResponse({ status: 200, description: 'Folder tree retrieved', type: [FolderTreeResponseDto] })
  async getTree(): Promise<FolderTreeResponseDto[]> {
    return this.folderService.getTree();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get folder by ID' })
  @ApiParam({ name: 'id', description: 'Folder ID' })
  @ApiResponse({ status: 200, description: 'Folder found', type: Folder })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  async findById(@Param('id') id: string): Promise<Folder> {
    return this.folderService.findById(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get folder with file count and total size' })
  @ApiParam({ name: 'id', description: 'Folder ID' })
  @ApiResponse({ status: 200, description: 'Folder stats retrieved' })
  async getFolderWithStats(@Param('id') id: string): Promise<Folder & { fileCount: number; totalSize: number }> {
    return this.folderService.getFolderWithStats(id);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Get direct children of a folder' })
  @ApiParam({ name: 'id', description: 'Folder ID' })
  @ApiResponse({ status: 200, description: 'Children retrieved', type: [Folder] })
  async getChildren(@Param('id') id: string): Promise<Folder[]> {
    return this.folderService.getChildren(id);
  }

  @Get(':id/descendants')
  @ApiOperation({ summary: 'Get all descendants of a folder (recursive)' })
  @ApiParam({ name: 'id', description: 'Folder ID' })
  @ApiResponse({ status: 200, description: 'Descendants retrieved', type: [Folder] })
  async getAllDescendants(@Param('id') id: string): Promise<Folder[]> {
    return this.folderService.getAllDescendants(id);
  }

  @Get(':id/ancestors')
  @ApiOperation({ summary: 'Get ancestors of a folder (path to root)' })
  @ApiParam({ name: 'id', description: 'Folder ID' })
  @ApiResponse({ status: 200, description: 'Ancestors retrieved', type: [Folder] })
  async getAncestors(@Param('id') id: string): Promise<Folder[]> {
    return this.folderService.getAncestors(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update folder' })
  @ApiParam({ name: 'id', description: 'Folder ID' })
  @ApiResponse({ status: 200, description: 'Folder updated', type: Folder })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFolderDto,
  ): Promise<Folder> {
    return this.folderService.update(id, dto);
  }

  @Patch(':id/move')
  @ApiOperation({ summary: 'Move folder to a new parent' })
  @ApiParam({ name: 'id', description: 'Folder ID' })
  @ApiResponse({ status: 200, description: 'Folder moved', type: Folder })
  async move(
    @Param('id') id: string,
    @Body() dto: MoveFolderDto,
  ): Promise<Folder> {
    return this.folderService.move(id, dto);
  }

  @Delete(':id/soft')
  @ApiOperation({ summary: 'Soft delete a folder and its files' })
  @ApiParam({ name: 'id', description: 'Folder ID' })
  @ApiQuery({ name: 'deletedBy', required: false, description: 'User ID performing deletion' })
  @ApiResponse({ status: 200, description: 'Folder soft deleted', type: Folder })
  @HttpCode(HttpStatus.OK)
  async softDelete(
    @Param('id') id: string,
    @Query('deletedBy') deletedBy?: string,
  ): Promise<Folder> {
    return this.folderService.softDelete(id, deletedBy);
  }

  @Delete(':id/hard')
  @ApiOperation({ summary: 'Hard delete a folder (must be empty unless force=true)' })
  @ApiParam({ name: 'id', description: 'Folder ID' })
  @ApiQuery({ name: 'force', required: false, description: 'Force delete even if not empty', type: Boolean })
  @ApiResponse({ status: 204, description: 'Folder permanently deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async hardDelete(
    @Param('id') id: string,
    @Query('force') force?: boolean,
  ): Promise<void> {
    await this.folderService.hardDelete(id, force);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted folder and its files' })
  @ApiParam({ name: 'id', description: 'Folder ID' })
  @ApiResponse({ status: 200, description: 'Folder restored', type: Folder })
  async restore(@Param('id') id: string): Promise<Folder> {
    return this.folderService.restore(id);
  }
}
