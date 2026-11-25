-- Avatar escolhido e conquistas persistidas.
ALTER TABLE "User" ADD COLUMN "avatar" TEXT;

-- Contas que já existem ficam com NULL: a primeira conferência delas registra o que
-- já foi conquistado sem disparar notificação. Contas novas nascem conferidas.
ALTER TABLE "User" ADD COLUMN "achievementsSyncedAt" TIMESTAMP(3);
ALTER TABLE "User" ALTER COLUMN "achievementsSyncedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "UserAchievement" (
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seenAt" TIMESTAMP(3),

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("userId","achievementId")
);

-- CreateIndex
CREATE INDEX "UserAchievement_userId_seenAt_idx" ON "UserAchievement"("userId", "seenAt");

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
