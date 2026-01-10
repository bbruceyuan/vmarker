"""
[INPUT]: 依赖 ai_client, models
[OUTPUT]: 对外提供 generate_shownotes() 函数
[POS]: 视频大纲生成模块，从字幕提取结构化大纲
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

from dataclasses import dataclass

from vmarker.ai_client import AIClient, AIConfig
from vmarker.models import Subtitle


# =============================================================================
#  数据模型
# =============================================================================

@dataclass
class OutlineItem:
    """大纲条目"""
    timestamp: float  # 开始时间（秒）
    title: str        # 标题/要点


@dataclass
class ShowNotes:
    """视频大纲"""
    summary: str                # 整体摘要
    outline: list[OutlineItem]  # 带时间戳的大纲


# =============================================================================
#  Prompt 模板
# =============================================================================

_SHOWNOTES_PROMPT = """你是一个视频内容分析助手。请根据以下字幕内容，生成视频大纲。

要求：
1. 生成一个简洁的视频整体摘要（summary），不超过 100 字
2. 提取 5-10 个关键章节/要点，每个要点包含：
   - timestamp: 该要点出现的时间点（秒数，取字幕的开始时间）
   - title: 简洁的要点标题（10-20 字）

请以 JSON 格式输出，格式如下：
{{
  "summary": "视频整体摘要...",
  "outline": [
    {{"timestamp": 0, "title": "开场介绍"}},
    {{"timestamp": 120, "title": "核心观点一"}}
  ]
}}

字幕内容：
{subtitles}
"""


# =============================================================================
#  核心函数
# =============================================================================

def _format_subtitles(subtitles: list[Subtitle], max_chars: int = 15000) -> str:
    """格式化字幕用于 AI 输入"""
    lines = []
    char_count = 0

    for sub in subtitles:
        line = f"[{sub.start_time:.1f}s] {sub.text}"
        char_count += len(line)
        if char_count > max_chars:
            lines.append("... (后续字幕省略)")
            break
        lines.append(line)

    return "\n".join(lines)


async def generate_shownotes(
    subtitles: list[Subtitle],
    *,
    api_key: str,
    api_base: str = "https://api.openai.com/v1",
    model: str = "gpt-4o-mini",
) -> ShowNotes:
    """
    从字幕生成视频大纲

    Args:
        subtitles: 字幕列表
        api_key: AI API Key
        api_base: API 基础地址
        model: 模型名称

    Returns:
        ShowNotes 实例
    """
    formatted = _format_subtitles(subtitles)
    prompt = _SHOWNOTES_PROMPT.format(subtitles=formatted)

    config = AIConfig(api_key=api_key, api_base=api_base, model=model)

    async with AIClient(config) as client:
        result = await client.chat_json(prompt)

    # 解析结果
    summary = result.get("summary", "")
    outline_data = result.get("outline", [])

    outline = [
        OutlineItem(timestamp=item.get("timestamp", 0), title=item.get("title", ""))
        for item in outline_data
    ]

    return ShowNotes(summary=summary, outline=outline)
