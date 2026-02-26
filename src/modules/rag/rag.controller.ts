import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { RagService } from './rag.service';
import { GlobalQuestionDto } from './dto/global-question.dto';

@ApiTags('RAG (Base de Conhecimento)')
@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('ask-global')
  @ApiOperation({
    summary: 'Faz uma pergunta global cruzando dados de todos os documentos',
    description:
      'Busca as informações mais relevantes em todo o banco vetorial e gera uma resposta contextualizada.',
  })
  @ApiBody({ type: GlobalQuestionDto })
  @ApiResponse({
    status: 200,
    description: 'Resposta gerada com base nos documentos.',
  })
  async askGlobalQuestion(@Body() body: GlobalQuestionDto) {
    const answer = await this.ragService.answerGlobalQuestion(body.question);

    return {
      message: 'Busca global realizada com sucesso!',
      data: {
        question: body.question,
        answer: answer,
      },
    };
  }
}
