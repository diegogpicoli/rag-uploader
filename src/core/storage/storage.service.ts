import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadPath = './uploads';

  constructor(private readonly configService: ConfigService) {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File): Promise<string> {
    const provider = this.configService.get<string>(
      'STORAGE_PROVIDER',
      'local',
    );

    if (provider === 's3') {
      return this.saveToS3(file);
    }

    return this.saveToLocal(file);
  }

  private async saveToLocal(file: Express.Multer.File): Promise<string> {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${uniqueSuffix}-${file.originalname}`;
    const filePath = path.join(this.uploadPath, filename);

    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, file.buffer, (err) => {
        if (err) {
          this.logger.error(
            `Erro ao salvar arquivo localmente: ${err.message}`,
          );
          return reject(err);
        }
        this.logger.log(`Arquivo salvo localmente em: ${filePath}`);
        resolve(filePath);
      });
    });
  }

  private async saveToS3(file: Express.Multer.File): Promise<string> {
    this.logger.log(
      `[Simulação] Enviando arquivo ${file.originalname} para o S3...`,
    );

    // Aqui você implementaria o AWS SDK (S3Client)
    // const command = new PutObjectCommand({ Bucket, Key, Body: file.buffer });

    return await Promise.resolve(
      `https://seu-bucket.s3.amazonaws.com/${Date.now()}-${file.originalname}`,
    );
  }
}
