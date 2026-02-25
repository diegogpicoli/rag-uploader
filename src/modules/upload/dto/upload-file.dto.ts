import { ApiProperty } from '@nestjs/swagger';

export class UploadFileDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'O arquivo a ser enviado',
  })
  file: Express.Multer.File;
}
