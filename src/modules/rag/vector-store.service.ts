import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import {
  PGVectorStore,
  PGVectorStoreArgs,
} from '@langchain/community/vectorstores/pgvector';

/**
 * Serviço responsável por gerenciar conexões com Bancos de Dados Vetoriais.
 * Centraliza o envio de embeddings para PGVector (Persistente) e MemoryVector (Efêmero), blindando a aplicação principal da lógica do Postgres.
 */
@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);

  // Instância do provedor de Embeddings (também usado pelo banco vetor para fazer o embedding da query de busca).
  private embeddings: OpenAIEmbeddings;

  // Instância fixa de persistência.
  private vectorStore: PGVectorStore;

  // Nome fixo reservado à tabela do PGVector para evitar espalhar valores mágicos pelo código.
  private readonly VECTOR_TABLE_NAME = 'langchain_pg_embedding';

  constructor(private readonly configService: ConfigService) {
    this.embeddings = new OpenAIEmbeddings({
      apiKey: this.getRequiredConfig('OPENAI_API_KEY'),
      model: 'text-embedding-3-small',
    });
  }

  /**
   * Camada final de inserção dos Pedacinhos Fragmentados no PostgreSQL (PGVector).
   * O que faz: Ao acionar 'store.addDocuments()', o LangChain automaticamente solicita à API da OpenAI pelas "Embeddings" (O cálculo pesado) dos pedaços.
   * Ao voltarem convertidos de palavras para vetores, ele executa um INSERT no banco na tabela informada passando o array vetorial, os metadados e o texto livre.
   */
  async persistToVectorStore(docs: Document[]) {
    this.logger.log(`Persistindo ${docs.length} chunks no PGVector...`);

    const store = await this.getVectorStore();
    await store.addDocuments(docs);

    this.logger.log(`Processamento e persistência concluídos com sucesso.`);

    return {
      totalChunks: docs.length,
      status: 'persisted_to_pgvector',
    };
  }

  /**
   * Instancia a interface de Retriever associada ao PostgreSQL (PGVectorStore).
   * O Retriever abstrai a chamada SQL de "similaridade top N".
   * O 'k: 10' diz: Traga os 10 fragmentos de texto do DB que estão semanticamente mais perto da pergunta.
   */
  async buildGlobalRetriever(k: number = 15) {
    const store = await this.getVectorStore();
    return store.asRetriever({ k });
  }

  /**
   * Constrói o Retriever volátil baseado em memória RAM usando 'MemoryVectorStore'.
   * O que faz: Processamento e salvamento provisório das Embeddings na memória da aplicação NodeJs.
   */
  async buildEphemeralRetriever(docs: Document[], k: number = 10) {
    this.logger.log(`Criando repositório de vetores em memória temporária...`);
    // Processamento e salvamento provisório das Embeddings na memória da aplicação NodeJs.
    const vectorStore = await MemoryVectorStore.fromDocuments(
      docs,
      this.embeddings,
    );
    return vectorStore.asRetriever({ k });
  }

  /**
   * Singleton Manager para a Conexão PGVectorStore do LangChain.
   * Por que é necessário: As conexões no pg precisam manter um Pool fixo pra não esgotar as rotas da lib no postgreSQL. Se já instanciado, devolve o mesmo `this.vectorStore`.
   * O que faz: Mapeia para a LLM os nomes reais das colunas instaladas previamente via DDL/EntityType.
   * Tecnologia: Usa a biblioteca de driver nativo 'pg' por baixo dos panos e envia chamadas de vector math suportadas em postgres.
   */
  private async getVectorStore(): Promise<PGVectorStore> {
    if (this.vectorStore) return this.vectorStore;

    const connectionString = this.getRequiredConfig('PGVECTOR_URL');

    const config: PGVectorStoreArgs = {
      postgresConnectionOptions: { connectionString },
      tableName: this.VECTOR_TABLE_NAME,
      columns: {
        idColumnName: 'id',
        vectorColumnName: 'embedding',
        contentColumnName: 'document',
        metadataColumnName: 'metadata',
      },
    };

    // Auto-criação da tabela por default é embutida caso ainda não exista no scheme, mas o vector ext deve existir.
    this.vectorStore = await PGVectorStore.initialize(this.embeddings, config);
    return this.vectorStore;
  }

  /**
   * Abstração de utilidade do ConfigService (NestJS/dotenv).
   * Evita referências undefined e falhas tardias (fail-fast design) exigindo falha no Boot no caso de variáves críticas apagadas.
   */
  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`${key} não configurada no .env`);
    }
    return value;
  }
}
