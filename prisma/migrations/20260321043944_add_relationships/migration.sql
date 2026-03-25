/*
  Warnings:

  - You are about to drop the column `familyRole` on the `GroupMember` table. All the data in the column will be lost.
  - You are about to drop the column `familyRole` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GroupMember" DROP COLUMN "familyRole";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "familyRole";

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Relationship_groupId_fromUserId_toUserId_key" ON "Relationship"("groupId", "fromUserId", "toUserId");

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FamilyGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
