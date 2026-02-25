import { HttpStatus, ParseFilePipeBuilder } from '@nestjs/common';

export const UploadFilePipe = new ParseFilePipeBuilder()
  .addMaxSizeValidator({
    maxSize: 1024 * 1024 * 5, // 5MB
  })
  .addFileTypeValidator({
    fileType: /(jpg|jpeg|png|pdf|txt|csv)$/, // Exemplo de restrição de tipos
  })
  .build({
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  });
