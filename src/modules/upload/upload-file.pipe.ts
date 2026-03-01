import { HttpStatus, ParseFilePipeBuilder } from '@nestjs/common';

export const UploadFilePipe = new ParseFilePipeBuilder()
  .addMaxSizeValidator({
    maxSize: 1024 * 1024 * 20, // 20MB
  })
  .addFileTypeValidator({
    fileType: '.(pdf|png|jpg|jpeg|txt|csv)', // NestJS aceita extensões ou partes do mimetype
  })
  .build({
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  });
