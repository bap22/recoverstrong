#!/bin/bash
# Deployment script for RecoverStrong to GitHub Pages

echo "🚀 Deploying RecoverStrong to GitHub Pages"

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install git first."
    exit 1
fi

# Initialize git repo if not already
if [ ! -d .git ]; then
    echo "📦 Initializing git repository..."
    git init
    git branch -M main
fi

# Add all files
echo "➕ Adding files..."
git add .

# Commit
echo "💾 Committing changes..."
git commit -m "Deploy RecoverStrong v1.0.0" || echo "No changes to commit"

# Add remote if not exists
if ! git remote | grep -q origin; then
    echo "🔗 Please add your GitHub repository as remote:"
    echo "   git remote add origin https://github.com/bap22/recoverstrong.git"
    echo "   Then run this script again."
    exit 1
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push -u origin main

echo ""
echo "✅ Deployment complete!"
echo "📱 Visit your app at: https://bap22.github.io/recoverstrong/"
echo ""
echo "Next steps:"
echo "1. Go to https://github.com/bap22/recoverstrong/settings/pages"
echo "2. Ensure 'Source' is set to 'Deploy from a branch'"
echo "3. Select 'main' branch and '/ (root)' folder"
echo "4. Click Save"
echo ""
echo "Your PWA will be live in a few minutes!"