export interface VideoFormat {
  formatId: string;
  extension: string;
  width?: number;
  height?: number;
  fps?: number;
  videoCodec?: string;
  audioCodec?: string;
  filesize?: number;
  filesizeApproximate?: number;
  formatNote?: string;
  abr?: number;
}

export interface VideoInfo {
  id: string;
  title: string;
  duration?: number;
  thumbnail?: string;
  formats: VideoFormat[];
}
