-- Add admin_level column to users table
-- Allows users to have admin privileges independent of their primary role
-- 0=none, 1=basic admin, 2=full admin, 3+=super admin

ALTER TABLE `users` ADD `admin_level` integer DEFAULT 0;
