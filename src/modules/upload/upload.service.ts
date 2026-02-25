import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  processUploadedFile(file: Express.Multer.File) {
    this.logger.log(`Processando arquivo recebido: ${file.originalname}`);

    return {
      originalName: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      path: file.path,
    };
  }
}
