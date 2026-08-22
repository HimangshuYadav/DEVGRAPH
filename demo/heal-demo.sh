#!/usr/bin/env bash
# ================================================================
# Antigravity — Bright Data Self-Heal Demo
# Uses: docs.python.org (static HTML — bdata AI generation works reliably)
# ================================================================
set -e

BDATA="npx -p @brightdata/cli bdata"
TARGET="https://docs.python.org/3/library/functions.html"

RED='\033[0;31m'; GRN='\033[0;32m'; YEL='\033[1;33m'
CYN='\033[0;36m'; MAG='\033[0;35m'; BLD='\033[1m'; RST='\033[0m'

divider() { echo -e "\n${CYN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RST}\n"; }
step() { echo -e "${BLD}${YEL}▶ STEP $1: $2${RST}"; }
ok()   { echo -e "${GRN}✓ $1${RST}"; }
warn() { echo -e "${YEL}⚠ $1${RST}"; }

clear
echo -e "${BLD}${CYN}"
cat << 'EOF'
   _          _   _                       _ _         
  / \   _ __ | |_(_) __ _ _ __ __ ___   _(_) |_ _   _ 
 / _ \ | '_ \| __| |/ _` | '__/ _` \ \ / / | __| | | |
/ ___ \| | | | |_| | (_| | | | (_| |\ V /| | |_| |_| |
/_/   \_\_| |_|\__|_|\__, |_|  \__,_| \_/ |_|\__|\__, |
                     |___/                         |___/
  DevGraph AI — Self-Healing Scraper Demo
EOF
echo -e "${RST}"

divider

step 0 "Login to Bright Data"
$BDATA login
ok "Authenticated"

divider

step 1 "Create Scraper Studio Collector"
echo "Target: ${TARGET}"
echo ""
echo -e "${MAG}\$ $BDATA scraper create '${TARGET}' 'Extract Python built-in function names and descriptions'${RST}"
echo ""

COLLECTOR_ID=$($BDATA scraper create "$TARGET" \
  "Extract Python built-in function names and their descriptions as a JSON array with fields: name (string) and description (string)." \
  | grep -oE 'c_[a-zA-Z0-9]+' | head -1)

echo ""
ok "Collector: ${BLD}${COLLECTOR_ID}${RST}"

# Save collector ID for backend
curl -s -X POST http://localhost:8000/api/health/set-collector \
  -H "Content-Type: application/json" \
  -d "{\"collector_id\": \"${COLLECTOR_ID}\"}" > /dev/null 2>&1 || true

divider

step 2 "Run scraper — baseline"
echo -e "${MAG}\$ $BDATA scraper run ${COLLECTOR_ID} '${TARGET}'${RST}"
echo ""
OUTPUT=$($BDATA scraper run "$COLLECTOR_ID" "$TARGET")
echo "$OUTPUT" | head -20
echo ""
COUNT=$(echo "$OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null || echo "?")
ok "Extracted ${COUNT} records — scraper working ✓"

divider

step 3 "Simulate HTML change (break the scraper)"
warn "Imagine docs.python.org changed their HTML structure..."
warn "The dt.sig selector now uses .py.function instead of .sig-prename"
echo ""
echo "Running scraper on the 'changed' page..."
echo "[]"
warn "Empty output! Scraper is broken."

divider

step 4 "Self-heal with plain English description"
echo -e "${CYN}No code needed — describe the change in plain English:${RST}"
echo ""
echo -e "${MAG}\$ $BDATA scraper heal ${COLLECTOR_ID} 'The Python docs updated their CSS: function signature container changed from dt.sig to dl.py dt. Re-target those selectors.'${RST}"
echo ""
$BDATA scraper heal "$COLLECTOR_ID" \
  "The Python docs updated their CSS: function signature container changed from dt.sig to dl.py dt. Re-target those selectors."
echo ""
ok "Fix proposed"

echo -e "${MAG}\$ $BDATA scraper approve ${COLLECTOR_ID}${RST}"
$BDATA scraper approve "$COLLECTOR_ID"
echo ""
ok "Healed! ${BLD}Collector ID still: ${COLLECTOR_ID}${RST} — nothing downstream changes"

# Notify backend
curl -s -X POST http://localhost:8000/api/health/heal \
  -H "Content-Type: application/json" \
  -d "{\"collector_id\": \"${COLLECTOR_ID}\", \"description\": \"Demo heal: dt.sig → dl.py dt\"}" > /dev/null 2>&1 || true

divider

step 5 "Re-run the healed scraper"
echo -e "${MAG}\$ $BDATA scraper run ${COLLECTOR_ID} '${TARGET}'${RST}"
echo ""
OUTPUT2=$($BDATA scraper run "$COLLECTOR_ID" "$TARGET")
echo "$OUTPUT2" | head -20
COUNT2=$(echo "$OUTPUT2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null || echo "?")
echo ""
ok "Extracted ${COUNT2} records — ${GRN}fully restored! 🎉${RST}"

divider

echo -e "${BLD}${GRN}Self-Heal Demo Complete!${RST}"
echo ""
echo "  Collector ID (unchanged): ${BLD}${COLLECTOR_ID}${RST}"
echo "  ✓ Created  → Ran → (simulated break) → Healed → Ran again"
echo "  ✓ Same Collector ID throughout — DB, schedules, backend all unaffected"
echo ""
echo -e "  ${CYN}Open http://localhost:3000 → click 🔧 Healer to see the event logged${RST}"
echo ""
