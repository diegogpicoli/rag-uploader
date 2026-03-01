import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { DocumentProcessorService } from './document-processor.service';
import { VectorStoreService } from './vector-store.service';

@Module({
  controllers: [RagController],
  providers: [RagService, DocumentProcessorService, VectorStoreService],
  exports: [RagService, DocumentProcessorService, VectorStoreService],
})
export class RagModule {}
