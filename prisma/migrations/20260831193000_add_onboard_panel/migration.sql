-- CreateTable
CREATE TABLE "OnboardPanel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "OnboardPanel_guildId_key" ON "OnboardPanel"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardPanel_messageId_key" ON "OnboardPanel"("messageId");
