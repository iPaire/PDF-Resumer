// types/fileTypes.ts
import { Prisma } from '@prisma/client';

export type FileCreateInputWithQuiz = Omit<Prisma.FileCreateInput, 'quiz'> & {
  quiz?: Prisma.InputJsonValue;
};