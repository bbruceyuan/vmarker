"""
[INPUT]: 依赖 models.py 的 ColorScheme
[OUTPUT]: 对外提供 THEMES, get_theme(), list_themes()
[POS]: 配色方案定义，被视频生成模块消费
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

from vmarker.models import ColorScheme


# =============================================================================
#  内置配色方案
# =============================================================================

THEMES: dict[str, ColorScheme] = {
    "tech-blue": ColorScheme(
        name="科技蓝",
        played_bg="#2563EB",
        unplayed_bg="#64748B",
        played_text="#FFFFFF",
        unplayed_text="#FFFFFF",
        indicator="#FFFFFF",
        separator="#FFFFFF",
    ),
    "vibrant-orange": ColorScheme(
        name="活力橙",
        played_bg="#EA580C",
        unplayed_bg="#78716C",
        played_text="#FFFFFF",
        unplayed_text="#FFFFFF",
        indicator="#FFFFFF",
        separator="#FFFFFF",
    ),
    "elegant-purple": ColorScheme(
        name="优雅紫",
        played_bg="#7C3AED",
        unplayed_bg="#6B7280",
        played_text="#FFFFFF",
        unplayed_text="#FFFFFF",
        indicator="#FFFFFF",
        separator="#FFFFFF",
    ),
    "fresh-green": ColorScheme(
        name="清新绿",
        played_bg="#059669",
        unplayed_bg="#6B7280",
        played_text="#FFFFFF",
        unplayed_text="#FFFFFF",
        indicator="#FFFFFF",
        separator="#FFFFFF",
    ),
    "classic-dark": ColorScheme(
        name="经典深色",
        played_bg="#374151",
        unplayed_bg="#9CA3AF",
        played_text="#FFFFFF",
        unplayed_text="#1F2937",
        indicator="#EF4444",
        separator="#FFFFFF",
    ),
    "sakura-pink": ColorScheme(
        name="樱花粉",
        played_bg="#DB2777",
        unplayed_bg="#78716C",
        played_text="#FFFFFF",
        unplayed_text="#FFFFFF",
        indicator="#FFFFFF",
        separator="#FFFFFF",
    ),
}


# =============================================================================
#  公共接口
# =============================================================================

def get_theme(name: str) -> ColorScheme:
    """获取配色方案"""
    if name not in THEMES:
        available = ", ".join(THEMES.keys())
        raise KeyError(f"配色方案 '{name}' 不存在，可用: {available}")
    return THEMES[name]


def list_themes() -> list[str]:
    """获取所有配色方案名称"""
    return list(THEMES.keys())
