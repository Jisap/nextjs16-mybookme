-- Backfill prueba 30 días para negocios creados antes de Fase 8
UPDATE "Business" SET "trialEndsAt" = "createdAt" + INTERVAL '30 days' WHERE "trialEndsAt" IS NULL;
