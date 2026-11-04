-- Fix existing ContentRecord doneDate and thumbnailDoneDate shifted by +5:30 timezone bug
UPDATE "ContentRecord"
SET "doneDate" = "doneDate" - INTERVAL '5 hours 30 minutes'
WHERE "doneDate" IS NOT NULL AND "doneDate" > "createdAt" + INTERVAL '4 hours';

UPDATE "ContentRecord"
SET "thumbnailDoneDate" = "thumbnailDoneDate" - INTERVAL '5 hours 30 minutes'
WHERE "thumbnailDoneDate" IS NOT NULL AND "thumbnailDoneDate" > "createdAt" + INTERVAL '4 hours';

