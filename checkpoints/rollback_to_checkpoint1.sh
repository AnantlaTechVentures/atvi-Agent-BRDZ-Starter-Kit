#!/bin/bash

echo "🔄 Rolling back to checkpoint1..."
echo "⚠️  This will overwrite current files with checkpoint1 versions"

# Remove current critical files
rm -rf app components contexts hooks lib types
rm -f next.config.js package.json tailwind.config.ts tsconfig.json

# Restore from checkpoint1
cp -r checkpoint1/* ./

echo "✅ Rollback to checkpoint1 completed!"
echo "🔄 Restarting development server..."

# Kill any running Next.js processes
pkill -f "next dev" 2>/dev/null

# Clear build cache
rm -rf .next node_modules/.cache

echo "🚀 Ready to restart with: npm run dev -- --port 3001"

