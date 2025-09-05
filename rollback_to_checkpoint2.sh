#!/bin/bash

echo "🔄 Rolling back to checkpoint2 (Updated with Rate Limiting & Fixed Calculations)..."
echo "📁 Restoring from checkpoints/checkpoint2/"

# Stop any running processes
echo "🛑 Stopping any running processes..."
pkill -f "next dev" 2>/dev/null

# Clear caches
echo "🧹 Clearing caches..."
rm -rf .next node_modules/.cache

# Restore from checkpoint2
echo "📋 Restoring files from checkpoint2..."

# Restore main directories
cp -r checkpoints/checkpoint2/app ./
cp -r checkpoints/checkpoint2/components ./
cp -r checkpoints/checkpoint2/contexts ./
cp -r checkpoints/checkpoint2/hooks ./
cp -r checkpoints/checkpoint2/lib ./
cp -r checkpoints/checkpoint2/types ./

# Restore config files
cp checkpoints/checkpoint2/next.config.js ./
cp checkpoints/checkpoint2/package.json ./
cp checkpoints/checkpoint2/tailwind.config.ts ./
cp checkpoints/checkpoint2/tsconfig.json ./

echo "✅ Rollback to checkpoint2 completed!"
echo "🚀 Starting development server..."

# Start the server
npm run dev -- --port 3001
