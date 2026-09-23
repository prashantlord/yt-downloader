#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { YoutubeService } from "./services/youtube.service.js";
import { DownloadService } from "./services/download.service.js";
import { promptUser } from "./utils/process.js";

const args = process.argv.slice(2);

function getVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(readFileSync(join(here, "../package.json"), "utf8"));
  return pkg.version;
}

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

async function main(): Promise<void> {
  if (args.includes("--version") || args.includes("-v")) {
    console.log(`youtube ${getVersion()}`);
    return;
  }

  if (args.length < 2) {
    printUsage();
    process.exit(1);
  }

  const command = args[0].toLowerCase();
  const url = args[1];

  if (command !== "mp3" && command !== "mp4") {
    console.error(`unknown command: ${command}`);
    printUsage();
    process.exit(1);
  }

  if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
    console.error("invalid youtube url");
    process.exit(1);
  }

  const youtubeService = new YoutubeService();
  const downloadService = new DownloadService();

  try {
    console.log("fetching video info...");

    const info = await youtubeService.getInfo(url);
    console.log(`title: ${info.title}`);

    if (command === "mp3") {
      console.log("downloading audio as mp3...");

      const filePath = await downloadService.downloadMp3(url);

      console.log("");
      console.log(`completed: downloaded at ${filePath}`);
    } else {
      const videoFormats = youtubeService.getVideoFormats(info.formats);

      console.log("");
      console.log("available formats:");

      videoFormats.forEach((format, index) => {
        console.log(`${index + 1}. ${youtubeService.getQualityLabel(format)}`);
      });

      console.log("");
      const answer = await promptUser("option: ");
      const option = parseInt(answer, 10);

      if (isNaN(option) || option < 1 || option > videoFormats.length) {
        console.error("invalid option");
        process.exit(1);
      }

      const selectedFormat = videoFormats[option - 1];
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
