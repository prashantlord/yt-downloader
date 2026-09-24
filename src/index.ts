#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { YoutubeService } from "./services/youtube.service.js";
import { DownloadService } from "./services/download.service.js";
import { promptUser, confirmDownload } from "./utils/process.js";
import { formatFileSize } from "./utils/format.js";

const args = process.argv.slice(2);

// Read and return the package version from package.json
function getVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(readFileSync(join(here, "../package.json"), "utf8"));
  return pkg.version;
}

// Print the CLI usage instructions
function printUsage(): void {
  console.log("usage: youtube <mp3|mp4> <url>");
  console.log("       youtube --version");
  console.log("");
  console.log("commands:");
  console.log("  mp3 <url>    download audio as mp3");
  console.log("  mp4 <url>    download video as mp4 with format selection");
  console.log("options:");
  console.log("  -v, --version   print version");
}

// Entry point that validates args, fetches video info, and runs the chosen download
async function main(): Promise<void> {
  // Print Version. Calls method getVersion()
  if (args.includes("--version") || args.includes("-v")) {
    console.log(`youtube ${getVersion()}`);
    return;
  }

  // Checks for invalid usage of command
  if (args.length < 2) {
    printUsage();
    process.exit(1);
  }

  // Stores the first argument mp3 or mp4
  const command = args[0].toLowerCase();
  // Stores the youtube video URL
  const url = args[1];

  // Checks for mp3 or mp4
  if (command !== "mp3" && command !== "mp4") {
    console.error(`unknown command: ${command}`);
    printUsage();
    process.exit(1);
  }

  // Checks if the youtube url is valid.
  if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
    console.error("invalid youtube url");
    process.exit(1);
  }

  // Object of YoutubeService
  const youtubeService = new YoutubeService();
  // Object of DownloadService
  const downloadService = new DownloadService();

  try {
    console.log("fetching video info...");

    const info = await youtubeService.getInfo(url);
    console.log(`title: ${info.title}`);

    if (command === "mp3") {
      // Show an estimated mp3 size, then ask for confirmation
      const mp3Size = youtubeService.getMp3FileSize(info);
      const sizeLabel =
        mp3Size !== undefined
          ? formatFileSize(mp3Size).toLowerCase()
          : "unknown";

      const confirmed = await confirmDownload(
        `do you want to download?\nsize: ${sizeLabel} | file: ${info.title}.mp3\n(y/n): `,
      );
      if (!confirmed) {
        console.log("download cancelled");
        return;
      }

      console.log("downloading audio as mp3...");

      const filePath = await downloadService.downloadMp3(url);

      console.log("");
      console.log(`completed: downloaded at ${filePath}`);
    } else {
      const videoFormats = youtubeService.getVideoFormats(info.formats);

      console.log("");
      console.log("available formats:");

      videoFormats.forEach((format, index) => {
        const bytes = youtubeService.getCombinedFileSize(info, format);
        const sizeText =
          bytes != null ? ` (${formatFileSize(bytes).toLowerCase()})` : "";
        console.log(
          `${index + 1}. ${youtubeService.getQualityLabel(format)}${sizeText}`,
        );
      });

      console.log("");
      const answer = await promptUser("option: ");
      const option = parseInt(answer, 10);

      if (isNaN(option) || option < 1 || option > videoFormats.length) {
        console.error("invalid option");
        process.exit(1);
      }

      const selectedFormat = videoFormats[option - 1];
      // Ask yt-dlp for the exact size, falling back to our combined estimate
      const requestedSize = await youtubeService.getRequestedFileSize(
        url,
        `${selectedFormat.formatId}+bestaudio/best`,
      );
      const selectedBytes =
        requestedSize ??
        youtubeService.getCombinedFileSize(info, selectedFormat);
      const selectedSizeLabel =
        selectedBytes != null
          ? formatFileSize(selectedBytes).toLowerCase()
          : "unknown";

      const confirmed = await confirmDownload(
        `do you want to download?\nsize: ${selectedSizeLabel} | file: ${info.title}.mp4\n(y/n): `,
      );
      if (!confirmed) {
        console.log("download cancelled");
        return;
      }

      console.log("");
      console.log(
        `downloading ${youtubeService.getQualityLabel(selectedFormat)}...`,
      );

      const filePath = await downloadService.downloadMp4(
        url,
        selectedFormat.formatId,
      );

      console.log("");
      console.log(`completed: downloaded at ${filePath}`);
    }
  } catch (error) {
    console.error("download failed.");

    if (error instanceof Error) {
      console.error(error.message);
    }

    process.exit(1);
  }
}

main();
