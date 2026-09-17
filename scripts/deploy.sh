#!/bin/bash
# Safe deploy script — runs ALL tests before shipping to production.
# Usage: ./scripts/deploy.sh
# 
# This is the ONLY way to deploy. Never run `vercel --prod` directly.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "═══════════════════════════════════════════"
echo "  MEGA Proposals — Safe Deploy Pipeline"
echo "═══════════════════════════════════════════"
echo ""

# Step 1: TypeScript build
echo -e "${YELLOW}[1/5] TypeScript build...${NC}"
npm run build > /dev/null 2>&1
echo -e "${GREEN}  ✅ Build passed${NC}"

# Step 2: Deploy to Vercel preview (NOT production yet)
echo -e "${YELLOW}[2/5] Deploying to preview...${NC}"
PREVIEW_URL=$(vercel 2>&1 | grep -o 'https://[^ ]*vercel.app' | head -1)
if [ -z "$PREVIEW_URL" ]; then
  echo -e "${RED}  ❌ Preview deploy failed${NC}"
  exit 1
fi
echo -e "${GREEN}  ✅ Preview: ${PREVIEW_URL}${NC}"

# Wait for preview to be ready
echo "  Waiting 10s for preview to stabilize..."
sleep 10

# Step 3: Run the 44-test API suite against the PREVIEW
echo -e "${YELLOW}[3/5] Running API test suite (44 tests) against preview...${NC}"
BASE_URL="$PREVIEW_URL" node scripts/test-proposal-generator.js 2>&1 | tail -5
RESULT=${PIPESTATUS[0]}
if [ $RESULT -ne 0 ]; then
  echo -e "${RED}  ❌ API tests FAILED — aborting deploy${NC}"
  echo -e "${RED}  The preview is live at ${PREVIEW_URL} for debugging.${NC}"
  exit 1
fi
echo -e "${GREEN}  ✅ API tests passed${NC}"

# Step 4: Run E2E browser test against the PREVIEW
echo -e "${YELLOW}[4/5] Running E2E browser test against preview...${NC}"
BASE_URL="$PREVIEW_URL" node scripts/e2e-deploy-test.js 2>&1
RESULT=$?
if [ $RESULT -ne 0 ]; then
  echo -e "${RED}  ❌ E2E browser test FAILED — aborting deploy${NC}"
  echo -e "${RED}  The preview is live at ${PREVIEW_URL} for debugging.${NC}"
  exit 1
fi
echo -e "${GREEN}  ✅ E2E browser test passed${NC}"

# Step 5: Promote preview to production
echo -e "${YELLOW}[5/5] Promoting to production...${NC}"
vercel --prod 2>&1 | tail -2
echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ DEPLOYED TO PRODUCTION — ALL TESTS PASSED${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
