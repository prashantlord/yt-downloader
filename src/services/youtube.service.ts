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
  async getInfo(url: string): Promise<VideoInfo> {
    const result = await runProcess("yt-dlp", ["-J", url]);

    if (result.code !== 0) {
      throw new Error(result.stderr);
    }

    const data: YtDlpInfo = JSON.parse(result.stdout);

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
      })),
    };
  }

  getVideoFormats(formats: VideoFormat[]): VideoFormat[] {
    const videoFormats: VideoFormat[] = [];
    const seenHeights = new Set<number>();

    for (const format of formats) {
      if (format.height && format.videoCodec && format.videoCodec !== "none") {
        const height = format.height;
        if (!seenHeights.has(height)) {
          seenHeights.add(height);
          videoFormats.push(format);
        }
      }
    }

    return videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0));
  }

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
