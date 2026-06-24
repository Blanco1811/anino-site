-- CreateTable
CREATE TABLE "MigrationRun" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "rollbackOfRunId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "usersCreated" INTEGER NOT NULL DEFAULT 0,
    "agentsCreated" INTEGER NOT NULL DEFAULT 0,
    "callsCreated" INTEGER NOT NULL DEFAULT 0,
    "knowledgeCreated" INTEGER NOT NULL DEFAULT 0,
    "conflictsCount" INTEGER NOT NULL DEFAULT 0,
    "reportJson" TEXT,

    CONSTRAINT "MigrationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentKnowledge" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "link" TEXT,
    "title" TEXT,
    "legacyId" INTEGER,
    "migrationRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentKnowledge_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "legacyAccountId" INTEGER,
ADD COLUMN     "legacyBalance" DECIMAL(65,30),
ADD COLUMN     "migrationRunId" TEXT;

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "legacyAgentId" INTEGER,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "greeting" TEXT,
ADD COLUMN     "migrationRunId" TEXT,
ALTER COLUMN "startTime" DROP NOT NULL,
ALTER COLUMN "endTime" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Call" ADD COLUMN     "legacyCallId" INTEGER,
ADD COLUMN     "direction" TEXT,
ADD COLUMN     "tries" INTEGER,
ADD COLUMN     "transcript" TEXT,
ADD COLUMN     "recordingUrl" TEXT,
ADD COLUMN     "retellCallId" TEXT,
ADD COLUMN     "durationSeconds" INTEGER,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "lastSchedulerAttemptAt" TIMESTAMP(3),
ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "migrationRunId" TEXT,
ALTER COLUMN "startedAt" DROP NOT NULL,
ALTER COLUMN "startedAt" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "MigrationRun_runId_key" ON "MigrationRun"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentKnowledge_legacyId_key" ON "AgentKnowledge"("legacyId");

-- CreateIndex
CREATE INDEX "AgentKnowledge_migrationRunId_idx" ON "AgentKnowledge"("migrationRunId");

-- CreateIndex
CREATE UNIQUE INDEX "User_legacyAccountId_key" ON "User"("legacyAccountId");

-- CreateIndex
CREATE INDEX "User_migrationRunId_idx" ON "User"("migrationRunId");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_legacyAgentId_key" ON "Agent"("legacyAgentId");

-- CreateIndex
CREATE INDEX "Agent_migrationRunId_idx" ON "Agent"("migrationRunId");

-- CreateIndex
CREATE UNIQUE INDEX "Call_legacyCallId_key" ON "Call"("legacyCallId");

-- CreateIndex
CREATE INDEX "Call_migrationRunId_idx" ON "Call"("migrationRunId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_migrationRunId_fkey" FOREIGN KEY ("migrationRunId") REFERENCES "MigrationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_migrationRunId_fkey" FOREIGN KEY ("migrationRunId") REFERENCES "MigrationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_migrationRunId_fkey" FOREIGN KEY ("migrationRunId") REFERENCES "MigrationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentKnowledge" ADD CONSTRAINT "AgentKnowledge_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentKnowledge" ADD CONSTRAINT "AgentKnowledge_migrationRunId_fkey" FOREIGN KEY ("migrationRunId") REFERENCES "MigrationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
