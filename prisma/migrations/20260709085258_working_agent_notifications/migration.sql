ALTER TABLE "Agent"
  ADD COLUMN IF NOT EXISTS "notificationEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "notificationWhatsapp" TEXT,
  ADD COLUMN IF NOT EXISTS "notificationEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "notificationChannel" TEXT NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS "notificationTrigger" TEXT NOT NULL DEFAULT 'orders';
