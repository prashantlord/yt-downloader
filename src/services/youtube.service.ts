import { runProcess } from "../utils/process.js";
import type { VideoInfo, VideoFormat } from "../types/video.js";

interface YtDlpFormat {
  format_id: string;
  ext: string;
  width?: number;
  height?: number;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
  filesize_approx?: number;
  format_note?: string;
  abr?: number;
}

interface YtDlpInfo {
  id: string;
  title: string;
  duration?: number;
  thumbnail?: string;
  formats: YtDlpFormat[];
}

export class YoutubeService {
  // Fetch Youtube video info by asking yt-dlp for its full JSON metadata
  async getInfo(url: string): Promise<VideoInfo> {
    const result = await runProcess("yt-dlp", ["-J", url]);

    if (result.code !== 0) {
      throw new Error(result.stderr);
    }

    const data: YtDlpInfo = JSON.parse(result.stdout);

    // Map the raw yt-dlp fields into the app's own VideoFormat type
    return {
      id: data.id,
      title: data.title,
      duration: data.duration,
      thumbnail: data.thumbnail,
      formats: data.formats.map((format) => ({
        formatId: format.format_id,
        extension: format.ext,
        width: format.width,
        height: format.height,
        fps: format.fps,
        videoCodec: format.vcodec,
        audioCodec: format.acodec,
        filesize: format.filesize,
        filesizeApproximate: format.filesize_approx,
        formatNote: format.format_note,
        abr: format.abr,
      })),
    };
  }

  // Group formats by resolution (height) and pick one with a known size per quality
  getVideoFormats(formats: VideoFormat[]): VideoFormat[] {
    // Collect every video-only format grouped by its height
    const byHeight = new Map<number, VideoFormat[]>();

    for (const format of formats) {
      if (format.height && format.videoCodec && format.videoCodec !== "none") {
        const list = byHeight.get(format.height) || [];
        list.push(format);
        byHeight.set(format.height, list);
      }
    }

    // Prefer the format that has a file size so sizes can be shown in the menu
    const videoFormats: VideoFormat[] = [];
    for (const group of byHeight.values()) {
      const withSize = group.filter(
        (format) => format.filesize || format.filesizeApproximate,
      );
      videoFormats.push((withSize[0] || group[0]) as VideoFormat);
    }

    return videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0));
  }

  // Estimate the output mp3 size from the video duration at the re-encode bitrate
  getMp3FileSize(info: VideoInfo): number | undefined {
    if (info.duration) {
      const mp3Bitrate = 256_000;
      return Math.round((info.duration * mp3Bitrate) / 8);
    }
    return this.getBestAudioFileSize(info);
  }

  // Find the best audio-only format and return its file size
  getBestAudioFileSize(info: VideoInfo): number | undefined {
    // Keep only formats that carry audio but no video stream
    const audioFormats = info.formats.filter(
      (format) =>
        format.audioCodec &&
        format.audioCodec !== "none" &&
        (!format.videoCodec || format.videoCodec === "none"),
    );

    // Prefer the exact size, then the approximate size, then a bitrate estimate
    const withFilesize = audioFormats
      .filter((format) => format.filesize)
      .sort((a, b) => (b.filesize || 0) - (a.filesize || 0));
    if (withFilesize[0]?.filesize) return withFilesize[0].filesize;

    const withApproximate = audioFormats
      .filter((format) => format.filesizeApproximate)
      .sort(
        (a, b) => (b.filesizeApproximate || 0) - (a.filesizeApproximate || 0),
      );
    if (withApproximate[0]?.filesizeApproximate) {
      return withApproximate[0].filesizeApproximate;
    }

    // Fall back to size = duration * bitrate when no size is reported
    const withAbr = audioFormats
      .filter((format) => format.abr)
      .sort((a, b) => (b.abr || 0) - (a.abr || 0));
    if (withAbr[0]?.abr && info.duration) {
      return Math.round((info.duration * withAbr[0].abr * 1000) / 8);
    }

    return undefined;
  }

  // Estimate the final mp4 size as the chosen video stream plus the best audio
  getCombinedFileSize(
    info: VideoInfo,
    format: VideoFormat,
  ): number | undefined {
    const videoBytes = format.filesize ?? format.filesizeApproximate;
    if (videoBytes == null) return undefined;
    const audioBytes = this.getBestAudioFileSize(info);
    return audioBytes == null ? videoBytes : videoBytes + audioBytes;
  }

  // Ask yt-dlp for the exact expected size of the requested download without downloading
  async getRequestedFileSize(
    url: string,
    formatSelector: string,
  ): Promise<number | undefined> {
    // Simulate the download (-s) and print the reported sizes separated by a pipe
    const result = await runProcess("yt-dlp", [
      "-s",
      "-f",
      formatSelector,
      "--print",
      "%(filesize)s|%(filesize_approx)s",
      "--no-warnings",
      url,
    ]);

    if (result.code !== 0) return undefined;

    // filesize may be "NA", so use the first value that parses as a positive number
    for (const part of result.stdout.trim().split("|")) {
      const parsed = parseFloat(part);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }

    return undefined;
  }

  // Convert a format height into a human friendly quality label
  getQualityLabel(format: VideoFormat): string {
    const height = format.height || 0;
    if (height >= 2160) return "4k";
    if (height >= 1440) return "2k";
    if (height >= 1080) return "1080p";
    if (height >= 720) return "720p";
    if (height >= 480) return "480p";
    if (height >= 360) return "360p";
    if (height >= 240) return "240p";
    if (height >= 144) return "144p";
    return `${height}p`;
  }
}
