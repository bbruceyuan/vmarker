# vmarker - 视频标记工具集
uv + Python 3.13 + FastAPI | Next.js 16 + TailwindCSS v4

> **Make video structure visible.**

## 目录结构

```
vmarker/
├── backend/         - Python 后端，CLI + HTTP API
├── web/             - Next.js 前端
├── task/            - 项目文档和任务
└── .claude/         - Claude 配置
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端运行时 | uv + Python >=3.13 |
| 后端框架 | FastAPI + Uvicorn |
| 视频处理 | FFmpeg + Pillow |
| CLI | Typer + Rich |
| 前端框架 | Next.js 16 (Turbopack) |
| 样式 | TailwindCSS v4 |
| 动效 | framer-motion |
| 图标 | lucide-react, react-icons |

## 核心功能

| 功能 | 说明 | 状态 |
|------|------|------|
| Video Process | 视频上传 → ASR → 合成 | ✅ |
| Chapter Bar | 章节进度条视频 | ✅ |
| Progress Bar | 简单进度条视频 | ✅ |
| Show Notes | AI 视频大纲生成 | ✅ |
| Subtitle | AI 字幕润色 | ✅ |

## 命令入口

**CLI 两种使用方式**（详见 [backend/CLI_USAGE.md](backend/CLI_USAGE.md)）：

```bash
# 方式 1: 开发模式（backend/ 目录内）
uv run acb input.srt
uv run vmarker chapter input.srt
uv run vmarker themes

# 方式 2: 安装模式（先运行 uv pip install -e .）
acb input.srt
vmarker chapter input.srt
vmarker themes

# API 服务
cd backend && uv run uvicorn vmarker.api:app --reload

# Web 开发服务器
cd web && npm run dev
```

## 开发规范

- Python 代码遵循 Ruff 格式化
- 每文件不超过 800 行
- 函数不超过 20 行
- 三层缩进即设计错误

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
