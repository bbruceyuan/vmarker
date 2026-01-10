# api/
> L2 | 父级: src/vmarker/CLAUDE.md

FastAPI HTTP API 模块。

## 目录结构

```
api/
├── main.py           - FastAPI 应用入口，CORS，路由挂载，启动清理
├── routes/           - 路由模块
│   ├── chapter_bar.py  - Chapter Bar API 路由
│   ├── progress_bar.py - Progress Bar API 路由
│   ├── shownotes.py    - Show Notes API 路由
│   ├── subtitle.py     - Subtitle API 路由
│   ├── video.py        - Video 上传处理 API 路由
│   └── youtube.py      - YouTube 章节生成 API 路由
└── __init__.py       - 导出 app 实例
```

## 成员清单

| 文件 | 职责 |
|------|------|
| `main.py` | 创建 FastAPI app，配置 CORS，挂载路由，加载 .env，启动时清理过期会话 |
| `routes/chapter_bar.py` | Chapter Bar 所有 API 端点 |
| `routes/progress_bar.py` | Progress Bar 所有 API 端点 |
| `routes/shownotes.py` | Show Notes 所有 API 端点 |
| `routes/subtitle.py` | Subtitle 所有 API 端点 |
| `routes/video.py` | 视频上传、ASR 转录、视频合成 API 端点 |
| `routes/youtube.py` | YouTube 章节生成 API 端点 |

## API 端点

### Chapter Bar (`/api/v1/chapter-bar`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/themes` | 获取配色方案列表 |
| POST | `/parse` | 解析 SRT 文件 |
| POST | `/chapters/auto` | 自动分段（支持 interval 参数） |
| POST | `/chapters/ai` | AI 智能分段（服务端配置） |
| POST | `/validate` | 验证章节配置 |
| POST | `/generate` | 生成视频（mp4/mov，支持 custom_colors） |

### Progress Bar (`/api/v1/progress-bar`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/colors` | 获取可用配色列表 |
| POST | `/generate` | 生成进度条视频 |

### Show Notes (`/api/v1/shownotes`)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/generate` | 从 SRT 生成视频大纲 |

### Subtitle (`/api/v1/subtitle`)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/polish` | 润色字幕（返回详情+SRT内容） |
| POST | `/download` | 润色并直接下载 SRT 文件 |

### Video (`/api/v1/video`)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/upload` | 上传视频，返回 session_id + 视频信息 |
| POST | `/asr/{session_id}` | ASR 转录，返回字幕数 + SRT 内容 |
| GET | `/srt/{session_id}` | 获取会话中的 SRT 内容 |
| POST | `/compose/{session_id}` | 合成 Bar 到原视频 |
| DELETE | `/{session_id}` | 清理会话 |
| POST | `/cleanup` | 清理过期会话（管理接口） |

### YouTube (`/api/v1/youtube`)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/from-url` | 从 YouTube 链接生成章节（字幕提取 → AI 分段，推荐，无需登录） |
| POST | `/from-url-download` | 从 YouTube 链接生成章节（下载 → ASR → AI 分段，备选方案） |

## 环境配置

AI 功能需要在 `backend/.env` 配置：

```env
# AI 聊天配置
API_KEY=your-api-key
API_BASE=https://api.openai.com/v1
API_MODEL=gpt-4o-mini

# ASR 配置（可选，不设置则使用 API_BASE）
ASR_API_BASE=https://api.openai.com/v1
ASR_MODEL=whisper-1
```

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
