import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  Tree,
  TreeParent,
  TreeChildren,
} from 'typeorm';
import { File } from './file.entity';

@Entity('folders')
@Tree('closure-table')
@Index(['name', 'deletedAt'])
@Index(['parentId', 'deletedAt'])
export class Folder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  path: string;

  @TreeParent()
  parent: Folder;

  @Column({ type: 'uuid', nullable: true })
  parentId: string;

  @TreeChildren()
  children: Folder[];

  @OneToMany(() => File, (file) => file.folder)
  files: File[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  createdBy: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deletedBy: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isPublic: boolean;

  @Column({ type: 'int', default: 0 })
  fileCount: number;

  @Column({ type: 'bigint', default: 0 })
  totalSize: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}
