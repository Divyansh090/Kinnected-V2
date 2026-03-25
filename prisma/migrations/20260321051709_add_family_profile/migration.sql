/*
  Warnings:

  - You are about to drop the `Relationship` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Relationship" DROP CONSTRAINT "Relationship_fromUserId_fkey";

-- DropForeignKey
ALTER TABLE "Relationship" DROP CONSTRAINT "Relationship_groupId_fkey";

-- DropForeignKey
ALTER TABLE "Relationship" DROP CONSTRAINT "Relationship_toUserId_fkey";

-- DropTable
DROP TABLE "Relationship";

-- CreateTable
CREATE TABLE "FamilyProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "fatherName" TEXT,
    "fatherId" TEXT,
    "motherName" TEXT,
    "motherId" TEXT,
    "spouseName" TEXT,
    "spouseId" TEXT,
    "childrenNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "childrenIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "siblingNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "siblingIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "grandfatherPaternalName" TEXT,
    "grandfatherPaternalId" TEXT,
    "grandmotherPaternalName" TEXT,
    "grandmotherPaternalId" TEXT,
    "grandfatherMaternalName" TEXT,
    "grandfatherMaternalId" TEXT,
    "grandmotherMaternalName" TEXT,
    "grandmotherMaternalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FamilyProfile_userId_groupId_key" ON "FamilyProfile"("userId", "groupId");

-- AddForeignKey
ALTER TABLE "FamilyProfile" ADD CONSTRAINT "FamilyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyProfile" ADD CONSTRAINT "FamilyProfile_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FamilyGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
