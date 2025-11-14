export interface FileUploadResult {
  path: string;
  url?: string;
  key?: string;
  bucket?: string;
  size: number;
  mimetype: string;
}

export interface FileDeleteResult {
  success: boolean;
  message?: string;
}

export interface SignedUrlOptions {
  expiresIn?: number; // seconds
  contentType?: string;
  contentDisposition?: string;
}

export interface IStorageStrategy {
  /**
   * Upload a file to storage
   * @param file - The file buffer or stream
   * @param filename - The destination filename
   * @param options - Additional upload options
   */
  upload(
    file: Buffer | Express.Multer.File,
    filename: string,
    options?: Record<string, any>,
  ): Promise<FileUploadResult>;

  /**
   * Upload multiple files to storage
   * @param files - Array of files to upload
   * @param options - Additional upload options
   */
  uploadMultiple(
    files: Array<Buffer | Express.Multer.File>,
    filenames: string[],
    options?: Record<string, any>,
  ): Promise<FileUploadResult[]>;

  /**
   * Delete a file from storage
   * @param path - The file path or key
   */
  delete(path: string): Promise<FileDeleteResult>;

  /**
   * Delete multiple files from storage
   * @param paths - Array of file paths or keys
   */
  deleteMultiple(paths: string[]): Promise<FileDeleteResult[]>;

  /**
   * Get a file from storage
   * @param path - The file path or key
   */
  get(path: string): Promise<Buffer>;

  /**
   * Check if file exists
   * @param path - The file path or key
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get signed URL for private files
   * @param path - The file path or key
   * @param options - Signed URL options
   */
  getSignedUrl(path: string, options?: SignedUrlOptions): Promise<string>;

  /**
   * Get file metadata
   * @param path - The file path or key
   */
  getMetadata(path: string): Promise<Record<string, any>>;

  /**
   * Copy a file within storage
   * @param sourcePath - Source file path
   * @param destinationPath - Destination file path
   */
  copy(sourcePath: string, destinationPath: string): Promise<FileUploadResult>;

  /**
   * Move a file within storage
   * @param sourcePath - Source file path
   * @param destinationPath - Destination file path
   */
  move(sourcePath: string, destinationPath: string): Promise<FileUploadResult>;
}
