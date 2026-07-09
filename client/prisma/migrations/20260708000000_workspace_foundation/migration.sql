-- AlterTable
ALTER TABLE "File" ADD COLUMN     "extractedText" TEXT;

-- AlterTable
ALTER TABLE "Summary" ADD COLUMN     "fileId" UUID;

-- CreateTable
CREATE TABLE "WorkspaceArtifact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "summaryId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "summaryId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Summary_fileId_key" ON "Summary"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceArtifact_summaryId_type_key" ON "WorkspaceArtifact"("summaryId", "type");

-- CreateIndex
CREATE INDEX "WorkspaceArtifact_userId_idx" ON "WorkspaceArtifact"("userId");

-- CreateIndex
CREATE INDEX "ChatMessage_summaryId_createdAt_idx" ON "ChatMessage"("summaryId", "createdAt");

-- AddForeignKey
ALTER TABLE "Summary" ADD CONSTRAINT "Summary_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceArtifact" ADD CONSTRAINT "WorkspaceArtifact_summaryId_fkey" FOREIGN KEY ("summaryId") REFERENCES "Summary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceArtifact" ADD CONSTRAINT "WorkspaceArtifact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_summaryId_fkey" FOREIGN KEY ("summaryId") REFERENCES "Summary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
