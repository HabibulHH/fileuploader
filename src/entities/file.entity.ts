import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Folder } from './folder.entity';

export enum StorageType {
  LOCAL = 'local',
  AWS_S3 = 'aws_s3',
  DIGITAL_OCEAN = 'digital_ocean',
  LINUX_FOLDER = 'linux_folder',
}

@Entity('files')
@Index(['storageType', 'deletedAt'])
@Index(['mimetype', 'deletedAt'])
@Index(['createdAt'])
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  @Index()
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  originalName: string;

  @Column({ type: 'text' })
  path: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  url: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column({ type: 'varchar', length: 200 })
  mimetype: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  extension: string;

  @Column({
    type: 'enum',
    enum: StorageType,
    default: StorageType.LOCAL,
  })
  storageType: StorageType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  storageBucket: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  storageKey: string;

  @ManyToOne(() => Folder, (folder) => folder.files, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  folder: Folder;

  @Column({ type: 'uuid', nullable: true })
  folderId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  uploadedBy: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deletedBy: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', array: true, nullable: true })
  tags: string[];

  @Column({ type: 'boolean', default: true })
  isPublic: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  checksum: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}
