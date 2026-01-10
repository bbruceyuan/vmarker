"""
[INPUT]: 依赖 pytest, vmarker.parser
[OUTPUT]: parser 模块测试用例
[POS]: tests/ 的 parser 测试
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

import pytest

from vmarker.parser import parse_srt


class TestParseSrt:
    """SRT 解析测试"""

    def test_basic(self):
        """基础解析"""
        content = """1
00:00:00,400 --> 00:00:02,866
第一条字幕

2
00:00:02,866 --> 00:00:05,166
第二条字幕
"""
        result = parse_srt(content)

        assert len(result.subtitles) == 2
        assert result.duration == 5.166
        assert result.subtitles[0].text == "第一条字幕"

    def test_multiline_text(self):
        """多行文本"""
        content = """1
00:00:00,000 --> 00:00:03,000
第一行
第二行
"""
        result = parse_srt(content)

        assert result.subtitles[0].text == "第一行\n第二行"

    def test_dot_separator(self):
        """点号分隔符"""
        content = """1
00:00:00.400 --> 00:00:02.866
测试
"""
        result = parse_srt(content)

        assert result.subtitles[0].start_time == 0.4
        assert result.subtitles[0].end_time == 2.866

    def test_empty_content(self):
        """空内容"""
        result = parse_srt("")

        assert len(result.subtitles) == 0
        assert result.duration == 0

    def test_invalid_index(self):
        """无效序号"""
        content = """abc
00:00:00,400 --> 00:00:02,866
测试
"""
        with pytest.raises(ValueError, match="序号无效"):
            parse_srt(content)

    def test_invalid_timeline(self):
        """无效时间轴"""
        content = """1
invalid --> 00:00:02,866
测试
"""
        with pytest.raises(ValueError, match="时间轴格式错误"):
            parse_srt(content)

    def test_end_before_start(self):
        """结束早于开始"""
        content = """1
00:00:05,000 --> 00:00:02,000
测试
"""
        with pytest.raises(ValueError, match="结束时间早于开始时间"):
            parse_srt(content)

    def test_windows_line_endings(self):
        """Windows 换行符"""
        content = "1\r\n00:00:00,400 --> 00:00:02,866\r\n测试\r\n"
        result = parse_srt(content)

        assert len(result.subtitles) == 1

    def test_extra_blank_lines(self):
        """多余空行"""
        content = """

1
00:00:00,400 --> 00:00:02,866
测试



2
00:00:02,866 --> 00:00:05,000
第二条

"""
        result = parse_srt(content)

        assert len(result.subtitles) == 2
