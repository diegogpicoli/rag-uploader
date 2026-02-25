import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const storageProvider = configService.get<string>(
          'STORAGE_PROVIDER',
          'local',
        );

        if (storageProvider === 's3') {
          // Futuramente: Configuração do S3 aqui usando multer-s3 ou aws-sdk
          return {
            // storage: multerS3({ ... })
          };
        }

        // Configuração Padrão (Local)
        return {
          dest: './uploads',
          storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
              // Gerar nome único para o arquivo para evitar conflitos
              const uniqueSuffix =
                Date.now() + '-' + Math.round(Math.random() * 1e9);
              cb(null, `${uniqueSuffix}-${file.originalname}`);
            },
          }),
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [MulterModule],
})
export class StorageModule {}
