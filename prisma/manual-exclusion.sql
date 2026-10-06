-- Manual: aplicar DESPUÉS de `prisma migrate dev` (Prisma no genera EXCLUDE).
-- Ver docs/ADR-002-concurrencia.md

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Solo PENDING/CONFIRMED bloquean. blockedUntil = endAt + buffer.
ALTER TABLE "Appointment" DROP CONSTRAINT IF EXISTS no_overlap_per_staff;

ALTER TABLE "Appointment" ADD CONSTRAINT no_overlap_per_staff
EXCLUDE USING gist (
  "staffId" WITH =,
  tstzrange("startAt", "blockedUntil") WITH &&
) WHERE (status IN ('PENDING', 'CONFIRMED'));
