-- Platform-wide settings (key/value), e.g. the theme super admins pick.
-- Additive only: a new table, nothing existing is renamed or dropped. No
-- rows are inserted; the app treats a missing "theme" row as "classic".

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);
