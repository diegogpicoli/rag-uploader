import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { StorageModule } from './core/storage/storage.module';
import { UploadModule } from './modules/upload/upload.module';

@Module({
  imports: [
    // Configuração global de variáveis de ambiente
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Módulo dedicado para lidar com uploads e armazenamento (Clean Code)
    StorageModule,

    UploadModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
