# vmarker backend

视频标记工具集后端 - Make video structure visible

## 安装

```bash
cd backend
uv sync
```

## CLI 使用

### Chapter Bar 专用入口

```bash
# 自动分段
uv run acb input.srt

# AI 智能分段
uv run acb input.srt --mode ai --api-key YOUR_KEY

# 指定配色和尺寸
uv run acb input.srt --theme elegant-purple -w 1280 -H 80

# 查看配色方案
uv run acb themes
```

### 通用入口

```bash
# 章节进度条
uv run vmarker chapter input.srt

# 查看配色方案
uv run vmarker themes

# 查看版本
uv run vmarker version
```

## API 服务

```bash
# 启动
uv run uvicorn vmarker.api:app --reload --port 8000

# 文档
open http://localhost:8000/docs
```

### API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/api/v1/chapter-bar/themes` | 配色方案列表 |
| POST | `/api/v1/chapter-bar/parse` | 解析 SRT |
| POST | `/api/v1/chapter-bar/chapters/auto` | 自动分段 |
| POST | `/api/v1/chapter-bar/chapters/ai` | AI 分段 |
| POST | `/api/v1/chapter-bar/validate` | 验证章节 |
| POST | `/api/v1/chapter-bar/generate` | 生成视频 |

## 开发

```bash
# 安装开发依赖
uv sync --group dev

# 运行测试
uv run pytest

# 代码格式化
uv run ruff check --fix
uv run ruff format
```
