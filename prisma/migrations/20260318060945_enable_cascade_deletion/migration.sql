/*
  Warnings:
  - Changed the type of `userId` on the `Notification` table. 
*/

-- 1. Transform the column type from String to UUID with a proper cast
ALTER TABLE "Notification" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;

-- 2. Add the new Foreign Key with the CASCADE rule
-- (We don't need to CREATE INDEX because they already exist from your previous schema)
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;