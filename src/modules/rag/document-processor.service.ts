import { Injectable, Logger } from '@nestjs/common';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Serviço responsável pelo processamento de arquivos e documentos físicos ou da memória.
 * Transforma arquivos cruzeiros em Documentos LangChain, aplica fragmentação (Chunking) e enriquece metadados.
 */
@Injectable()
export class DocumentProcessorService {
  private readonly logger = new Logger(DocumentProcessorService.name);

  // Constantes de configuração para processamento (Chunking) - Clean Code.
  // CHUNK_SIZE define o número máximo de caracteres de um pedaço. LLMs e Embeddings possuem limites de comprimento (tokens).
  private readonly CHUNK_SIZE = 1000;
  // CHUNK_OVERLAP previne que cortes no meio da frase destruam o contexto. Duplica 200 caracteres entre o corte de dois blocos vizinhos.
  private readonly CHUNK_OVERLAP = 200;

  /**
   * Leitor físico especializado.
   * Extraindo texto de formatos complexos como PDF necessita de parsers nativos.
   * Se pdf: O PDFLoader interno que implementa pdf-parse da Mozilla assume o controle gerando 'Documents' já pré formatados.
   * Caso comum: Lê como txt cru do FS.
   */
  async loadDocument(filePath: string): Promise<Document[]> {
    this.logger.log(`Carregando documento do disco: ${filePath}`);
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.pdf') {
      // Leitor do langchain suportado pelo NodeJS Filesystem para extrair cada página.
      const loader = new PDFLoader(filePath);
      return await loader.load();
    }

    const content = await fs.readFile(filePath, 'utf-8');
    return [
      new Document({
        pageContent: content,
        metadata: { source: filePath },
      }),
    ];
  }

  /**
   * Buffer Loader: Estratégia in-memory para uploads Multipart.
   * Por que é necessário: Nem sempre queremos dar I/O no disco e gravar em pastas do sistema operacional (como arquivos efêmeros). Economiza tráfego de disco.
   * O que faz: Converte o Uint8Array do Buffer Express de volta para uma instância de Blob (Compatível com Web/PDFLoader Node). Adapta na hora.
   */
  async loadDocumentFromBuffer(file: Express.Multer.File): Promise<Document[]> {
    this.logger.log(`Carregando documento da memória: ${file.originalname}`);
    const ext = path.extname(file.originalname).toLowerCase();
    const sourceIdentifier = `memory://${file.originalname}`;

    if (ext === '.pdf') {
      // PDFLoader suporta WebBlobs, convertemos o Node.Buffer puro no formato apropriado.
      const arrayBuffer = new Uint8Array(file.buffer).buffer;
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const loader = new PDFLoader(blob);
      const docs = await loader.load();

      // Assina Metadados que denotam estar na Memória, para logs coerentes.
      return docs.map((doc) => {
        doc.metadata.source = sourceIdentifier;
        return doc;
      });
    } else {
      const content = file.buffer.toString('utf-8');
      return [
        new Document({
          pageContent: content,
          metadata: { source: sourceIdentifier },
        }),
      ];
    }
  }

  /**
   * Algoritmo inteligente de separação (Chunking).
   * O LangChain RecursiveCharacterTextSplitter tenta partir texto sempre respeitando quebra de linha ('\n', ' ', '.').
   * O que faz: É preferível separar parágrafos em vez de quebrar a palavra pela metade, preservando o sentido lógico (Semântica) antes de injetar nas Embeddings.
   */
  async splitDocuments(docs: Document[]): Promise<Document[]> {
    this.logger.log(`Fragmentando os documentos recebidos...`);
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.CHUNK_SIZE,
      chunkOverlap: this.CHUNK_OVERLAP,
    });

    return await splitter.splitDocuments(docs);
  }

  /**
   * Varre todos os Documentos (agora pedaços) limpando campos nulos dos metadados extraídos dos PDFs.
   * Por que agir assim: O pgvector pode falhar ou indexar lixo com chaves erradas em sua tabela JSONB.
   * Anexa campos úteis como chunk_index e processed_at, servindo de trilha de auditoria útil no banco de dados.
   */
  enrichMetadata(docs: Document[]): Document[] {
    this.logger.log(`Limpando e enriquecendo metadados dos chunks...`);
    return docs.map((doc, index) => {
      const cleanMetadata = Object.fromEntries(
        Object.entries(doc.metadata).filter(
          ([, v]) => v !== '' && v !== null && v !== undefined,
        ),
      );

      return new Document({
        pageContent: doc.pageContent,
        metadata: {
          ...cleanMetadata,
          chunk_index: index,
          processed_at: new Date().toISOString(),
        },
      });
    });
  }
}
