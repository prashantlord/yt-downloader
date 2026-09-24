#!/usr/bin/env bash
# One-command setup for the youtube-dl CLI.
#
# Assumes node, npm, yt-dlp and ffmpeg are already installed on the system.
# Running this script will:
#
# 1. Install the project's npm dependencies (`npm install`).
# 2. Build the project (`npm run build`) into dist/.
# 3. Pack the project into a tarball and install the `youtube` command
#    GLOBALLY from that tarball as a real COPY.
#    Because a copy is installed (not a symlink), you can delete the clone
#    afterwards and the command keeps working. Re-running the script simply
#    overwrites the previous global install, so it also works as an update.
# 4. Verify the install with `youtube --version`.
set -euo pipefail

RED='\033[31m'; YELLOW='\033[33m'; GREEN='\033[32m'; NC='\033[0m'

step()  { printf "${GREEN}==>${NC} %s\n" "$1"; }
warn()  { printf "${YELLOW}[warn]${NC} %s\n" "$1"; }
err()   { printf "${RED}[error]${NC} %s\n" "$1"; }

# --- 1. install npm dependencies (skip scripts; we build explicitly next) ---
step "installing project dependencies..."
npm install --ignore-scripts

# --- 2. build the project into dist/ ---------------------------------------
step "building the project..."
npm run build

# --- 3. install globally as a real copy via a packed tarball ----------------
# `npm install -g .` would create a symlink to this folder, breaking the
# command if the clone is deleted. Packing first guarantees a real copy and
# cleanly replaces any previously installed version of this package.
step "installing the 'youtube' command globally (as a copy)..."
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

npm pack --pack-destination "$tmp_dir" --ignore-scripts >/dev/null

if ! npm install -g "$tmp_dir"/*.tgz 2>/tmp/youtube_setup_err.log; then
  err "global install failed. the npm global prefix may not be writable."
  printf "       set a user-owned npm prefix and re-run:\n"
  printf "         npm config set prefix \"\$HOME/.local\"\n"
  printf "         export PATH=\"\$HOME/.local/bin:\$PATH\"\n"
  printf "         ./setup.sh\n"
  printf "       or (last resort) run the whole script with sudo:\n"
  printf "         sudo ./setup.sh\n"
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
printf "the clone can be deleted now; 'youtube' is installed as a real copy and\n"
printf "keeps working.\n"
printf "to update after pulling new code, just re-run ./setup.sh.\n"
printf "downloads go to:\n"
printf "  - \$DOWNLOAD_DIR if set,\n"
printf "  - your system Downloads folder otherwise.\n"
