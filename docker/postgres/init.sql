-- PostgreSQL initialization script
-- This script runs when the database is first created

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums (will also be created by Prisma migrations, but good to have)
-- Note: Prisma migrations will handle actual schema creation

-- Log initialization
SELECT 'PostgreSQL database initialized for Media Center' AS message;
