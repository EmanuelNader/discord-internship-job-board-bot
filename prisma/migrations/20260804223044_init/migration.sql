-- CreateTable
CREATE TABLE "Posting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dedupHash" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'job',
    "level" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "roleFamily" TEXT NOT NULL,
    "roleTitles" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" DATETIME,
    "postedAt" DATETIME,
    "raw" TEXT,
    "channelIds" TEXT
);

-- CreateTable
CREATE TABLE "Source" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "lastRunAt" DATETIME,
    "lastError" TEXT,
    "ingestedCount" INTEGER NOT NULL DEFAULT 0,
    "droppedNonIntern" INTEGER NOT NULL DEFAULT 0,
    "droppedUnclassified" INTEGER NOT NULL DEFAULT 0,
    "droppedNonUS" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "pollIntervalSec" INTEGER NOT NULL DEFAULT 300
);

-- CreateTable
CREATE TABLE "ChannelMap" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kind" TEXT NOT NULL,
    "roleFamily" TEXT NOT NULL,
    "channelId" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Posting_dedupHash_key" ON "Posting"("dedupHash");

-- CreateIndex
CREATE UNIQUE INDEX "Posting_contentHash_key" ON "Posting"("contentHash");

-- CreateIndex
CREATE INDEX "Posting_sourceName_idx" ON "Posting"("sourceName");

-- CreateIndex
CREATE INDEX "Posting_firstSeenAt_idx" ON "Posting"("firstSeenAt");

-- CreateIndex
CREATE INDEX "Posting_kind_roleFamily_idx" ON "Posting"("kind", "roleFamily");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelMap_kind_roleFamily_key" ON "ChannelMap"("kind", "roleFamily");

