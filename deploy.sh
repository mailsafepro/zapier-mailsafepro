#!/bin/bash

# MailSafePro Zapier Integration - Deployment Script
# This script automates the deployment process to GitHub and Zapier

set -e  # Exit on error

echo "🚀 MailSafePro Zapier Integration - Deployment"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Verify GitHub repo exists
echo -e "${BLUE}📋 Step 1: GitHub Repository Setup${NC}"
echo ""
echo "Please create a GitHub repository first:"
echo "1. Go to: https://github.com/new"
echo "2. Repository name: zapier-mailsafepro (or your choice)"
echo "3. DO NOT initialize with README/LICENSE"
echo "4. Create repository"
echo ""
read -p "Enter your GitHub repository URL (e.g., https://github.com/username/repo.git): " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo "❌ Repository URL is required"
    exit 1
fi

# Step 2: Configure git remote
echo -e "${BLUE}🔗 Step 2: Connecting to GitHub${NC}"
git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"
echo -e "${GREEN}✅ Remote configured${NC}"
echo ""

# Step 3: Push to GitHub
echo -e "${BLUE}📤 Step 3: Pushing to GitHub${NC}"
git branch -M main
git push -u origin main
echo -e "${GREEN}✅ Code pushed to GitHub${NC}"
echo ""

# Step 4: Zapier CLI check
echo -e "${BLUE}⚡ Step 4: Zapier CLI Setup${NC}"
if ! command -v zapier &> /dev/null; then
    echo -e "${YELLOW}⚠️  Zapier CLI not found. Installing...${NC}"
    npm install -g zapier-platform-cli
fi
echo -e "${GREEN}✅ Zapier CLI ready${NC}"
echo ""

# Step 5: Zapier login
echo -e "${BLUE}🔐 Step 5: Zapier Authentication${NC}"
echo "You'll be redirected to login to Zapier..."
zapier login
echo -e "${GREEN}✅ Logged in to Zapier${NC}"
echo ""

# Step 6: Validate integration
echo -e "${BLUE}✅ Step 6: Validating Integration${NC}"
zapier validate
echo -e "${GREEN}✅ Validation passed${NC}"
echo ""

# Step 7: Register/Push to Zapier
echo -e "${BLUE}📦 Step 7: Deploying to Zapier${NC}"
if zapier integrations 2>&1 | grep -q "MailSafePro"; then
    echo "Integration already registered. Pushing update..."
    zapier push
else
    echo "Registering new integration..."
    zapier register "MailSafePro Email Validation"
fi
echo -e "${GREEN}✅ Deployed to Zapier${NC}"
echo ""

# Step 8: Promote (optional)
echo -e "${BLUE}🎯 Step 8: Promotion Options${NC}"
echo "Choose promotion option:"
echo "1) Private (testing only - you and invited users)"
echo "2) Skip (promote later manually)"
read -p "Enter choice (1-2): " PROMOTE_CHOICE

case $PROMOTE_CHOICE in
    1)
        echo "Promoting to private..."
        zapier promote 1.0.0 --private
        echo -e "${GREEN}✅ Promoted to private${NC}"
        ;;
    *)
        echo "Skipping promotion. You can promote later with:"
        echo "  zapier promote 1.0.0 --private   (for testing)"
        echo "  zapier promote 1.0.0 --public    (for public release)"
        ;;
esac
echo ""

# Success!
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE!${NC}"
echo ""
echo "Next steps:"
echo "1. Check GitHub Actions: https://github.com/$(echo $REPO_URL | cut -d'/' -f4-5 | sed 's/.git$//')/actions"
echo "2. View your integration: https://zapier.com/app/developer"
echo "3. Create a test Zap: https://zapier.com/app/zaps"
echo ""
echo "Useful commands:"
echo "  zapier logs              - View integration logs"
echo "  zapier integrations      - List your integrations"
echo "  zapier invite EMAIL      - Invite beta testers"
echo ""
