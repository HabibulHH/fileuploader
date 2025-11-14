import { HttpException, HttpStatus } from '@nestjs/common';

export class FileUploadException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, status);
  }
}

export class FileNotFoundException extends HttpException {
  constructor(fileId: string) {
    super(`File with ID ${fileId} not found`, HttpStatus.NOT_FOUND);
  }
}

export class FolderNotFoundException extends HttpException {
  constructor(folderId: string) {
    super(`Folder with ID ${folderId} not found`, HttpStatus.NOT_FOUND);
  }
}

export class StorageNotConfiguredException extends HttpException {
  constructor(storageType: string) {
    super(
      `Storage type ${storageType} is not configured. Please configure it in the module settings.`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class FileSizeLimitException extends HttpException {
  constructor(maxSize: number, actualSize: number) {
    super(
      `File size ${actualSize} bytes exceeds the maximum allowed size of ${maxSize} bytes`,
      HttpStatus.PAYLOAD_TOO_LARGE,
    );
  }
}

export class InvalidMimeTypeException extends HttpException {
  constructor(mimetype: string, allowedTypes: string[]) {
    super(
      `MIME type ${mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    );
  }
}

export class FileAlreadyDeletedException extends HttpException {
  constructor(fileId: string) {
    super(`File with ID ${fileId} is already deleted`, HttpStatus.GONE);
  }
}

export class StorageOperationException extends HttpException {
  constructor(operation: string, error: string) {
    super(`Storage operation '${operation}' failed: ${error}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export class InvalidFileNameException extends HttpException {
  constructor(filename: string) {
    super(`Invalid filename: ${filename}`, HttpStatus.BAD_REQUEST);
  }
}

export class FolderNotEmptyException extends HttpException {
  constructor(folderId: string) {
    super(
      `Folder with ID ${folderId} is not empty. Delete or move files first.`,
      HttpStatus.CONFLICT,
    );
  }
}
