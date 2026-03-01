import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Document } from '@langchain/core/documents';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import {
  RunnablePassthrough,
  RunnableSequence,
} from '@langchain/core/runnables';
import { DocumentProcessorService } from './document-processor.service';
import { VectorStoreService } from './vector-store.service';

/**
 * Maestro das operações RAG.
 * Diferente da antiga classe complexa, esta coordena a preparação de documentos, a persistência via vetores e as chamadas de Chat do LLM.
 * Segue fortemente o Princípio de Responsabilidade Única (SRP) ao delegar as funções pesadas e focar na orquestração dos Prompts e Pipelines LCEL.
 */
@Injectable()
export class RagService {
  // Logger do NestJS para registrar o rastreio da aplicação e auditoria no console.
  private readonly logger = new Logger(RagService.name);

  // Instância do motor do modelo de linguagem (LLM).
  // O que faz/Por que: Recebe o prompt + os contextos vetoriais (RAG) e gera a resposta em linguagem humana, interpretando e abstraindo as informações encontradas.
  private chatModel: ChatOpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly documentProcessor: DocumentProcessorService,
    private readonly vectorStore: VectorStoreService,
  ) {
    // Inicializa o gpt-4o focado em respostas literais sobre o contexto. É necessário um modelo mais robusto para lidar com muita poluição de fragmentos no contexto do RAG ("Lost in the middle").
    this.chatModel = new ChatOpenAI({
      apiKey: this.getRequiredConfig('OPENAI_API_KEY'),
      model: 'gpt-4o',
      temperature: 0,
    });
  }

  /**
   * Ponto de entrada: processa um arquivo físico salvo na máquina, divide-o e guarda no PGVector.
   * Por que é necessário: Para construir a base de conhecimento persistente. Documentos grandes não cabem inteiros de uma vez no prompt LLM.
   * @param filePath Caminho absoluto do arquivo a ser lido.
   */
  async processDocument(filePath: string) {
    this.logger.log(
      `Iniciando fluxo de processamento e persistência para: ${filePath}`,
    );

    try {
      // 1. Carregamento bruto abstraído do sistema de arquivos ou parser pdf
      const rawDocs = await this.documentProcessor.loadDocument(filePath);

      // 2. Transforma as páginas longas em pedaços mastigáveis pro LLM (Chunking)
      const splitDocs = await this.documentProcessor.splitDocuments(rawDocs);

      // 3. Limpa e empacota metadados nos fragmentos
      const enrichedDocs = this.documentProcessor.enrichMetadata(splitDocs);

      // 4. Delegação para o VectorStore gravar persistente no PGVector.
      return await this.vectorStore.persistToVectorStore(enrichedDocs);
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Executa a técnica de Retrieval-Augmented Generation global, pesquisando na base do PG.
   * @param question A pergunta livre digitada pelo usuário.
   */
  async answerGlobalQuestion(question: string) {
    this.logger.log(`Respondendo pergunta global na base vetorial (RAG)`);

    try {
      // Cria a figura do Retriever através da classe delegada de Armazenamento Vectorial.
      // O '15' diz: Traga os 15 fragmentos mais similares.
      const retriever = await this.vectorStore.buildGlobalRetriever(15);

      // Busca Prompt Corporativo Padrão
      const prompt = this.buildGlobalPrompt();

      // Interseca o Contexto do Banco, O Modelo do GPT e o Parser do Usuário.
      const chain = this.buildRagChain(retriever, prompt, {
        logSources: true,
        separator: '\n\n---\n\n',
      });

      return await chain.invoke({ input: question });
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Realiza um ciclo de Q&A isolado sem alterar o estado do banco principal. (RAG Efêmero)
   * Processando totalmente do Express Multer para a mémoria RAM em tempo de voo.
   * @param file O Buffer provindo de um request de upload em memória.
   * @param question A pergunta associada a ele.
   */
  async answerEphemeralQuestion(file: Express.Multer.File, question: string) {
    this.logger.log(
      `Iniciando fluxo unificado Q&A efêmero para o arquivo: ${file.originalname}`,
    );

    try {
      // 1. Geração local em RAM do documento provido como buffer
      const rawDocs = await this.documentProcessor.loadDocumentFromBuffer(file);
      const splitDocs = await this.documentProcessor.splitDocuments(rawDocs);

      // 2. Pede um vector store efêmero (Em RAM) temporário ao VectorStoreService
      const retriever = await this.vectorStore.buildEphemeralRetriever(
        splitDocs,
        10,
      );

      const prompt = this.buildEphemeralPrompt();

      const chain = this.buildRagChain(retriever, prompt, {
        logSources: false, // Menos poluição visual localmente
        separator: '\n\n',
      });

      return await chain.invoke({ input: question });
    } catch (error) {
      this.handleError(error);
    }
  }

  // --- MÉTODOS PRIVADOS DE APROVISIONAMENTO RAG ---

  /**
   * Escreve o Promt Template Global corporativo.
   * Usa ChatPromptTemplate do LangChain. É vital para controlar as alucinações da IA.
   * Instruções como "Sempre baseie sua resposta apenas no contexto" são chaves essenciais na construção de aplicações e agentes seguros (AI Engineering).
   */
  private buildGlobalPrompt() {
    return ChatPromptTemplate.fromMessages([
      [
        'system',
        'Você é um assistente corporativo prestativo. Use os seguintes pedaços de contexto recuperado da base de conhecimento para responder à pergunta.\n' +
          'Sempre baseie sua resposta apenas no contexto abaixo. Se a resposta não estiver no contexto, diga que não sabe.\n\n' +
          'Contexto:\n{context}',
      ],
      ['human', '{input}'],
    ]);
  }

  /**
   * Promt Template Efêmero.
   * Explicita explicitamente via IA Prompt Engineering que ela está trabalhando com um documento provisório e avulso.
   */
  private buildEphemeralPrompt() {
    return ChatPromptTemplate.fromMessages([
      [
        'system',
        'Você é um assistente prestativo. Use o contexto recuperado para responder à pergunta.\n' +
          'Este documento NÃO está salvo no banco permanentemente, responda apenas sobre ele.\n' +
          'Contexto: {context}',
      ],
      ['human', '{input}'],
    ]);
  }

  /**
   * Coração da orquestração LangChain Expression Language (LCEL).
   * Por que é necessário: Para resolver as injeções assíncronas de contexto perfitamente alinhadas com o Prompt, enviando isso para a LLM e capturando apenas a string final.
   * RunnableSequence processa cada etapa numa esteira (array de Passos). O RunnablePassthrough permite que o Input flua livremente após o Retriever fazer o merge do texto contextual.
   */
  private buildRagChain(
    retriever: { invoke: (input: string) => Promise<Document[]> },
    prompt: ChatPromptTemplate,
    options: { logSources: boolean; separator: string },
  ) {
    return RunnableSequence.from([
      // Passo 1: Assimilar Contextos Através do Input
      {
        context: async (input: { input: string }) => {
          // Dispara busca vetorial semântica (seja PG ou Memória intermediada pela VectorStoreService)
          const relevantDocs = await retriever.invoke(input.input);

          // Ponto útil para Tracking (Mostra de quais PDFs os pedaços vieram)
          if (options.logSources) {
            this.logger.debug(
              `Contextos encontrados nos arquivos: ${[
                ...new Set(
                  relevantDocs.map((d: Document) => String(d.metadata.source)),
                ),
              ].join(', ')}`,
            );
          }

          // Concatena todos os conteúdos literais separados via Enter.
          return relevantDocs
            .map((doc: Document) => doc.pageContent)
            .join(options.separator);
        },
        input: new RunnablePassthrough(),
      },
      // Passo 2: Engatilhar o prompt template injetando as variáveis {context} geradas acima.
      prompt,
      // Passo 3: Passar pro modelo GTP da OpenAI processar texto em inferência.
      this.chatModel,
      // Passo 4: Formatador/Parser simples que remove Metadados AIMessage Langchain, resultando numa String crua e limpa.
      new StringOutputParser(),
    ]);
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

  /**
   * Handler global padronizado de relatórios de erros na arquitetura.
   * Intercepta Exceptions variadas, registra no Terminal da aplicação adequadamente loggado como ERROR, e re-arremessa a exeção para subir até os Filters do Nest ou até o Controller final estourar um HTTP 500 ou correspondente.
   */
  private handleError(error: unknown): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(`Falha no processamento de RAG: ${errorMessage}`);
    throw error;
  }
}
