# youtube-dl

A lightweight **YouTube video & audio downloader CLI** written in TypeScript,
packaged as the global `youtube` command.

It is a thin wrapper around [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) with an
interactive progress bar and video-quality selection.

## Features

- `youtube mp3 <url>` — download the audio track as an mp3.
- `youtube mp4 <url>` — download the video as mp4 with an interactive
  quality/format picker.
- Interactive download progress bar (percentage + speed).
- Portable downloads location (see [Where do files go](#where-do-files-go)).
- One-command setup that also uninstalls cleanly.

## Prerequisites

| Tool | Why | Install |
|------|-----|---------|
| **Node.js ≥ 18** | runtime | `nvm install node` (or from [nodejs.org](https://nodejs.org)) |
| **yt-dlp** | actual downloading | `pip install -U yt-dlp` |
| **ffmpeg** | mp3 extraction & mp4 merging | `sudo apt install ffmpeg` |

`setup.sh` checks for all of these and prints the exact install command for any
that are missing.

## Quick start (recommended)

```sh
git clone <repo-url> youtube-dl
cd youtube-dl
./setup.sh
```

That single command will:

1. Check that Node.js, yt-dlp and ffmpeg are present.
2. `npm install` (also builds the TypeScript automatically via the `prepare` script).
3. Install the **`youtube`** command globally as a *copy* (`npm install -g .`).

You can then **delete the clone** — the `youtube` command keeps working, because
it was installed as a copy into your npm global prefix, not as a symlink to this
folder.

### Verify it works

```sh
youtube --version   # e.g. "youtube 1.1.0"
youtube mp3 <url>   # download audio
youtube mp4 <url>   # download video (with quality picker)
```

## Manual setup (equivalent to setup.sh)

If you prefer to run the steps yourself instead of the script:

```sh
npm install          # installs deps + builds dist/ via "prepare"
npm run build        # optional: guaranteed fresh dist build
npm install -g .     # registers the global "youtube" command (as a copy)
```

### If the global install fails with `EACCES` / permissions

Your npm global prefix (e.g. `/usr/lib/node_modules`) isn't writable by your
user. Either:

```sh
sudo npm install -g .
```

or configure a user-owned prefix once:

```sh
npm config set prefix "$HOME/.local"
export PATH="$HOME/.local/bin:$PATH"   # add to your shell rc
npm install -g .
```

## Usage

```
usage: youtube <mp3|mp4> <url>
       youtube --version

commands:
  mp3 <url>    download audio as mp3
  mp4 <url>    download video as mp4 with format selection

options:
  -v, --version   print version
```

### Examples

```sh
youtube mp3 "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
youtube mp4 "https://youtu.be/dQw4w9WgXcQ"
```

For `mp4`, you'll be shown a numbered list of available qualities — type the
number and press enter:

```
fetching video info...
title: Rick Astley - Never Gonna Give You Up

available formats:
1. 1080p
2. 720p
3. 480p
4. 360p
5. 240p
6. 144p

option: 2
```

## Where do files go?

The download directory is resolved in this order:

1. The **`DOWNLOAD_DIR`** environment variable, if set (created if missing).
   ```sh
   DOWNLOAD_DIR=/mnt/nas/videos youtube mp4 <url>
   ```
2. On **WSL / Windows**: the real Windows `Downloads` folder
   (e.g. `/mnt/c/Users/yourname/Downloads`), if reachable.
3. On **Linux**: your XDG downloads folder, else `~/Downloads`.
4. On **macOS**: `~/Downloads`.

You can also set `DOWNLOAD_DIR` permanently in your shell rc to stop the
auto-detection entirely.

## Development

```sh
npm run dev "mp3" <url>   # run from source with tsx
npm run build             # tsc -> dist/
npm start -- mp3 <url>    # build output
```

## Uninstall

```sh
npm uninstall -g youtube-video-downloader   # removes the "youtube" command
rm -rf <the-clone-folder>                   # optional — repo can be deleted anyway
```

Because setup installs a copy, uninstalling and deleting the clone leaves your
system exactly as it was before.

## Troubleshooting

- **`youtube: command not found`** — after a successful setup, either your npm
  global `bin` directory isn't on `PATH` (`npm bin -g` shows where it is), or
  setup failed at the `npm install -g .` step (see the permissions section above).
- **`EACCES` / EPERM during `npm install -g`** — see the permissions section.
- **Spawn errors at download time** (`ENOENT`, "yt-dlp exited with code ...") —
  `yt-dlp` or `ffmpeg` is missing from your `PATH`. Re-run `./setup.sh` — it
  checks both and prints install commands.
