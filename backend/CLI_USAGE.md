# CLI 命令使用指南

vmarker 提供了三个 CLI 入口点：

| 命令 | 说明 |
|------|------|
| `acb` | Chapter Bar 专用入口（快捷命令） |
| `vmarker` | 通用入口（子命令模式） |
| `vmk` | vmarker 的简短别名 |

---

## 两种使用方式

### 方式 1：开发模式（推荐）

**适用场景**：项目开发、调试、不需要全局安装

在项目目录内使用 `uv run` 前缀运行命令：

```bash
cd backend

# Chapter Bar 快捷命令
uv run acb input.srt
uv run acb input.srt --theme sunset-orange

# 通用命令（子命令模式）
uv run vmarker chapter input.srt
uv run vmarker themes
uv run vmarker version

# 简短别名
uv run vmk chapter input.srt
```

**优点**：
- 无需安装，立即可用
- 依赖自动管理（UV 虚拟环境）
- 修改代码后立即生效

---

### 方式 2：安装模式

**适用场景**：频繁使用、全局调用、生产环境

#### 选项 A：可编辑安装（开发推荐）

在项目目录内安装，代码修改后立即生效：

```bash
cd backend
uv pip install -e .
```

安装后可在**任何位置**直接运行：

```bash
acb input.srt
vmarker chapter input.srt
vmk themes
```

#### 选项 B：uv tool 全局安装

作为独立工具安装到 UV 的 tool 环境：

```bash
# 从项目目录安装
uv tool install --editable ./backend

# 或从 Git 仓库安装（未来发布后）
uv tool install git+https://github.com/your-org/vmarker
```

安装后可在**任何位置**直接运行：

```bash
acb input.srt
vmarker chapter input.srt
```

---

## 命令示例

### Chapter Bar 专用命令（acb）

```bash
# 开发模式
uv run acb input.srt                          # 默认配置
uv run acb input.srt --theme tech-blue        # 指定主题
uv run acb input.srt --output bar.mp4         # 指定输出

# 安装模式
acb input.srt
acb input.srt --theme sunset-orange --output custom.mov
```

### 通用命令（vmarker / vmk）

```bash
# 开发模式
uv run vmarker chapter input.srt              # 章节进度条
uv run vmarker themes                         # 列出配色
uv run vmarker version                        # 版本信息

# 安装模式
vmarker chapter input.srt
vmk themes
```

---

## API 服务启动

```bash
cd backend

# 开发模式（推荐）
uv run uvicorn vmarker.api:app --reload --port 8000

# 安装模式（安装后）
uvicorn vmarker.api:app --reload --port 8000
```

---

## 验证安装

检查命令是否可用：

```bash
# 开发模式
cd backend
uv run acb --help
uv run vmarker --help

# 安装模式
acb --help
vmarker --help
which acb        # 查看命令路径
```

---

## 常见问题

### Q: 直接运行 `acb` 提示 "command not found"

**A**: 命令未安装，使用以下方法之一：

1. **开发模式**：在 `backend/` 目录内运行 `uv run acb`
2. **安装模式**：先运行 `uv pip install -e .`，再运行 `acb`

### Q: 修改代码后命令没有生效

**A**: 检查安装方式：

- **开发模式 (`uv run`)**：代码修改立即生效 ✅
- **可编辑安装 (`uv pip install -e .`)**：代码修改立即生效 ✅
- **普通安装 (`uv pip install .`)**：需要重新安装 ❌

### Q: 推荐哪种方式？

**A**:
- **开发/调试**: 使用 `uv run acb`（无需安装）
- **日常使用**: 使用 `uv pip install -e .`（安装后全局可用）
- **生产部署**: 使用 `uv tool install`（独立环境）

---

## 技术细节

CLI 入口点在 `pyproject.toml` 中定义：

```toml
[project.scripts]
acb = "vmarker.cli:acb_app"      # Chapter Bar 专用
vmarker = "vmarker.cli:app"      # 通用入口
vmk = "vmarker.cli:app"          # 简短别名
```

UV 会将这些脚本安装到虚拟环境的 `bin/` 目录。
