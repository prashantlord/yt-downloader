#!/usr/bin/env bash
# One-command setup for the youtube-dl CLI.
#
# 1. Checks Node.js, npm, yt-dlp, ffmpeg are present (and prints install
#    commands for any that are missing).
# 2. `npm install` (also builds dist/ automatically via the "prepare" script).
# 3. Installs the `youtube` command GLOBALLY as a COPY (`npm install -g .`)
#    so that you can delete the clone afterwards and the command keeps working.
# 4. Verifies the install with `youtube --version`.
set -euo pipefail

RED='\033[31m'; YELLOW='\033[33m'; GREEN='\033[32m'; NC='\033[0m'

step()  { printf "${GREEN}==>${NC} %s\n" "$1"; }
warn()  { printf "${YELLOW}[warn]${NC} %s\n" "$1"; }
err()   { printf "${RED}[error]${NC} %s\n" "$1"; }

check_cmd() {
  local name="$1" hint="$2"
  if command -v "$name" >/dev/null 2>&1; then
    printf "${GREEN}[ok]${NC} %s\n" "$name"
    return 0
  fi
  err "$name not found."
  printf "     install it:\n"
  printf "       %s\n" "$hint"
  return 1
}

# --- 1. prerequisites -------------------------------------------------------
step "checking prerequisites..."

npm_ok=0
if command -v node >/dev/null 2>&1; then
  node_major=$(node -p 'process.versions.node.split(".")[0]')
  if [ "$node_major" -ge 18 ] 2>/dev/null; then
    printf "${GREEN}[ok]${NC} node %s\n" "$(node --version)"
    npm_ok=1
  else
    err "node >= 18 required (found $(node --version))."
    printf "       install: nvm install node   (latest)\n"
  fi
else
  err "node not found."
  printf "       install: nvm install node   or   https://nodejs.org\n"
fi

missing=0
check_cmd yt-dlp   "pip install -U yt-dlp"                  || missing=1
check_cmd ffmpeg   "sudo apt install -y ffmpeg   # or brew install ffmpeg" || missing=1

if [ "$npm_ok" -ne 1 ] || [ "$missing" -ne 0 ]; then
  printf "\n${RED}missing prerequisites above. fix them and re-run ./setup.sh.${NC}\n"
  exit 1
fi

# --- 2. dependencies + build ------------------------------------------------
step "installing dependencies and building (npm install)..."
npm install

# --- 3. install globally as a copy ------------------------------------------
step "installing the 'youtube' command globally (as a copy)..."
if ! npm install -g . 2>/tmp/youtube_setup_err.log; then
  err "global install failed. the npm global prefix may not be writable."
  printf "       try: sudo npm install -g .\n"
  printf "       or set a user prefix:\n"
  printf "         npm config set prefix \"\$HOME/.local\"\n"
  printf "         export PATH=\"\$HOME/.local/bin:\$PATH\"\n"
  tail -n 5 /tmp/youtube_setup_err.log
  exit 1
fi

# --- 4. verify --------------------------------------------------------------
step "verifying..."
youtube --version

printf "\n${GREEN}done. usage:${NC}\n"
printf "  youtube mp3 <url>    download audio as mp3\n"
printf "  youtube mp4 <url>    download video as mp4 (quality picker)\n"
printf "  youtube --version    print version\n"
printf "\n"
printf "the clone can be deleted now; the 'youtube' command keeps working.\n"
printf "downloads go to:\n"
printf "  - \$DOWNLOAD_DIR if set,\n"
printf "  - your system Downloads folder otherwise.\n"
