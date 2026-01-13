/**
 * [INPUT]: 依赖 @/lib/supabase
 * [OUTPUT]: 对外提供 API 客户端和类型定义
 * [POS]: lib 模块的 API 层，封装后端调用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { supabase } from "./supabase";

// ============================================================
// 配置
// ============================================================
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ============================================================
// 类型定义
// ============================================================

/** 章节数据 */
export interface Chapter {
  title: string;
  start_time: number;
  end_time: number;
}

/** 章节列表 */
export interface ChapterList {
  chapters: Chapter[];
  duration: number;
}

/** 验证问题 */
export interface ValidationIssue {
  code: string;
  message: string;
  blocking: boolean;
  chapter_index?: number;
}

/** 验证结果 */
export interface ChapterValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  chapters: Chapter[];
}

/** 配色方案 */
export interface Theme {
  name: string;        // 主题 ID（如 "tech-blue"）
  display_name: string; // 显示名称（如 "科技蓝"）
  played_bg: string;
  unplayed_bg: string;
}

/** 自定义配色 */
export interface CustomColors {
  played_bg: string;
  unplayed_bg: string;
}

/** 视频配置 */
export interface VideoConfig {
  width: number;
  height: number;
}

/** SRT 解析结果 */
export interface ParseResult {
  subtitle_count: number;
  duration: number;
}

// ============================================================
// API 客户端
// ============================================================

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, text || response.statusText);
  }
  return response.json();
}

/** 带认证的 fetch，自动注入 Bearer Token */
async function authFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  // 获取当前 session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = {
    ...options?.headers,
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

// ============================================================
// Chapter Bar API
// ============================================================

export const chapterBarApi = {
  /** 获取配色方案列表 */
  async getThemes(): Promise<Theme[]> {
    const res = await fetch(`${API_BASE}/api/v1/chapter-bar/themes`);
    return handleResponse<Theme[]>(res);
  },

  /** 解析 SRT 文件 */
  async parse(file: File): Promise<ParseResult> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/api/v1/chapter-bar/parse`, {
      method: "POST",
      body: formData,
    });
    return handleResponse<ParseResult>(res);
  },

  /** 自动分段提取章节 */
  async extractAuto(file: File, interval: number = 60): Promise<ChapterList> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("interval", interval.toString());

    const res = await fetch(`${API_BASE}/api/v1/chapter-bar/chapters/auto`, {
      method: "POST",
      body: formData,
    });
    return handleResponse<ChapterList>(res);
  },

  /** AI 智能分段提取章节（服务端配置 API Key） */
  async extractAI(file: File): Promise<ChapterList> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/api/v1/chapter-bar/chapters/ai`, {
      method: "POST",
      body: formData,
    });
    return handleResponse<ChapterList>(res);
  },

  /** 验证章节配置 */
  async validate(
    chapters: Chapter[],
    duration: number
  ): Promise<ChapterValidationResult> {
    // FastAPI: chapters 是 body, duration 是 query param
    const res = await fetch(
      `${API_BASE}/api/v1/chapter-bar/validate?duration=${duration}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chapters),
      }
    );
    return handleResponse<ChapterValidationResult>(res);
  },

  /** 生成视频 - 返回 Blob */
  async generate(
    chapters: Chapter[],
    duration: number,
    config: VideoConfig,
    theme: string,
    format: "mp4" | "mov" = "mp4",
    customColors?: CustomColors | null
  ): Promise<Blob> {
    const res = await fetch(`${API_BASE}/api/v1/chapter-bar/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chapters,
        duration,
        width: config.width,
        height: config.height,
        theme,
        format,
        custom_colors: customColors || undefined,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new ApiError(res.status, text || res.statusText);
    }

    return res.blob();
  },
};

// ============================================================
// 工具函数
// ============================================================

/** 格式化时间 (秒 -> MM:SS) */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/** 解析时间 (MM:SS 或纯秒数 -> 秒) */
export function parseTime(input: string): number | null {
  const trimmed = input.trim();

  // 纯数字
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return parseFloat(trimmed);
  }

  // MM:SS 格式
  const match = trimmed.match(/^(\d+):(\d+)$/);
  if (match) {
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }

  return null;
}

/** 下载 Blob 文件 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
// Show Notes 类型定义
// ============================================================

/** 大纲条目 */
export interface OutlineItem {
  timestamp: number;
  title: string;
}

/** Show Notes 结果 */
export interface ShowNotesResult {
  summary: string;
  outline: OutlineItem[];
}

// ============================================================
// Show Notes API
// ============================================================

export const showNotesApi = {
  /** 生成视频大纲 */
  async generate(file: File): Promise<ShowNotesResult> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/api/v1/shownotes/generate`, {
      method: "POST",
      body: formData,
    });
    return handleResponse<ShowNotesResult>(res);
  },
};

// ============================================================
// 字幕润色类型定义
// ============================================================

/** 润色后的字幕条目 */
export interface PolishedSubtitleItem {
  index: number;
  start_time: number;
  end_time: number;
  original_text: string;
  polished_text: string;
  changed: boolean;
}

/** 润色结果 */
export interface PolishResult {
  subtitles: PolishedSubtitleItem[];
  changes_count: number;
  srt_content: string;
}

// ============================================================
// 字幕润色 API
// ============================================================

export const subtitleApi = {
  /** 润色字幕 */
  async polish(file: File): Promise<PolishResult> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/api/v1/subtitle/polish`, {
      method: "POST",
      body: formData,
    });
    return handleResponse<PolishResult>(res);
  },
};

