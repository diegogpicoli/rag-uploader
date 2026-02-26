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

  /**
   * Processo padrão: Salva o arquivo e gera embeddings no banco vetorial persistente (PGVector).
   */
  async processUploadedFile(file: Express.Multer.File) {
    this.logger.log(`Processando upload persistente: ${file.originalname}`);

    const savedPath = await this.storageService.saveFile(file);

    try {
      await this.ragService.processDocument(savedPath);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Falha ao processar embeddings para ${file.originalname}: ${errorMessage}`,
      );
    }

    return {
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      path: savedPath,
    };
  }

  /**
   * Processo Efêmero: Processa em memória e responde instantaneamente sem persistir no banco e nem no disco.
   */
  async answerInstantQuestion(file: Express.Multer.File, message: string) {
    this.logger.log(`Processando Q&A instantâneo: ${file.originalname}`);

    try {
      // Repassa o arquivo inteiro (com buffer em memória) diretamente para a IA
      const answer = await this.ragService.answerEphemeralQuestion(
        file,
        message,
      );

      return {
        originalName: file.originalname,
        ragAnswer: answer,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Erro ao processar Q&A instantâneo: ${errorMessage}`);
      throw error;
    }
  }
}
