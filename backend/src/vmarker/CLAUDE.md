# src/vmarker/
> L2 | 父级: backend/CLAUDE.md

vmarker 核心模块。

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                        通用模块                              │
├──────────────┬──────────────┬──────────────┬───────────────┤
│  models.py   │  parser.py   │  themes.py   │ ai_client.py  │
│  数据模型    │  SRT解析     │  配色方案    │  AI调用       │
├──────────────┴──────────────┴──────────────┴───────────────┤
│  video_encoder.py  │  video_probe.py  │  video_composer.py │
│  视频编码工具      │  视频元数据探测   │  视频合成工具      │
├────────────────────┴──────────────────┴────────────────────┤
│  asr.py            │  temp_manager.py                      │
│  ASR 语音识别       │  临时文件管理                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        功能模块                              │
├─────────────────────────────────────────────────────────────┤
│  chapter_bar.py     - 章节进度条 ✅                          │
│  progress_bar.py    - 播放进度条 ✅                          │
│  shownotes.py       - 视频大纲 ✅                            │
│  subtitle.py        - 字幕润色 ✅                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        入口模块                              │
├─────────────────────────────────────────────────────────────┤
│  cli.py             - CLI 入口 (acb / vmarker / vmk)        │
│  api/               - HTTP API (FastAPI)                    │
└─────────────────────────────────────────────────────────────┘
```

## 成员清单

### 通用模块
- `models.py`: 数据模型 (Subtitle, Chapter, VideoConfig, ColorScheme...)
- `parser.py`: SRT 解析器，支持多编码
- `themes.py`: 6 套内置配色方案
- `ai_client.py`: AI API 客户端，兼容 OpenAI 格式
- `video_encoder.py`: 视频编码器，FFmpeg 封装，支持 MP4 (H.264) / MOV (PNG 透明)
- `video_probe.py`: 视频元数据探测 (FFprobe)，获取时长/分辨率/帧率等
- `video_composer.py`: 视频合成工具 (FFmpeg vstack)，将 Bar 合成到原视频
- `asr.py`: ASR 语音识别，支持 OpenAI Whisper API
- `temp_manager.py`: 临时文件管理，基于 session_id 的生命周期管理
- `youtube_downloader.py`: YouTube 音频下载，使用 yt-dlp 仅下载音轨（备选方案）
- `youtube_transcript.py`: YouTube 字幕获取，直接从 YouTube 获取现有字幕（推荐，无需登录）

### 功能模块
- `chapter_bar.py`: 章节进度条完整流程 (提取→验证→生成)
- `progress_bar.py`: 简单进度条视频生成 (无章节分段)
- `shownotes.py`: AI 生成视频大纲 (摘要+带时间戳大纲)
- `subtitle.py`: AI 字幕润色 (空耳修正，时间戳不变)

### 入口模块
- `cli.py`: CLI 入口，双入口设计 (acb 专用 / vmarker 通用)
- `api/`: FastAPI 应用，路由按功能组织

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
