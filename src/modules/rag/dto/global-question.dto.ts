import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GlobalQuestionDto {
  @ApiProperty({
    description:
      'A pergunta que será feita contra toda a base de dados vetorial',
    example: 'Quais são as regras listadas nos documentos?',
  })
  @IsString()
  @IsNotEmpty()
  question: string;
}
