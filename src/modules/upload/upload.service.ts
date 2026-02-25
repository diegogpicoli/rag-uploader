import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../../core/storage/storage.service';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly storageService: StorageService) {}

  async processUploadedFile(file: Express.Multer.File) {
    this.logger.log(`Processando arquivo recebido: ${file.originalname}`);

    // Como estamos usando Memory Storage, o arquivo só será salvo se chegarmos aqui
    // (ou seja, se o Pipe de validação passou)
    const savedPath = await this.storageService.saveFile(file);

    return {
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      path: savedPath,
    };
  }
}
