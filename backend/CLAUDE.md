# backend/
> L2 | 父级: /CLAUDE.md

Python 后端，提供 CLI 工具和 HTTP API。

## 目录结构

```
backend/
├── pyproject.toml       - 项目配置，CLI 入口点
├── .python-version      - Python 版本锁定 (3.13)
├── src/vmarker/         - 核心模块
└── tests/               - 测试用例
```

## CLI 命令

**两种使用方式**（详见 [CLI_USAGE.md](CLI_USAGE.md)）：

### 方式 1: 开发模式（推荐）

```bash
# 在 backend/ 目录内运行
uv run acb input.srt
uv run vmarker chapter input.srt
uv run vmarker themes
```

### 方式 2: 安装模式

```bash
# 先安装（可编辑模式）
cd backend && uv pip install -e .

# 之后可在任何位置运行
acb input.srt
vmarker chapter input.srt
vmarker themes
```

## API 服务

```bash
# 开发模式
cd backend
uv run uvicorn vmarker.api:app --reload --port 8000

# 安装模式（安装后）
uvicorn vmarker.api:app --reload --port 8000
```

## 依赖

| 包 | 用途 |
|---|---|
| fastapi, uvicorn | HTTP 服务 |
| typer, rich | CLI 框架 |
| pillow | 图像渲染 |
| httpx | AI API 调用 |
| pydantic | 数据验证 |

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
