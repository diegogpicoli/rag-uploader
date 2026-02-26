import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'O arquivo a ser enviado',
  })
  @Allow()
  file: Express.Multer.File;
}
