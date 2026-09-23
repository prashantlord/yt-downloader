import { spawn } from "node:child_process";
import * as path from "node:path";
import * as CliProgress from "cli-progress";

const DOWNLOAD_DIR = "/mnt/c/Users/Prashant/Downloads";

export class DownloadService {
  private progressBar: CliProgress.SingleBar;

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
  }

  async downloadMp3(url: string): Promise<string> {
    const args = [
      "-x",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "0",
      "-o",
      path.join(DOWNLOAD_DIR, "%(title)s.%(ext)s"),
      "--newline",
      url,
    ];

    return this.executeDownload(args);
  }

  async downloadMp4(url: string, formatId: string): Promise<string> {
    const args = [
      "-f",
      `${formatId}+bestaudio/best`,
      "--merge-output-format",
      "mp4",
      "-o",
      path.join(DOWNLOAD_DIR, "%(title)s.%(ext)s"),
      "--newline",
      url,
    ];

    return this.executeDownload(args);
  }

  private executeDownload(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn("yt-dlp", args);

      let lastPercent = -1;

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

        this.getDownloadedFilePath(args).then((filePath) => {
          resolve(filePath);
        }).catch(() => {
          resolve(DOWNLOAD_DIR);
        });
      });
    });
  }

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
      const ext = args.includes("--audio-format") ? "mp3" : "mp4";
      return path.join(DOWNLOAD_DIR, `${title}.${ext}`);
    }

    return DOWNLOAD_DIR;
  }
}
