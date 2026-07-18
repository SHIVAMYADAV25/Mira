-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "parentId" TEXT;

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Main',
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "headMessageId" TEXT,
    "forkedFromMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Branch_conversationId_createdAt_idx" ON "Branch"("conversationId", "createdAt" ASC);

-- CreateIndex
CREATE INDEX "Branch_headMessageId_idx" ON "Branch"("headMessageId");

-- CreateIndex
CREATE INDEX "Message_parentId_idx" ON "Message"("parentId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_headMessageId_fkey" FOREIGN KEY ("headMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: give every existing conversation a "Main" branch pointing at its
-- current last message, and chain existing messages into a linear parentId
-- history (oldest -> newest) so pre-existing conversations keep working.
DO $$
DECLARE
  conv RECORD;
  msg RECORD;
  prev_id TEXT;
  last_id TEXT;
BEGIN
  FOR conv IN SELECT id FROM "Conversation" LOOP
    prev_id := NULL;
    last_id := NULL;

    FOR msg IN
      SELECT id FROM "Message"
      WHERE "conversationId" = conv.id
      ORDER BY "createdAt" ASC
    LOOP
      IF prev_id IS NOT NULL THEN
        UPDATE "Message" SET "parentId" = prev_id WHERE id = msg.id;
      END IF;
      prev_id := msg.id;
      last_id := msg.id;
    END LOOP;

    INSERT INTO "Branch" (id, "conversationId", name, "isMain", "headMessageId", "createdAt", "updatedAt")
    VALUES (
      'main_' || substr(md5(random()::text || conv.id), 1, 20),
      conv.id,
      'Main',
      true,
      last_id,
      now(),
      now()
    );
  END LOOP;
END $$;
