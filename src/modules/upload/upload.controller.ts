import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { UploadFilePipe } from './upload-file.pipe';
import { UploadFileDto } from './dto/upload-file.dto';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @ApiOperation({ summary: 'Realiza o upload de um arquivo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadFileDto })
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile(UploadFilePipe) file: Express.Multer.File) {
    const result = this.uploadService.processUploadedFile(file);

    return {
      message: 'Arquivo enviado com sucesso!',
      data: result,
    };
  }
}
