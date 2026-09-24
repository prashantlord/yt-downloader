import { spawn } from "node:child_process";
import * as path from "node:path";
import * as CliProgress from "cli-progress";
import { getDownloadDir } from "../utils/paths.js";

export class DownloadService {
  private progressBar: CliProgress.SingleBar;
  private downloadDir: string;

  // Set up the progress bar and resolve the download directory
  constructor() {
    this.progressBar = new CliProgress.SingleBar(
      {
        format: "downloading: {bar} | {percentage}% | {speed}",
        barCompleteChar: "\u2588",
        barIncompleteChar: "\u2591",
        hideCursor: true,
      },
      CliProgress.Presets.shades_classic
    );
    this.downloadDir = getDownloadDir();
  }

  // Download the video's best audio and extract/convert it to mp3
  async downloadMp3(url: string): Promise<string> {
    const args = [
      "-x",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "0",
      "-o",
      path.join(this.downloadDir, "%(title)s.%(ext)s"),
      "--newline",
      url,
    ];

    return this.executeDownload(args);
  }

  // Download the chosen video quality merged with the best audio as mp4
  async downloadMp4(url: string, formatId: string): Promise<string> {
    const args = [
      "-f",
      `${formatId}+bestaudio/best`,
      "--merge-output-format",
      "mp4",
      "-o",
      path.join(this.downloadDir, "%(title)s.%(ext)s"),
      "--newline",
      url,
    ];

    return this.executeDownload(args);
  }

  // Spawn yt-dlp, render a progress bar, and resolve the downloaded file path
  private executeDownload(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn("yt-dlp", args);

      let lastPercent = -1;

      // Parse yt-dlp's "[download] 12.3%" and "at 5.2MiB/s" lines from stdout
      child.stdout.on("data", (data: Buffer) => {
        const output = data.toString();
        const percentMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
        const speedMatch = output.match(/at\s+([\d.]+\S+\/s)/);

        if (percentMatch) {
          const percent = parseFloat(percentMatch[1]);
          const speed = speedMatch ? speedMatch[1] : "";
          if (lastPercent === -1) {
            this.progressBar.start(100, 0, { speed });
          }
          this.progressBar.update(Math.min(Math.round(percent), 100), { speed });
          lastPercent = percent;
        }
      });

      // Same parsing for stderr, where yt-dlp may write progress lines
      child.stderr.on("data", (data: Buffer) => {
        const output = data.toString();
        const percentMatch = output.match(/(\d+\.?\d*)%/);
        const speedMatch = output.match(/at\s+([\d.]+\S+\/s)/);

        if (percentMatch) {
          const percent = parseFloat(percentMatch[1]);
          const speed = speedMatch ? speedMatch[1] : "";
          if (lastPercent === -1) {
            this.progressBar.start(100, 0, { speed });
          }
          this.progressBar.update(Math.min(Math.round(percent), 100), { speed });
          lastPercent = percent;
        }
      });

      child.on("error", (error) => {
        if (lastPercent !== -1) {
          this.progressBar.stop();
        }
        reject(error);
      });

      child.on("close", (code) => {
        if (lastPercent !== -1) {
          this.progressBar.stop();
        }

        if (code !== 0) {
          reject(new Error(`yt-dlp exited with code ${code}`));
          return;
        }

        // The file exists after a successful download, so resolve its path
        this.getDownloadedFilePath(args).then((filePath) => {
          resolve(filePath);
        }).catch(() => {
          resolve(this.downloadDir);
        });
      });
    });
  }

  // Resolve the final output path by asking yt-dlp for the video title
  private async getDownloadedFilePath(args: string[]): Promise<string> {
    const url = args[args.length - 1];
    const infoArgs = ["-J", url];
    const infoResult = await new Promise<{ stdout: string; code: number }>((resolve) => {
      const child = spawn("yt-dlp", infoArgs);
      let stdout = "";
      child.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });
      child.on("close", (code) => {
        resolve({ stdout, code: code ?? -1 });
      });
    });

    if (infoResult.code === 0) {
      const info = JSON.parse(infoResult.stdout);
      const title = info.title || "video";
      // The extension depends on whether the audio was extracted (mp3) or merged (mp4)
      const ext = args.includes("--audio-format") ? "mp3" : "mp4";
      return path.join(this.downloadDir, `${title}.${ext}`);
    }

    return this.downloadDir;
  }
}
