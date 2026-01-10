<div align="center">

# 🎬 vmarker

**让视频结构可见化**

[![GitHub Stars](https://img.shields.io/github/stars/bbruceyuan/vmarker?style=social)](https://github.com/bbruceyuan/vmarker/stargazers)
[![Python 3.13+](https://img.shields.io/badge/python-3.13+-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green.svg)](https://fastapi.tiangolo.com/)

视频标记工具集 - 从 SRT 字幕自动生成透明章节进度条，提升长视频完播率

[快速开始](#-快速开始) · [功能特性](#-核心功能) · [在线演示](https://vmarker.app)

**[English](./readme/README_EN.md)** | 简体中文

</div>

---

## 📖 简介

vmarker 是一个开源的视频标记工具集，通过 **AI 智能分段**和**可视化进度条**，让观众一眼看清视频结构，显著提升长视频的完播率。

**核心特点**：
- 🎨 **透明通道输出** - RGBA 格式，可完美叠加到任意视频
- 🤖 **AI 智能分段** - 自动识别章节边界，无需手动标记
- ⚡ **快速生成** - 10-40 秒完成，传统手动制作需 30-60 分钟
- 🖥️ **Web + CLI 双模式** - 可视化界面 + 命令行工具
- 🔒 **本地处理** - 视频文件不上传云端，隐私优先

---

## 🎯 解决的问题

长视频（课程、直播、评测）完播率低的核心原因：
- **结构不清晰** - 观众不知道视频讲什么，容易中途离开
- **平台限制** - 原生章节功能只在播放器内有效
- **制作成本高** - 手动制作章节条需要 30-60 分钟

**vmarker 的解决方案**：
```
传统方式：30-60 分钟手动制作
           ↓
vmarker：30 秒命令 / 1 次点击
           ↓
        10-40 秒自动生成
           ↓
    专业级透明视频输出
```

---

## 🎬 效果展示

### 自动生成的章节进度条

```
┌────────────────────────────────────────────────────────────────┐
│ 00:00        02:30            05:45        10:20       14:00   │
│ 开场介绍      背景说明          核心内容      实战演示    总结回顾  │
└────────────────────────────────────────────────────────────────┘

章节列表：
00:00  开场介绍
02:30  背景说明
05:45  核心内容  ← 当前播放
10:20  实战演示
14:00  总结回顾

生成透明背景视频 (MOV)，可直接叠加到你的视频上
```

**特点**：
- 自动识别章节边界（AI 语义理解）
- 动态文字布局（自适应长度）
- 多套配色主题（10+ 预设）
- 透明通道输出（RGBA 格式）

---

## ✨ 核心功能

### 1. Chapter Bar - 章节进度条 ⭐

从 SRT 字幕自动生成带透明通道的章节进度条视频。

**使用方式**：
```bash
# CLI 命令（AI 智能分段）
acb input.srt

# 自动分段（每 60 秒一段，无需 AI）
acb input.srt --mode auto --interval 60

# Web 界面（可视化编辑）
cd web && npm run dev  # 访问 http://localhost:3000
```

---

### 2. Progress Bar - 播放进度条

生成简洁的播放进度条视频。

```bash
vmarker progress --duration 360 --color blue
```

---

### 3. Show Notes - AI 视频大纲

从字幕自动生成结构化大纲（摘要 + 时间轴）。

```bash
vmarker shownotes input.srt -o notes.md
```

**输出示例**：
```markdown
## 视频大纲

### 开场介绍 (00:00 - 02:30)
- 项目背景和动机
- 核心问题陈述

### 功能演示 (02:30 - 08:45)
- Chapter Bar 功能展示
- AI 智能分段效果
```

---

### 4. Subtitle - AI 字幕润色

修正 ASR 识别的"空耳"错误，提升可读性。

```bash
vmarker subtitle input.srt -o polished.srt
```

---

### 5. Video Process - 全流程处理

上传视频 → ASR 语音识别 → 生成章节条 → 合成到原视频。

**使用方式**：Web 界面完整流程

---

## 🛠️ 安装

### 前置要求

- **Python** >= 3.13
- **Node.js** >= 20
- **FFmpeg** (系统安装)

### 安装 FFmpeg

**macOS**:
```bash
brew install ffmpeg
```

**Ubuntu/Debian**:
```bash
sudo apt-get update && sudo apt-get install ffmpeg
```

**Windows**:
下载 https://www.gyan.dev/ffmpeg/builds/ 并添加到 PATH

### 克隆仓库

```bash
git clone https://github.com/bbruceyuan/vmarker.git
cd vmarker
```

---

## 🚀 快速开始

### 方式一：Web 界面（推荐）

#### 1. 启动后端

```bash
cd backend

# 安装依赖（使用 UV）
curl -LsSf https://astral.sh/uv/install.sh | sh
uv sync

# 配置 API Key（AI 功能需要）
cp .env.example .env
# 编辑 .env 填入 OpenAI API Key 或兼容服务

# 启动后端
uv run uvicorn vmarker.api:app --reload --port 8000
```

#### 2. 启动前端

```bash
cd web

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 **http://localhost:3000**

---

### 方式二：CLI 命令行

#### 开发模式（推荐）

在 `backend/` 目录内使用 `uv run` 前缀：

```bash
cd backend

# Chapter Bar 快捷命令
uv run acb input.srt
uv run acb input.srt --theme tech-blue

# 通用命令
uv run vmarker chapter input.srt
uv run vmarker progress --duration 360
uv run vmarker shownotes input.srt
uv run vmarker subtitle input.srt
uv run vmarker themes  # 列出配色方案
```

#### 安装模式（全局使用）

```bash
cd backend
uv pip install -e .

# 之后可在任何位置运行
acb input.srt
vmarker chapter input.srt --theme sunset-orange
```

**详细 CLI 文档**：[backend/CLI_USAGE.md](backend/CLI_USAGE.md)

---

## 💡 使用场景

### 知识课程视频

60 分钟教学视频，需要清晰的章节划分：

```bash
acb course.srt --mode ai
```

AI 自动识别知识模块边界，生成语义连贯的章节。

---

### 直播回放

2 小时直播，需要快速分段：

```bash
acb live.srt --mode auto --interval 600  # 每 10 分钟一段
```

无需 AI，快速按时间分段。

---

### 产品评测

10 分钟评测，需要精确控制章节：

使用 Web 界面可视化编辑章节时间和标题。

---

### 会议录像

自动生成会议大纲 + 章节条：

```bash
vmarker shownotes meeting.srt -o meeting_notes.md
acb meeting.srt --mode ai
vmarker subtitle meeting.srt -o meeting_polished.srt
```

---

## 📦 在视频编辑软件中使用

### Adobe Premiere Pro

1. 导入原视频到时间线
2. 导入生成的 `chapter_bar.mov`
3. 将章节条拖入最上层视频轨道
4. 调整位置（通常放在顶部）
5. 导出最终视频

### 剪映 (CapCut)

1. 添加原视频到主轨道
2. 新增画中画轨道
3. 导入章节条视频
4. 调整位置和大小
5. 导出视频

### DaVinci Resolve

1. 导入两个视频文件
2. 将章节条放在最上层轨道
3. 调整合成模式和位置
4. 渲染输出

---

## 📁 项目结构

```
vmarker/
├── backend/          # Python 后端 (FastAPI + CLI)
│   ├── src/vmarker/  # 核心模块
│   └── tests/        # 单元测试
├── web/              # Next.js 前端
│   ├── src/app/      # App Router 页面
│   └── src/components/  # UI 组件
├── task/             # 项目文档
└── .claude/          # Claude 配置
```

---

## 🔧 开发指南

### 环境配置

AI 功能需要在 `backend/.env` 配置：

```env
# AI 配置（章节分段、大纲生成、字幕润色）
API_KEY=your-api-key
API_BASE=https://api.openai.com/v1
API_MODEL=gpt-4o-mini

# ASR 配置（可选）
ASR_API_BASE=https://api.openai.com/v1
ASR_MODEL=whisper-1
```

### 测试

```bash
cd backend
pytest tests/
```

### 代码检查

```bash
ruff check src/
ruff format src/
```

---

## 📄 许可证

本项目采用 **Apache License 2.0** 开源。

- ✅ 允许商业使用
- ✅ 允许修改和分发
- ✅ 需保留版权声明

详见 [LICENSE](LICENSE) 文件。

---

## 🙏 致谢

- [FFmpeg](https://ffmpeg.org/) - 视频处理
- [Next.js](https://nextjs.org/) - React 框架
- [FastAPI](https://fastapi.tiangolo.com/) - Python Web 框架
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件库
- [UV](https://github.com/astral-sh/uv) - Python 包管理器
- [OpenAI](https://openai.com/) - Whisper ASR 和 GPT 模型

---

## 📮 联系方式

- **Author** - Chaofa Yuan ([@bbruceyuan](https://github.com/bbruceyuan))
- **Website** - https://yuanchaofa.com
- **GitHub** - https://github.com/bbruceyuan/vmarker
- **Email** - bruceyuan123@gmail.com

---

<p align="center">
  <strong>⭐ 如果觉得这个项目有帮助，请给个 Star！</strong>
</p>

<p align="center">
  Built with ❤️ by <a href="https://yuanchaofa.com">Chaofa Yuan</a>
</p>
