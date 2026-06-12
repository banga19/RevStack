-- AlterTable
ALTER TABLE "Client" ADD COLUMN "licenseProfile" TEXT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "storageUrl" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "branding" TEXT;

-- AlterTable
ALTER TABLE "OutreachCampaign" ADD COLUMN "bounceCount" INTEGER DEFAULT 0;
ALTER TABLE "OutreachCampaign" ADD COLUMN "clickedCount" INTEGER DEFAULT 0;
ALTER TABLE "OutreachCampaign" ADD COLUMN "messageBody" TEXT;
ALTER TABLE "OutreachCampaign" ADD COLUMN "openedCount" INTEGER DEFAULT 0;
ALTER TABLE "OutreachCampaign" ADD COLUMN "scheduleType" TEXT DEFAULT 'immediate';
ALTER TABLE "OutreachCampaign" ADD COLUMN "subject" TEXT;
ALTER TABLE "OutreachCampaign" ADD COLUMN "targetCount" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "TradeFinanceApplication" ADD COLUMN "licenseProfile" TEXT;

-- CreateTable
CREATE TABLE "CampaignStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "messageBody" TEXT NOT NULL,
    "delayDays" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" DATETIME,
    "openedCount" INTEGER DEFAULT 0,
    "replyCount" INTEGER DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CampaignStep_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "OutreachCampaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sequence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "triggerType" TEXT NOT NULL DEFAULT 'manual',
    "metrics" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SequenceStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sequenceId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'send_message',
    "subject" TEXT,
    "messageBody" TEXT,
    "callScript" TEXT,
    "delayHours" INTEGER NOT NULL DEFAULT 0,
    "condition" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metrics" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SequenceStep_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "Sequence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "linkedin" TEXT,
    "company" TEXT,
    "title" TEXT,
    "industry" TEXT,
    "source" TEXT,
    "enrichment" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProspectSequence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prospectId" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'enrolled',
    "enrolledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "lastActivityAt" DATETIME,
    CONSTRAINT "ProspectSequence_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProspectSequence_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "Sequence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProspectActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prospectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProspectActivity_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CallRecording" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "prospectId" TEXT,
    "repId" TEXT,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "duration" INTEGER,
    "recordingUrl" TEXT,
    "transcription" TEXT,
    "summary" TEXT,
    "sentiment" TEXT,
    "talkingPoints" JSONB,
    "actionItems" JSONB,
    "objections" JSONB,
    "coachingScore" REAL,
    "starredSnippets" JSONB,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CallRecording_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CallSnippet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordingId" TEXT NOT NULL,
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER NOT NULL,
    "label" TEXT,
    "tags" JSONB,
    "sharedWith" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BattleCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerKeywords" JSONB NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "commissionRate" REAL NOT NULL DEFAULT 0.15,
    "tier" TEXT NOT NULL DEFAULT 'affiliate',
    "status" TEXT NOT NULL DEFAULT 'active',
    "bio" TEXT,
    "website" TEXT,
    "companyName" TEXT,
    "region" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "totalEarned" REAL NOT NULL DEFAULT 0,
    "totalPaid" REAL NOT NULL DEFAULT 0,
    "payoutMethod" TEXT,
    "payoutDetails" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Partner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "referredUserId" TEXT,
    "referredEmail" TEXT,
    "referredName" TEXT,
    "referralCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "commissionEarned" REAL NOT NULL DEFAULT 0,
    "convertedAt" DATETIME,
    "signedUpAt" DATETIME,
    "expiresAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Referral_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "retainerId" TEXT,
    "clientId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "amountUsd" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "dueDate" DATETIME NOT NULL,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_retainerId_fkey" FOREIGN KEY ("retainerId") REFERENCES "Retainer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentInsight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'insight',
    "relevanceScore" REAL NOT NULL DEFAULT 0.8,
    "metadata" TEXT,
    "appliedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AgentReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "actions" TEXT NOT NULL,
    "metrics" TEXT NOT NULL,
    "insightRefs" TEXT NOT NULL,
    "nextActions" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CommunicationLogEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" TEXT,
    "durationMs" INTEGER,
    "correlationId" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ProspectSequence_prospectId_idx" ON "ProspectSequence"("prospectId");

-- CreateIndex
CREATE INDEX "ProspectSequence_sequenceId_idx" ON "ProspectSequence"("sequenceId");

-- CreateIndex
CREATE INDEX "ProspectActivity_prospectId_idx" ON "ProspectActivity"("prospectId");

-- CreateIndex
CREATE INDEX "ProspectActivity_createdAt_idx" ON "ProspectActivity"("createdAt");

-- CreateIndex
CREATE INDEX "CallRecording_organizationId_idx" ON "CallRecording"("organizationId");

-- CreateIndex
CREATE INDEX "CallRecording_prospectId_idx" ON "CallRecording"("prospectId");

-- CreateIndex
CREATE INDEX "CallRecording_createdAt_idx" ON "CallRecording"("createdAt");

-- CreateIndex
CREATE INDEX "BattleCard_organizationId_idx" ON "BattleCard"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_userId_key" ON "Partner"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_referralCode_key" ON "Partner"("referralCode");

-- CreateIndex
CREATE INDEX "Partner_referralCode_idx" ON "Partner"("referralCode");

-- CreateIndex
CREATE INDEX "Partner_status_idx" ON "Partner"("status");

-- CreateIndex
CREATE INDEX "Referral_referralCode_idx" ON "Referral"("referralCode");

-- CreateIndex
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- CreateIndex
CREATE INDEX "Referral_partnerId_idx" ON "Referral"("partnerId");

-- CreateIndex
CREATE INDEX "Referral_referredUserId_idx" ON "Referral"("referredUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_retainerId_idx" ON "Invoice"("retainerId");

-- CreateIndex
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "AgentInsight_agentType_idx" ON "AgentInsight"("agentType");

-- CreateIndex
CREATE INDEX "AgentInsight_category_idx" ON "AgentInsight"("category");

-- CreateIndex
CREATE INDEX "AgentInsight_createdAt_idx" ON "AgentInsight"("createdAt");

-- CreateIndex
CREATE INDEX "AgentReport_agentType_idx" ON "AgentReport"("agentType");

-- CreateIndex
CREATE INDEX "AgentReport_createdAt_idx" ON "AgentReport"("createdAt");

-- CreateIndex
CREATE INDEX "CommunicationLogEntry_entryType_idx" ON "CommunicationLogEntry"("entryType");

-- CreateIndex
CREATE INDEX "CommunicationLogEntry_source_idx" ON "CommunicationLogEntry"("source");

-- CreateIndex
CREATE INDEX "CommunicationLogEntry_timestamp_idx" ON "CommunicationLogEntry"("timestamp");

-- CreateIndex
CREATE INDEX "CommunicationLogEntry_correlationId_idx" ON "CommunicationLogEntry"("correlationId");
