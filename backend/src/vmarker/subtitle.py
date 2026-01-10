"""
[INPUT]: 依赖 ai_client, models
[OUTPUT]: 对外提供 polish_subtitles() 函数
[POS]: 字幕润色模块，修复空耳等问题，保持时间戳不变
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

from dataclasses import dataclass

from vmarker.ai_client import AIClient, AIConfig
from vmarker.models import Subtitle


# =============================================================================
#  数据模型
# =============================================================================

@dataclass
class PolishedSubtitle:
    """润色后的字幕"""
    index: int
    start_time: float
    end_time: float
    original_text: str
    polished_text: str


@dataclass
class PolishResult:
    """润色结果"""
    subtitles: list[PolishedSubtitle]
    changes_count: int  # 修改的字幕数量


# =============================================================================
#  Prompt 模板
# =============================================================================

_POLISH_PROMPT = """你是一个字幕校对专家。请修正以下字幕中的错误，包括：
1. 空耳错误（音译错误），如"派森"应该是"Python"，"加瓦"应该是"Java"
2. 同音字错误，如"他的"和"她的"、"做"和"作"
3. 明显的语法错误
4. 专业术语的错误

要求：
- 只修正明显的错误，保持原意不变
- 如果字幕没有问题，保持原文不变
- 返回 JSON 格式，包含所有字幕（包括未修改的）

输出格式：
{{
  "subtitles": [
    {{"index": 1, "text": "修正后的文本"}},
    {{"index": 2, "text": "原文本保持不变"}}
  ]
}}

字幕内容：
{subtitles}
"""


# =============================================================================
#  核心函数
# =============================================================================

def _format_subtitles_for_polish(subtitles: list[Subtitle]) -> str:
    """格式化字幕用于润色"""
    lines = []
    for sub in subtitles:
        lines.append(f"[{sub.index}] {sub.text}")
    return "\n".join(lines)


def _format_timestamp(seconds: float) -> str:
    """将秒数格式化为 SRT 时间戳格式"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def generate_srt(subtitles: list[PolishedSubtitle]) -> str:
    """生成 SRT 文件内容"""
    blocks = []
    for sub in subtitles:
        block = f"{sub.index}\n"
        block += f"{_format_timestamp(sub.start_time)} --> {_format_timestamp(sub.end_time)}\n"
        block += sub.polished_text
        blocks.append(block)
    return "\n\n".join(blocks) + "\n"


async def polish_subtitles(
    subtitles: list[Subtitle],
    *,
    api_key: str,
    api_base: str = "https://api.openai.com/v1",
    model: str = "gpt-4o-mini",
) -> PolishResult:
    """
    润色字幕

    Args:
        subtitles: 原始字幕列表
        api_key: AI API Key
        api_base: API 基础地址
        model: 模型名称

    Returns:
        PolishResult 实例
    """
    # 分批处理，避免超出 token 限制
    batch_size = 50
    all_polished: list[PolishedSubtitle] = []
    changes_count = 0

    for i in range(0, len(subtitles), batch_size):
        batch = subtitles[i:i + batch_size]
        formatted = _format_subtitles_for_polish(batch)
        prompt = _POLISH_PROMPT.format(subtitles=formatted)

        config = AIConfig(api_key=api_key, api_base=api_base, model=model)

        async with AIClient(config) as client:
            result = await client.chat_json(prompt)

        # 解析结果，建立索引映射
        polished_map = {
            item.get("index", 0): item.get("text", "")
            for item in result.get("subtitles", [])
        }

        # 合并结果
        for sub in batch:
            polished_text = polished_map.get(sub.index, sub.text)
            is_changed = polished_text != sub.text
            if is_changed:
                changes_count += 1

            all_polished.append(PolishedSubtitle(
                index=sub.index,
                start_time=sub.start_time,
                end_time=sub.end_time,
                original_text=sub.text,
                polished_text=polished_text,
            ))

    return PolishResult(subtitles=all_polished, changes_count=changes_count)
