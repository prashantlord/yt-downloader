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

These are **not** installed by `setup.sh` — it only configures the project
itself (dependencies, build, global install). Install them once manually if
they are missing.

## Quick start (recommended)

```sh
git clone <repo-url> youtube-dl
cd youtube-dl
./setup.sh
```

That single command will:

1. `npm install` the project's dependencies.
2. Build the project (`npm run build`) into `dist/`.
3. Pack the project into a tarball and install the **`youtube`** command
   globally **as a real copy** (never a symlink to this folder).
4. Verify with `youtube --version`.

You can then **delete the clone** — the `youtube` command keeps working
because it was installed as a copy, not as a link to this folder.

### Updating to a newer version

Pull the latest code into the clone, then simply re-run setup:

```sh
git pull
./setup.sh
```

`npm install -g` from the fresh tarball cleanly overwrites the previously
installed copy, so the whole thing behaves as an update whether or not the
old clone is still around.

### Verify it works

```sh
youtube --version   # e.g. "youtube 1.1.0"
youtube mp3 <url>   # download audio
youtube mp4 <url>   # download video (with quality picker)
```

## Manual setup (equivalent to setup.sh)

If you prefer to run the steps yourself instead of the script:

```sh
npm install --ignore-scripts  # install deps without the auto-(re)build
npm run build                 # build dist/
npm pack --pack-destination /tmp
npm install -g /tmp/youtube-video-downloader-*.tgz   # install as a real copy
```

Installing the packed tarball (rather than `npm install -g .`) matters: it
creates a copy of the project in the npm global prefix instead of a symlink, so
the `youtube` command keeps working after you delete the clone.

### If the global install fails with `EACCES` / permissions

Your npm global prefix (e.g. `/usr/lib/node_modules`) isn't writable by your
user. Either:

```sh
npm pack --pack-destination /tmp
sudo npm install -g /tmp/youtube-video-downloader-*.tgz
```

or configure a user-owned prefix once:

```sh
npm config set prefix "$HOME/.local"
export PATH="$HOME/.local/bin:$PATH"   # add to your shell rc
npm install -g /tmp/youtube-video-downloader-*.tgz
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

For `mp4`, you'll be shown a numbered list of available qualities (with their
estimated sizes) — type the number and press enter, then confirm with `y/n`:

```
fetching video info...
title: Rick Astley - Never Gonna Give You Up

available formats:
1. 1080p (80.5mb)
2. 720p (28.5mb)
3. 480p (16.7mb)
4. 360p (11.3mb)
5. 240p (7.4mb)
6. 144p (5.3mb)

option: 2
do you want to download?
size: 28.6mb | file: Rick Astley - Never Gonna Give You Up.mp4
(y/n): y
```

For `mp3`, you only get the size confirmation (no format picker). Both flows
cancel cleanly when you answer `n`.

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
  the global install step failed (see the permissions section above).
- **`EACCES` / EPERM during `npm install -g`** — see the permissions section.
- **Spawn errors at download time** (`ENOENT`, "yt-dlp exited with code ...") —
  `yt-dlp` or `ffmpeg` is missing from your `PATH`. Install them manually (see
  the prerequisites table above); `setup.sh` does not install them.