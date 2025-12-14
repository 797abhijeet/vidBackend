declare module "fluent-ffmpeg" {
  import { Readable, Writable } from "stream";

  interface FfprobeData {
    streams: Array<{
      codec_type: string;
      codec_name: string;
      width?: number;
      height?: number;
      duration?: string;
      bit_rate?: string;
    }>;
    format: {
      filename: string;
      nb_streams: number;
      format_name: string;
      format_long_name: string;
      duration: string;
      size: string;
      bit_rate: string;
    };
    chapters: any[];
  }

  interface ProgressInfo {
    frames: number;
    currentFps: number;
    currentKbps: number;
    targetSize: number;
    timemark: string;
    percent?: number;
  }

  interface FfmpegCommand {
    // Core methods
    setFfmpegPath(path: string): this;
    setFfprobePath(path: string): this;
    setDuration(time: number | string): this;
    seekInput(time: number | string): this;
    
    // Input/Output
    input(input: string | Readable): this;
    output(output: string | Writable, options?: any[]): this;
    save(path: string): this;
    pipe(stream?: Writable, options?: { end?: boolean }): Writable;
    mergeToFile(filename: string, options?: any[]): this;
    
    // Audio options
    audioCodec(codec: string): this;
    audioBitrate(bitrate: string | number): this;
    audioChannels(channels: number): this;
    audioFrequency(freq: number): this;
    audioQuality(quality: number): this;
    noAudio(): this;
    
    // Video options
    videoCodec(codec: string): this;
    videoBitrate(bitrate: string | number): this;
    size(size: string): this;
    aspect(aspect: string | number): this;
    fps(fps: number): this;
    frames(count: number): this;
    noVideo(): this;
    
    // Format & Filters
    format(format: string): this;
    addInputOption(option: string): this;
    addOutputOption(option: string): this;
    outputOptions(options: string | string[]): this;
    complexFilter(filter: string | string[], map?: string | string[]): this;
    
    // Event handlers
    on(event: "start", callback: (commandLine: string) => void): this;
    on(event: "codecData", callback: (data: any) => void): this;
    on(event: "progress", callback: (progress: ProgressInfo) => void): this;
    on(event: "stderr", callback: (stderrLine: string) => void): this;
    on(event: "stdout", callback: (stdoutLine: string) => void): this;
    on(event: "error", callback: (err: Error, stdout: string, stderr: string) => void): this;
    on(event: "end", callback: () => void): this;
    on(event: string, callback: (...args: any[]) => void): this;
    
    // Kill/Run
    kill(signal?: string): void;
    run(): this;
  }

  interface Ffmpeg {
    // Constructor
    (input?: string | Readable): FfmpegCommand;
    
    // Static methods
    setFfmpegPath(path: string): void;
    setFfprobePath(path: string): void;
    
    // FFprobe
    ffprobe(path: string, callback: (err: Error | null, data: FfprobeData) => void): void;
    ffprobe(path: string): Promise<FfprobeData>;
    
    // Available formats/codecs
    availableFormats(callback: (err: Error | null, formats: any) => void): void;
    availableCodecs(callback: (err: Error | null, codecs: any) => void): void;
    availableEncoders(callback: (err: Error | null, encoders: any) => void): void;
    availableFilters(callback: (err: Error | null, filters: any) => void): void;
  }

  const ffmpeg: Ffmpeg;
  export default ffmpeg;
}