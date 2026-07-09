CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "service" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "balanceAfter" DECIMAL(14,2) NOT NULL,
    "description" TEXT NOT NULL,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutoTopUpSettings" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "thresholdAmount" DECIMAL(14,2) NOT NULL DEFAULT 20,
    "topUpAmount" DECIMAL(14,2) NOT NULL DEFAULT 100,
    "monthlyLimitAmount" DECIMAL(14,2),
    "monthlyChargesLimit" INTEGER,
    "monthKey" TEXT,
    "thisMonthAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "thisMonthCharges" INTEGER NOT NULL DEFAULT 0,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AutoTopUpSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");
CREATE UNIQUE INDEX "WalletTransaction_referenceId_key" ON "WalletTransaction"("referenceId");
CREATE UNIQUE INDEX "AutoTopUpSettings_walletId_key" ON "AutoTopUpSettings"("walletId");
CREATE INDEX "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt");

ALTER TABLE "Wallet"
ADD CONSTRAINT "Wallet_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WalletTransaction"
ADD CONSTRAINT "WalletTransaction_walletId_fkey"
FOREIGN KEY ("walletId") REFERENCES "Wallet"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutoTopUpSettings"
ADD CONSTRAINT "AutoTopUpSettings_walletId_fkey"
FOREIGN KEY ("walletId") REFERENCES "Wallet"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
