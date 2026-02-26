import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { UploadFilePipe } from './upload-file.pipe';
import { UploadFileDto } from './dto/upload-file.dto';
import { InstantQuestionDto } from './dto/instant-question.dto';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @ApiOperation({ summary: 'Realiza o upload persistente de um arquivo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadFileDto })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile(UploadFilePipe) file: Express.Multer.File) {
    const result = await this.uploadService.processUploadedFile(file);

    return {
      message: 'Arquivo enviado e persistido no banco vetorial com sucesso!',
      data: result,
    };
  }

  @Post('ask-instant')
  @ApiOperation({
    summary: 'Faz uma pergunta instantânea sobre um arquivo (RAG Efêmero)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: InstantQuestionDto })
  @UseInterceptors(FileInterceptor('file'))
  async askInstantQuestion(
    @UploadedFile(UploadFilePipe) file: Express.Multer.File,
    @Body() body: InstantQuestionDto,
  ) {
    const result = await this.uploadService.answerInstantQuestion(
      file,
      body.message,
    );

    return {
      message:
        'Resposta gerada com sucesso a partir do documento (em memória)!',
      data: result,
    };
  }
}
