<div align="center">

# 🎬 Auto Chapter Bar

[![Hugging Face Space](https://img.shields.io/badge/🤗%20Hugging%20Face-Space-blue)](https://huggingface.co/spaces/bbruceyuan/auto-chapter-bar)
[![Python 3.13+](https://img.shields.io/badge/python-3.13+-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub stars](https://img.shields.io/github/stars/bbruceyuan/auto-chapter-bar?style=social)](https://github.com/bbruceyuan/auto-chapter-bar/stargazers)

</div>

Auto Chapter Bar（简称 `acb`）是一个开源的 Python 工具，可以快速将 SRT 字幕文件转换为带有 Alpha 透明通道的视频章节进度条。它特别适用于提升长视频的观看体验和完播率。

**直接在终端使用：** `acb input.srt 360` 或 `chapterbar input.srt 360`

## 🎯 解决的问题

长视频（课程、直播回放、知识类内容）完播率通常较低，主要原因：
- 观众不知道整个视频的内容结构
- 平台原生章节功能只在播放器内有效，无法嵌入到视频中
- 在剪辑软件中手动制作章节条非常耗时（30-60分钟）

**Auto-Chapter-Bar 的解决方案：**
- 1 次点击 或 30 秒操作
- 10-40 秒自动生成
- 输出专业级章节进度条

## ✨ 核心特性

- **🎨 透明通道支持**：输出 RGBA 格式，可完美叠加在任意视频上
- **🤖 AI 智能分段**：基于 Moonshot LLM 理解语义边界，自动识别章节
- **🔒 隐私优先**：完全本地处理，视频文件不上传云端
- **⚡ 高性能**：多进程并行处理，速度提升 2-4 倍
- **🌐 跨平台**：支持 Windows、macOS、Linux
- **🎛️ 三种模式**：AI 智能模式、自动分段模式、手动配置模式
- **🌐 Web 界面**：基于 Gradio，无需命令行也能使用
- **📊 专业品质**：动态文字缩放、阴影效果、灰度配色方案

## 🛠️ 安装

### 前置要求
- Python 3.13+
- FFmpeg

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/bbruceyuan/auto-chapter-bar.git
cd auto-chapter-bar

# 使用 uv 安装依赖（推荐）
curl -LsSf https://astral.sh/uv/install.sh | sh
uv sync

# 或使用 pip
pip install -e .
```

### 安装 FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Windows:**
1. 下载: https://www.gyan.dev/ffmpeg/builds/
2. 解压并将 bin 目录添加到系统 PATH

## 🚀 快速开始

### 方式一：AI 智能模式（推荐）

需要 Moonshot API Key（月均有免费额度）：

```bash
# 设置 API Key
export MOONSHOT_API_KEY="your-api-key"

# 生成章节条（6分钟视频）
acb input.srt 360

# 或指定 API Key
acb input.srt 360 --api-key your-api-key

# 输出到指定路径
acb input.srt 360 -o outputs/chapter_bar.mov
```

### 方式二：自动分段模式（无需 API）

```bash
# 每 60 秒自动分段
acb input.srt 360 --mode auto --interval 60

# 保存章节配置供后续编辑
acb input.srt 360 --mode auto --save-chapters chapters.yaml --yes
```

### 方式三：手动模式（完全控制）

```bash
# 生成初始配置文件
acb input.srt 360 --save-chapters chapters.yaml --yes

# 编辑 YAML 文件，自定义章节
vim chapters.yaml

# 使用配置文件生成（不再需要 SRT 文件）
acb --chapters chapters.yaml -o outputs/chapter_bar.mov
```

**chapters.yaml 格式示例：**

```yaml
duration: 360.0
chapters:
  - title: "开场介绍"
    start_time: 0.0
    end_time: 45.5
    color: [200, 200, 200]
  - title: "核心概念"
    start_time: 45.5
    end_time: 180.0
    color: [200, 200, 200]
  - title: "实战演示"
    start_time: 180.0
    end_time: 360.0
    color: [200, 200, 200]
```

### 方式四：使用 Web 界面

```bash
# 启动 Web 服务
uv run python examples/app.py

# 浏览器会自动打开 http://localhost:7860
```

Web 界面支持：
- 拖拽上传 SRT 文件
- AI / Auto 模式切换
- 实时编辑章节
- 内置验证
- 一键生成和下载

## 💻 命令行参数说明

| 参数 | 简写 | 默认值 | 说明 |
|------|------|--------|------|
| `srt_file` | - | - | SRT 字幕文件路径（使用 `--chapters` 时不需要） |
| `duration` | - | - | 视频总时长（秒），不提供则从 SRT 自动获取 |
| `--output` | `-o` | `chapter_bar.mov` | 输出文件路径 |
| `--width` | `-w` | `1920` | 视频宽度（像素） |
| `--height` | `-h` | `60` | 进度条高度（像素） |
| `--mode` | `-m` | `ai` | 模式：ai / auto / manual |
| `--interval` | `-i` | `60` | 自动模式下的分段间隔（秒） |
| `--api-key` | - | - | Moonshot API Key |
| `--model` | - | `moonshot-v1-8k` | AI 模型名称 |
| `--yes` | `-y` | `false` | 自动确认所有提示 |
| `--chapters` | - | - | 手动 YAML 配置文件路径 |
| `--save-chapters` | - | - | 保存章节配置到 YAML 文件 |

## ⚡ 性能表现

### 优化后性能（v2.0+）

| 视频长度 | 旧版本耗时 | 新版本耗时 | 提升倍数 |
|---------|-----------|-----------|---------|
| 1 分钟 | 22 秒 | 10 秒 | 2.2x |
| 5 分钟 | 3 分钟 | 40 秒 | 4.5x |
| 10 分钟 | 6 分钟 | 80 秒 | 4.5x |

### 优化技术

- **字体缓存**：避免重复加载字体文件
- **预计算布局**：章节布局计算一次，复用千次
- **多进程并行**：自动利用多核 CPU
- **FFmpeg 优化**：使用 `ultrafast` 编码预设

## 📁 项目结构

```
auto-chapter-bar/
├── src/chapterbar/           # 核心代码
│   ├── cli.py               # CLI 接口
│   ├── generator.py         # 视频生成（并行优化）
│   ├── chapter_extractor.py # 章节提取（AI + Auto）
│   ├── parser.py            # SRT 解析
│   ├── chapter_validator.py # 验证器
│   ├── chapter_loader.py    # YAML 配置加载
│   └── interactive_editor.py # 交互式编辑器
├── tests/                   # 单元测试
├── examples/                # 示例代码
│   ├── app.py              # Web 界面
│   └── main.py             # 简单示例
├── inputs/                  # 输入文件（示例字幕）
├── outputs/                 # 输出文件（生成的视频）
├── docs/                    # 文档
├── pyproject.toml          # 项目配置
└── README.md               # 本文档
```

## 🎯 使用场景

### 最佳实践

| 场景 | 推荐模式 | 参数建议 | 说明 |
|------|---------|---------|------|
| 知识课程 | AI 模式 | `--interval 120` | 语义分段，匹配知识模块 |
| 直播回放 | Auto 模式 | `--interval 300` | 固定间隔，快速处理长视频 |
| 产品评测 | Manual 模式 | YAML 配置 | 精确控制章节，突出评测重点 |
| 会议录像 | AI 模式 | 默认模型 | 识别议题转换点 |

### 示例

```bash
# 60 分钟课程
acb course.srt 3600 --mode ai --save-chapters course_chapters.yaml

# 2 小时直播，每 10 分钟一段
acb live.srt 7200 --mode auto --interval 600

# 10 分钟评测，输出到指定路径
acb review.srt 600 --mode ai -o review_bar.mov
```

## 📦 在视频编辑软件中使用

### Adobe Premiere Pro

1. 导入原视频到时间线
2. 导入生成的 `chapter_bar.mov`
3. 将章节条拖入最上层视频轨道
4. 调整位置和大小（通常放在顶部）
5. 导出最终视频

### 剪映（CapCut）

1. 添加原视频到主轨道
2. 新增画中画轨道
3. 导入章节条视频
4. 调整位置和大小
5. 导出视频

### DaVinci Resolve

1. 导入两个视频文件
2. 将章节条放在视频轨道最上层
3. 调整合成模式和位置
4. 渲染输出

## 🧪 测试

```bash
# 运行所有测试
pytest tests/

# 运行特定测试
pytest tests/test_parser.py
cpytest tests/test_chapter_extractor.py

# 覆盖率测试
pytest --cov=src/chapterbar tests/
```

## 🛠️ 开发

### 代码规范

```bash
# 代码检查
ruff check src/

# 代码格式化
ruff format src/

# 类型检查
mypy src/
```

### 添加新功能

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

## 🗺️ 路线图

- **Stage 1** ✅ 开源核心工具（已完成）
  - CLI 命令行工具（`acb` 和 `chapterbar` 命令）
  - AI 智能分段
  - Web 界面 v2
  - 性能优化（并行处理）

- **Stage 2** 🚧 Web 编辑器增强（进行中）
  - 拖拽式时间轴编辑器
  - 实时预览（低分辨率）
  - 双格式导出（透明 MOV + 白色背景 MP4）
  - 更多 AI 模型支持（OpenAI/Claude/本地模型）

- **Stage 3** 📦 生态扩展（2025）
  - 插件系统（支持自定义渲染器）
  - 批处理模式（一次处理多个视频）
  - Docker 部署支持
  - Jupyter Notebook 集成

- **Stage 4** 🚀 高级功能（社区驱动）
  - 章节模板库
  - 多语言字幕支持
  - 移动端 Web 界面
  - 社区贡献指南完善

**开发完全由社区驱动，所有功能均保持开源和免费！**

## 🤝 贡献

我们欢迎各种形式的贡献！

- 🔍 **发现问题** - 提交 Issue
- 💡 **新功能建议** - 开启 Discussion
- 🐛 **Bug 修复** - 提交 Pull Request
- 📚 **文档改进** - 完善 README 或添加教程
- 🌍 **国际化** - 添加其他语言翻译

### 需要帮助的领域

- **高优先级**：
  - 预览视频生成优化
  - 更多测试用例
  - Web 界面 UI/UX 优化

- **中优先级**：
  - 支持更多 AI 模型
  - Windows 字体兼容性
  - 性能基准测试工具

- **低优先级**：
  - 其他语言文档
  - 教程视频制作

## 📄 许可证

Apache License 2.0 - 详见 [LICENSE](LICENSE) 文件

本项目采用 Apache 2.0 协议开源，允许商业使用、修改和分发，但需保留版权声明和许可证文本。

## 💬 社区

- **GitHub Issues** - 功能请求 / Bug 反馈
- **GitHub Discussions** - 使用问题 / 经验分享
- **项目邮箱** - bruceyuan123@gmail.com

## 🙏 致谢

- [MoviePy](https://zulko.github.io/moviepy/) - 视频处理框架
- [Gradio](https://gradio.app/) - Web 界面框架
- [Moonshot AI](https://moonshot.cn/) - AI 智能分段
- [uv](https://github.com/astral-sh/uv) - Python 包管理器

## 📮 联系方式

- **作者** - Chaofa Yuan ([@bbruceyuan](https://github.com/bbruceyuan))
- **GitHub** - https://github.com/bbruceyuan/auto-chapter-bar
- **邮箱** - bruceyuan123@gmail.com

---

<p align="center">
  ⭐ 如果觉得这个项目有帮助，请给个 Star！
</p>

---

<div align="center">

# 🎬 Auto Chapter Bar (English)

</div>

Auto Chapter Bar (or `acb` in CLI) is an open-source Python tool that converts SRT subtitle files into transparent video chapter progress bars with alpha channel. Perfect for improving watch time and completion rates of long-form videos.

**Use directly in terminal:** `acb input.srt 360` or `chapterbar input.srt 360`

## 🎯 Problems We Solve

Long videos (courses, live replays, educational content) suffer from low completion rates because:
- Viewers don't know the video structure
- Platform chapter features only work within players
- Manual chapter bar creation takes 30-60 minutes in editing software

**Our Solution:** 1 click or 30 seconds → 10-40 seconds → Professional chapter bars

## ✨ Key Features

- **🎨 Transparency**: RGBA output with alpha channel for perfect overlays
- **🤖 AI-Powered**: Moonshot LLM understands semantic boundaries
- **🔒 Privacy-First**: Local processing, videos never uploaded
- **⚡ High Performance**: 2-4x faster with parallel processing
- **🌐 Cross-Platform**: Windows, macOS, Linux
- **🎛️ Three Modes**: AI, Auto, Manual
- **🌐 Web UI**: Gradio-based interface
- **📊 Professional Quality**: Dynamic text scaling, shadows, gray color scheme

## 🛠️ Installation

```bash
git clone https://github.com/bbruceyuan/auto-chapter-bar.git
cd auto-chapter-bar

# Using uv (recommended)
curl -LsSf https://astral.sh/uv/install.sh | sh
uv sync

# Or using pip
pip install -e .
```

Install FFmpeg:
- **macOS**: `brew install ffmpeg`
- **Ubuntu**: `sudo apt-get install ffmpeg`
- **Windows**: Download from https://www.gyan.dev/ffmpeg/builds/

## 🚀 Quick Start

### AI Mode (Recommended)
```bash
# Set API Key
export MOONSHOT_API_KEY="your-api-key"

# Generate chapter bar
acb input.srt 360  # 360 seconds

# Or pass API key as parameter
acb input.srt 360 --api-key your-api-key
```

### Auto Mode (No API needed)
```bash
# Auto segment every 60 seconds
acb input.srt 360 --mode auto --interval 60

# Save chapters for manual editing
acb input.srt 360 --mode auto --save-chapters chapters.yaml --yes
```

### Manual Mode (Full control)
```bash
# Generate config file
acb input.srt 360 --save-chapters chapters.yaml --yes

# Edit YAML file
vim chapters.yaml

# Generate using config
acb --chapters chapters.yaml -o outputs/chapter_bar.mov
```

### Web UI
```bash
uv run python examples/app.py
# Open http://localhost:7860
```

## 🎯 Use Cases

| Use Case | Recommended Mode | Parameters | Notes |
|----------|-----------------|------------|-------|
| Educational Courses | AI Mode | `--interval 120` | Semantic segmentation |
| Live Replays | Auto Mode | `--interval 300` | Fixed intervals for long videos |
| Product Reviews | Manual Mode | YAML config | Precise control |
| Meeting Recordings | AI Mode | Default model | Identify topic transitions |

## 📦 Using in Video Editors

### Adobe Premiere Pro
1. Import original video
2. Import `chapter_bar.mov`
3. Place on top track
4. Adjust position (usually top)
5. Export

### CapCut (剪映)
1. Add video to main track
2. Add new overlay track
3. Import chapter bar
4. Adjust position and size
5. Export

### DaVinci Resolve
1. Import both files
2. Place chapter bar on top track
3. Adjust composite mode
4. Render

## 🛠️ Development

### Code Quality
```bash
# Linting
ruff check src/

# Formatting
ruff format src/

# Type checking
mypy src/

# Tests
pytest tests/
```

### Contributing
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open Pull Request

## 🗺️ Roadmap

- **Stage 1** ✅ Open Source Core (Completed)
  - CLI tools (`acb` and `chapterbar` commands)
  - AI-powered segmentation
  - Web interface v2
  - Performance optimization with parallel processing

- **Stage 2** 🚧 Web Editor Enhancements (In Progress)
  - Drag-and-drop timeline editor
  - Real-time preview
  - Multiple export formats
  - More AI models support

- **Stage 3** 📦 Ecosystem Expansion (2025)
  - Plugin system
  - Batch processing
  - Docker support
  - Jupyter integration

- **Stage 4** 🚀 Advanced Features (Community-Driven)
  - Chapter templates library
  - Multi-language subtitles
  - Mobile web interface
  - Enhanced community guidelines

All features remain open-source and free, driven by our community!

## 🤝 Contributing

We welcome all kinds of contributions!

- Report bugs via GitHub Issues
- Suggest features via Discussions
- Submit PRs for bug fixes and improvements
- Improve documentation

## 📄 License

Apache License 2.0 - see [LICENSE](LICENSE) file

This project is open-sourced under the Apache 2.0 license, which permits commercial use, modification, and distribution, provided that you include the copyright notice and license text.

## 🙏 Acknowledgments

- [MoviePy](https://zulko.github.io/moviepy/) - Video processing
- [Gradio](https://gradio.app/) - Web UI framework
- [Moonshot AI](https://moonshot.cn/) - AI segmentation
- [uv](https://github.com/astral-sh/uv) - Python package manager

## 📮 Contact

- **Author** - Chaofa Yuan ([@bbruceyuan](https://github.com/bbruceyuan))
- **GitHub** - https://github.com/bbruceyuan/auto-chapter-bar
- **Email** - bruceyuan123@gmail.com

---

<p align="center">
  ⭐ Star this repo if you find it helpful!
</p>
