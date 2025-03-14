-- CreateTable
CREATE TABLE "Post" (
    "id" SERIAL NOT NULL,
    "postId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "permalink" TEXT NOT NULL,
    "postType" TEXT NOT NULL DEFAULT 'post',
    "responsibleEmail" TEXT,
    "lastReminder" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postDate" TIMESTAMP(3),
    "postModified" TIMESTAMP(3),
    "postStatus" TEXT NOT NULL DEFAULT 'publish',

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Post_postId_key" ON "Post"("postId");
