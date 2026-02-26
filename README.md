# RAG Uploader

Este é um projeto desenvolvido em **NestJS** que implementa um sistema de **Retrieval-Augmented Generation (RAG)** em conjunto com o LangChain, OpenAI e um banco de dados vetorial (PostgreSQL com extensão `pgvector`).

O projeto permite o upload de arquivos para extração de banco de dados vetorial persistente, além de permitir interações e perguntas (Q&A) tanto sobre documentos efêmeros quanto sobre o banco de dados armazenado globalmente.

---

## 🚀 Como Usar o Projeto

### Pré-requisitos

1. **Node.js** instalado na máquina.
2. **Gerenciador de pacotes** (`pnpm` preferencialmente, pois o projeto o utiliza, ou `npm` / `yarn`).
3. **Docker e Docker Compose** instalados (para inicializar rapidamente o PostgreSQL com a extensão `pgvector`).
4. Conta na OpenAI com uma chave de API válida para usar o modelo de linguagem (LLM) e embeddings.

### Configuração do Ambiente

1. Clone o repositório ou navegue até a pasta raiz do projeto.
2. Crie um arquivo `.env` na raiz do projeto contendo as variáveis de ambiente necessárias (como as configurações de conexão do banco de dados e a `OPENAI_API_KEY`).
3. Suba o banco de dados utilizando o Docker Compose:
   ```bash
   docker-compose up -d
   ```
4. Instale as dependências executando:
   ```bash
   pnpm install
   ```

### Executando o Projeto

O servidor NestJS pode ser iniciado de diversas maneiras. O modo recomendado para desenvolvimento é utilizar:

```bash
# Iniciar em modo de desenvolvimento observando as mudanças
pnpm start:dev
```

Por padrão, a aplicação roda na porta `3000`.

A documentação interativa da API, gerada através do Swagger, pode ser acessada através da seguinte URL após ligar a aplicação:
👉 **[http://localhost:3000/api](http://localhost:3000/api)**

---

## 🗺️ Mapeamento de Rotas

Todas as rotas suportam acesso via HTTP, e os "schemas" de requests e responses podem ser consultados dinamicamente na página do Swagger (`/api`).

### 1. Upload e Processamento (Persistente)

**`POST /upload`**

- **Descrição:** Realiza o upload de um arquivo, extrai seu conteúdo, fragmenta em pedaços e persiste (vectoriza) no banco de dados para base de conhecimento.
- **Content-Type:** `multipart/form-data`
- **Corpo da requisição:**
  - `file`: Arquivo a ser processado (ex: PDF ou TXT).
- **Resposta de Sucesso:**
  - `status: 201`
  - Retorna uma mensagem de sucesso e os dados da persistência.

### 2. Pergunta Efêmera (Instantânea)

**`POST /upload/ask-instant`**

- **Descrição:** Faz uma pergunta (Q&A) em tempo real (RAG Efêmero) _apenas_ sobre o arquivo enviado na requisição, sem salvá-lo de forma permanente no banco de dados vetorial.
- **Content-Type:** `multipart/form-data`
- **Corpo da requisição:**
  - `file`: Arquivo para leitura.
  - `message`: String com a pergunta a ser respondida de acordo com o contexto do documento.
- **Resposta de Sucesso:**
  - `status: 201`
  - Retorna a resposta gerada extraída do documento temporário.

### 3. Pergunta Global (Base de Conhecimento)

**`POST /rag/ask-global`**

- **Descrição:** Faz uma pergunta cujo contexto busca, de maneira global, dados cruzados advintos de _todos_ os documentos previamente processados (via upload persistente) e armazenados no seu banco vetorial.
- **Content-Type:** `application/json`
- **Corpo da requisição:**
  ```json
  {
    "question": "Sua pergunta global aqui"
  }
  ```
- **Resposta de Sucesso:**
  - `status: 201/200`
  - Retorna a resposta contextualizada compilada a partir da semelhança (similarity search) no DB.