// ============================================================
// Progress Bar 类型定义
// ============================================================

/** 颜色选项 */
export interface ProgressBarColor {
  name: string;
  display_name: string;
  played: string;
  unplayed: string;
}

/** Progress Bar 配置 */
export interface ProgressBarConfig {
  duration: number;
  width: number;
  height: number;
  played_color: string;
  unplayed_color: string;
  format: "mp4" | "mov";
}

// ============================================================
// Progress Bar API
// ============================================================

export const progressBarApi = {
  /** 获取可用配色列表 */
  async getColors(): Promise<ProgressBarColor[]> {
    const res = await fetch(`${API_BASE}/api/v1/progress-bar/colors`);
    return handleResponse<ProgressBarColor[]>(res);
  },

  /** 生成进度条视频 */
  async generate(config: ProgressBarConfig): Promise<Blob> {
    const res = await fetch(`${API_BASE}/api/v1/progress-bar/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new ApiError(res.status, text || res.statusText);
    }

    return res.blob();
  },
};

// ============================================================
// Video 类型定义
// ============================================================

/** 视频上传响应 */
export interface VideoUploadResult {
  session_id: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  file_size_mb: number;
}

/** ASR 结果 */
export interface ASRResult {
  session_id: string;
  subtitle_count: number;
  duration: number;
  srt_content: string;
}

/** 合成请求 */
export interface ComposeRequest {
  feature: "chapter-bar" | "progress-bar";
  position: "top" | "bottom";
  // Chapter Bar 专用
  chapters?: Chapter[];
  theme?: string;
  bar_width?: number;
  bar_height?: number;
  // Progress Bar 专用
  played_color?: string;
  unplayed_color?: string;
  progress_height?: number;
}

// ============================================================
// Video API
// ============================================================

export const videoApi = {
  /** 上传视频 */
  async upload(file: File): Promise<VideoUploadResult> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/api/v1/video/upload`, {
      method: "POST",
      body: formData,
    });
    return handleResponse<VideoUploadResult>(res);
  },

  /** ASR 转录 */
  async asr(sessionId: string): Promise<ASRResult> {
    const res = await fetch(`${API_BASE}/api/v1/video/asr/${sessionId}`, {
      method: "POST",
    });
    return handleResponse<ASRResult>(res);
  },

  /** 获取 SRT 内容 */
  async getSrt(sessionId: string): Promise<{ srt_content: string }> {
    const res = await fetch(`${API_BASE}/api/v1/video/srt/${sessionId}`);
    return handleResponse<{ srt_content: string }>(res);
  },

  /** 合成视频 */
  async compose(sessionId: string, request: ComposeRequest): Promise<Blob> {
    const res = await fetch(`${API_BASE}/api/v1/video/compose/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new ApiError(res.status, text || res.statusText);
    }

    return res.blob();
  },

  /** 清理会话 */
  async cleanup(sessionId: string): Promise<void> {
    await fetch(`${API_BASE}/api/v1/video/${sessionId}`, {
      method: "DELETE",
    });
  },
};

// ============================================================
// YouTube 类型定义
// ============================================================

/** YouTube 章节 */
export interface YouTubeChapter {
  title: string;
  start_time: number;
  end_time: number;
}

/** YouTube 章节生成结果 */
export interface YouTubeChaptersResult {
  video_title: string;
  duration: number;
  chapters: YouTubeChapter[];
  youtube_format: string;
}

// ============================================================
// YouTube API
// ============================================================

export const youtubeApi = {
  /** 从 YouTube URL 生成章节 */
  async generateFromUrl(url: string): Promise<YouTubeChaptersResult> {
    const res = await fetch(`${API_BASE}/api/v1/youtube/from-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    return handleResponse<YouTubeChaptersResult>(res);
  },
};

// ============================================================
// Auth 类型定义
// ============================================================

/** 用户信息 */
export interface AuthUser {
  id: string;
  email?: string;
  role: string;
  aud: string;
}

/** 认证检查响应 */
export interface AuthCheckResponse {
  authenticated: boolean;
  user?: AuthUser | null;
}

// ============================================================
// Auth API
// ============================================================

export const authApi = {
  /** 获取当前用户信息（需要认证） */
  async getMe(): Promise<AuthUser> {
    const res = await authFetch(`${API_BASE}/api/v1/auth/me`);
    return handleResponse<AuthUser>(res);
  },

  /** 检查认证状态（可选认证） */
  async check(): Promise<AuthCheckResponse> {
    const res = await authFetch(`${API_BASE}/api/v1/auth/check`);
    return handleResponse<AuthCheckResponse>(res);
  },
};
