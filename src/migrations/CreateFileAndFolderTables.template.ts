import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateFileAndFolderTables1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create folders table
    await queryRunner.createTable(
      new Table({
        name: 'folders',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'path',
            type: 'varchar',
            length: '1000',
            isNullable: true,
          },
          {
            name: 'parentId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'createdBy',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'deletedBy',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'isPublic',
            type: 'boolean',
            default: true,
          },
          {
            name: 'fileCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalSize',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create files table
    await queryRunner.createTable(
      new Table({
        name: 'files',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'originalName',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'path',
            type: 'text',
          },
          {
            name: 'url',
            type: 'varchar',
            length: '1000',
            isNullable: true,
          },
          {
            name: 'size',
            type: 'bigint',
          },
          {
            name: 'mimetype',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'extension',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'storageType',
            type: 'enum',
            enum: ['local', 'aws_s3', 'digital_ocean', 'linux_folder'],
            default: "'local'",
          },
          {
            name: 'storageBucket',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'storageKey',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'folderId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'uploadedBy',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'deletedBy',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'varchar',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'isPublic',
            type: 'boolean',
            default: true,
          },
          {
            name: 'checksum',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes for files table
    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_FILES_NAME',
        columnNames: ['name'],
      }),
    );

    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_FILES_STORAGE_TYPE',
        columnNames: ['storageType', 'deletedAt'],
      }),
    );

    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_FILES_MIMETYPE',
        columnNames: ['mimetype', 'deletedAt'],
      }),
    );

    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_FILES_CREATED_AT',
        columnNames: ['createdAt'],
      }),
    );

    // Create indexes for folders table
    await queryRunner.createIndex(
      'folders',
      new TableIndex({
        name: 'IDX_FOLDERS_NAME',
        columnNames: ['name', 'deletedAt'],
      }),
    );

    await queryRunner.createIndex(
      'folders',
      new TableIndex({
        name: 'IDX_FOLDERS_PARENT_ID',
        columnNames: ['parentId', 'deletedAt'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'files',
      new TableForeignKey({
        columnNames: ['folderId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'folders',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'folders',
      new TableForeignKey({
        columnNames: ['parentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'folders',
        onDelete: 'CASCADE',
      }),
    );

    // Create folder closure table for tree structure
    await queryRunner.query(`
      CREATE TABLE folders_closure (
        id_ancestor uuid NOT NULL,
        id_descendant uuid NOT NULL,
        CONSTRAINT PK_folders_closure PRIMARY KEY (id_ancestor, id_descendant),
        CONSTRAINT FK_folders_closure_ancestor FOREIGN KEY (id_ancestor) REFERENCES folders(id) ON DELETE CASCADE,
        CONSTRAINT FK_folders_closure_descendant FOREIGN KEY (id_descendant) REFERENCES folders(id) ON DELETE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop closure table
    await queryRunner.query(`DROP TABLE folders_closure`);

    // Drop foreign keys
    const filesTable = await queryRunner.getTable('files');
    const filesFolderFk = filesTable.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('folderId') !== -1,
    );
    if (filesFolderFk) {
      await queryRunner.dropForeignKey('files', filesFolderFk);
    }

    const foldersTable = await queryRunner.getTable('folders');
    const foldersParentFk = foldersTable.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('parentId') !== -1,
    );
    if (foldersParentFk) {
      await queryRunner.dropForeignKey('folders', foldersParentFk);
    }

    // Drop indexes
    await queryRunner.dropIndex('files', 'IDX_FILES_NAME');
    await queryRunner.dropIndex('files', 'IDX_FILES_STORAGE_TYPE');
    await queryRunner.dropIndex('files', 'IDX_FILES_MIMETYPE');
    await queryRunner.dropIndex('files', 'IDX_FILES_CREATED_AT');
    await queryRunner.dropIndex('folders', 'IDX_FOLDERS_NAME');
    await queryRunner.dropIndex('folders', 'IDX_FOLDERS_PARENT_ID');

    // Drop tables
    await queryRunner.dropTable('files');
    await queryRunner.dropTable('folders');
  }
}
