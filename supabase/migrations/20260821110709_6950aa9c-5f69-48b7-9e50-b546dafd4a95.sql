-- Fix task_status enum to include new states
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'paused';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'blocked';
