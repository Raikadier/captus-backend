-- Migration to fix userAchievements table schema
-- This script adds an id column as primary key and makes (id_User, achievementId) unique
-- IMPORTANT: Execute each step one at a time and verify success before proceeding

-- Step 1: Add an id column (will be the new primary key)
ALTER TABLE public."userAchievements" 
ADD COLUMN IF NOT EXISTS id SERIAL;

-- Step 2: Drop the existing primary key constraint
ALTER TABLE public."userAchievements" 
DROP CONSTRAINT IF EXISTS "userAchievements_pkey";

-- Step 3: Set the id column as the new primary key
ALTER TABLE public."userAchievements" 
ADD CONSTRAINT "userAchievements_pkey" PRIMARY KEY (id);

-- Step 4: Add a unique constraint on (id_User, achievementId) to prevent duplicate achievements per user
ALTER TABLE public."userAchievements" 
ADD CONSTRAINT "userAchievements_user_achievement_unique" UNIQUE ("id_User", "achievementId");

-- Step 5: Create an index on id_User for better query performance
CREATE INDEX IF NOT EXISTS "idx_userAchievements_id_User" ON public."userAchievements"("id_User");

-- Step 6: Create an index on achievementId for better query performance
CREATE INDEX IF NOT EXISTS "idx_userAchievements_achievementId" ON public."userAchievements"("achievementId");

