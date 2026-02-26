import { ApiProperty } from '@nestjs/swagger';
import { Allow, IsNotEmpty, IsString } from 'class-validator';

export class InstantQuestionDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'O arquivo a ser analisado temporariamente',
  })
  @Allow()
  file: Express.Multer.File;

  @ApiProperty({
    description: 'A pergunta que você quer fazer sobre o documento',
    example: 'Resuma este documento em 3 tópicos.',
  })
  @IsNotEmpty()
  @IsString()
  message: string;
}
