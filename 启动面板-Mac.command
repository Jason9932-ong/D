#!/bin/bash
# Double-click launcher for macOS.
cd "$(dirname "$0")" || exit 1

echo
echo "  Volatility Panel"
echo "  ----------------"
echo

# First run (or a fresh clone) has no dependencies installed yet.
if [ ! -d node_modules ]; then
  echo "  First run - installing dependencies, this takes about 15 seconds..."
  echo
  if ! npm install; then
    echo
    echo "  Install failed. Is Node.js installed?  https://nodejs.org"
    echo
    read -r -p "  Press Enter to close..."
    exit 1
  fi
fi

# Open the browser once the dev server has had time to come up.
( sleep 5 && open "http://localhost:5173/" ) &

echo "  Starting... the browser will open automatically."
echo "  Keep this window OPEN while you use the panel."
echo "  Press Ctrl+C or close this window to stop."
echo

npm run dev

echo
echo "  Server stopped."
read -r -p "  Press Enter to close..."
