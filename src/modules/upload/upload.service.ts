import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../../core/storage/storage.service';
import { RagService } from '../rag/rag.service';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly storageService: StorageService,
    private readonly ragService: RagService,
  ) {}

  async processUploadedFile(file: Express.Multer.File) {
    this.logger.log(`Processando arquivo recebido: ${file.originalname}`);

    // 1. Salva o arquivo no destino final (Disco/S3)
    const savedPath = await this.storageService.saveFile(file);

    // 2. Dispara o processamento RAG (Embeddings)
    // Nota: Em um sistema real, isso poderia ser um job em background
    try {
      await this.ragService.processDocument(savedPath);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Falha ao processar RAG para ${file.originalname}: ${errorMessage}`,
      );
      // Não travamos o upload se o RAG falhar, mas logamos o erro
    }

    return {
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      path: savedPath,
    };
  }
}
