<div align="center">

# 🎬 vmarker

**Make Video Structure Visible**

[![GitHub Stars](https://img.shields.io/github/stars/bbruceyuan/vmarker?style=social)](https://github.com/bbruceyuan/vmarker/stargazers)
[![Python 3.13+](https://img.shields.io/badge/python-3.13+-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green.svg)](https://fastapi.tiangolo.com/)

Video Marking Toolkit - Auto-generate transparent chapter progress bars from SRT subtitles to boost video completion rates

[Quick Start](#-quick-start) · [Features](#-core-features) · [Live Demo](https://vmarker.app)

English | **[简体中文](README.md)**

</div>

---

## 📖 Introduction

vmarker is an open-source video marking toolkit that significantly improves long-form video completion rates through **AI-powered chapter segmentation** and **visual progress bars**.

**Key Features**:
- 🎨 **Transparent Output** - RGBA format, perfect for video overlays
- 🤖 **AI-Powered Segmentation** - Auto-detect chapter boundaries without manual tagging
- ⚡ **Fast Generation** - 10-40 seconds vs. 30-60 minutes manual creation
- 🖥️ **Dual Interface** - Web UI + CLI tools
- 🔒 **Local Processing** - Videos stay on your machine, privacy first

---

## 🎯 Problem & Solution

Why long videos (courses, livestreams, reviews) have low completion rates:
- **Unclear Structure** - Viewers don't know what's coming, easy to leave
- **Platform Limitations** - Native chapters only work within players
- **High Production Cost** - Manual chapter bar creation takes 30-60 minutes

**vmarker's Solution**:
```
Traditional: 30-60 minutes manual work
           ↓
vmarker: 30-second command / 1 click
           ↓
        10-40 seconds auto-generation
           ↓
    Professional transparent video output
```

---

## 🎬 Demo Preview

### Auto-generated Chapter Progress Bar

```
┌────────────────────────────────────────────────────────────────┐
│ 00:00        02:30            05:45        10:20       14:00   │
│ Intro        Background       Core Content  Demo       Summary │
└────────────────────────────────────────────────────────────────┘

Chapter List:
00:00  Intro
02:30  Background
05:45  Core Content  ← Currently Playing
10:20  Demo
14:00  Summary

Generates transparent video (MOV) that can be directly overlaid on your video
```

**Features**:
- Auto-detect chapter boundaries (AI semantic understanding)
- Dynamic text layout (adaptive length)
- Multiple color themes (10+ presets)
- Transparent channel output (RGBA format)

---

## ✨ Core Features

### 1. Chapter Bar - Chapter Progress Bar ⭐

Auto-generate transparent chapter progress bar videos from SRT subtitles.

**Usage**:
```bash
# CLI command (AI smart segmentation)
acb input.srt

# Auto segmentation (60-second intervals, no AI needed)
acb input.srt --mode auto --interval 60

# Web interface (visual editing)
cd web && npm run dev  # Visit http://localhost:3000
```

---

### 2. Progress Bar - Playback Progress Bar

Generate clean playback progress bar videos.

```bash
vmarker progress --duration 360 --color blue
```

---

### 3. Show Notes - AI Video Outline

Auto-generate structured outlines (summary + timeline) from subtitles.

```bash
vmarker shownotes input.srt -o notes.md
```

**Output Example**:
```markdown
## Video Outline

### Introduction (00:00 - 02:30)
- Project background and motivation
- Core problem statement

### Feature Demo (02:30 - 08:45)
- Chapter Bar feature showcase
- AI smart segmentation effects
```

---

### 4. Subtitle - AI Subtitle Polish

Fix ASR recognition errors and improve readability.

```bash
vmarker subtitle input.srt -o polished.srt
```

---

### 5. Video Process - Full Pipeline

Upload video → ASR transcription → Generate chapter bar → Compose into original video.

**Usage**: Complete workflow in Web interface

---

## 🛠️ Installation

### Prerequisites

- **Python** >= 3.13
- **Node.js** >= 20
- **FFmpeg** (system installation)

### Install FFmpeg

**macOS**:
```bash
brew install ffmpeg
```

**Ubuntu/Debian**:
```bash
sudo apt-get update && sudo apt-get install ffmpeg
```

**Windows**:
Download from https://www.gyan.dev/ffmpeg/builds/ and add to PATH

### Clone Repository

```bash
git clone https://github.com/bbruceyuan/vmarker.git
cd vmarker
```

---

## 🚀 Quick Start

### Method 1: Web Interface (Recommended)

#### 1. Start Backend

```bash
cd backend

# Install dependencies (using UV)
curl -LsSf https://astral.sh/uv/install.sh | sh
uv sync

# Configure API Key (required for AI features)
cp .env.example .env
# Edit .env to add your OpenAI API Key or compatible service

# Start backend
uv run uvicorn vmarker.api:app --reload --port 8000
```

#### 2. Start Frontend

```bash
cd web

# Install dependencies
npm install

# Start dev server
npm run dev
```

Visit **http://localhost:3000**

---

### Method 2: CLI Command Line

#### Development Mode (Recommended)

Use `uv run` prefix inside `backend/` directory:

```bash
cd backend

# Chapter Bar quick commands
uv run acb input.srt
uv run acb input.srt --theme tech-blue

# General commands
uv run vmarker chapter input.srt
uv run vmarker progress --duration 360
uv run vmarker shownotes input.srt
uv run vmarker subtitle input.srt
uv run vmarker themes  # List color schemes
```

#### Installation Mode (Global Usage)

```bash
cd backend
uv pip install -e .

# Then run anywhere
acb input.srt
vmarker chapter input.srt --theme sunset-orange
```

**Detailed CLI Documentation**: [backend/CLI_USAGE.md](backend/CLI_USAGE.md)

---

## 💡 Use Cases

### Educational Course Videos

60-minute tutorial video requiring clear chapter divisions:

```bash
acb course.srt --mode ai
```

AI automatically identifies knowledge module boundaries, generating semantically coherent chapters.

---

### Livestream Replays

2-hour livestream requiring quick segmentation:

```bash
acb live.srt --mode auto --interval 600  # 10-minute segments
```

No AI needed, fast time-based segmentation.

---

### Product Reviews

10-minute review requiring precise chapter control:

Use Web interface for visual chapter time and title editing.

---

### Meeting Recordings

Auto-generate meeting outline + chapter bar:

```bash
vmarker shownotes meeting.srt -o meeting_notes.md
acb meeting.srt --mode ai
vmarker subtitle meeting.srt -o meeting_polished.srt
```

---

## 📦 Using in Video Editing Software

### Adobe Premiere Pro

1. Import original video to timeline
2. Import generated `chapter_bar.mov`
3. Drag chapter bar to top video track
4. Adjust position (usually at top)
5. Export final video

### CapCut

1. Add original video to main track
2. Add new picture-in-picture track
3. Import chapter bar video
4. Adjust position and size
5. Export video

### DaVinci Resolve

1. Import both video files
2. Place chapter bar on top track
3. Adjust composite mode and position
4. Render output

---

## 📁 Project Structure

```
vmarker/
├── backend/          # Python backend (FastAPI + CLI)
│   ├── src/vmarker/  # Core modules
│   └── tests/        # Unit tests
├── web/              # Next.js frontend
│   ├── src/app/      # App Router pages
│   └── src/components/  # UI components
├── task/             # Project documentation
└── .claude/          # Claude configuration
```

---

## 🔧 Development Guide

### Environment Configuration

AI features require configuration in `backend/.env`:

```env
# AI configuration (chapter segmentation, outline generation, subtitle polishing)
API_KEY=your-api-key
API_BASE=https://api.openai.com/v1
API_MODEL=gpt-4o-mini

# ASR configuration (optional)
ASR_API_BASE=https://api.openai.com/v1
ASR_MODEL=whisper-1
```

### Testing

```bash
cd backend
pytest tests/
```

### Code Checks

```bash
ruff check src/
ruff format src/
```

---

## 📄 License

This project is licensed under **Apache License 2.0**.

- ✅ Commercial use allowed
- ✅ Modification and distribution allowed
- ✅ Copyright notice required

See [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [FFmpeg](https://ffmpeg.org/) - Video processing
- [Next.js](https://nextjs.org/) - React framework
- [FastAPI](https://fastapi.tiangolo.com/) - Python web framework
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [UV](https://github.com/astral-sh/uv) - Python package manager
- [OpenAI](https://openai.com/) - Whisper ASR and GPT models

---

## 📮 Contact

- **Author** - Chaofa Yuan ([@bbruceyuan](https://github.com/bbruceyuan))
- **Website** - https://yuanchaofa.com
- **GitHub** - https://github.com/bbruceyuan/vmarker
- **Email** - bruceyuan123@gmail.com

---

<p align="center">
  <strong>⭐ Star this repo if you find it helpful!</strong>
</p>

<p align="center">
  Built with ❤️ by <a href="https://yuanchaofa.com">Chaofa Yuan</a>
</p>
