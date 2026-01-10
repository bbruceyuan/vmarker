"""
[INPUT]: 依赖 pytest, vmarker.chapter_bar
[OUTPUT]: chapter_bar 模块测试用例
[POS]: tests/ 的 chapter_bar 测试
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

from vmarker import chapter_bar as cb
from vmarker.models import Chapter, Subtitle


class TestExtractAuto:
    """自动分段测试"""

    def test_basic(self):
        """基础分段"""
        subs = [
            Subtitle(index=1, start_time=0, end_time=30, text="开场白"),
            Subtitle(index=2, start_time=30, end_time=60, text="正文内容"),
            Subtitle(index=3, start_time=60, end_time=90, text="总结"),
        ]
        result = cb.extract_auto(subs, 90, interval=60)

        assert len(result.chapters) == 2
        assert result.chapters[0].start_time == 0
        assert result.chapters[0].end_time == 60

    def test_interval_clamping(self):
        """间隔范围限制"""
        subs = []
        # 间隔小于 30 应被限制为 30
        result = cb.extract_auto(subs, 120, interval=10)
        assert result.chapters[0].end_time == 30

        # 间隔大于 300 应被限制为 300
        result = cb.extract_auto(subs, 600, interval=500)
        assert result.chapters[0].end_time == 300


class TestValidate:
    """章节验证测试"""

    def test_valid(self):
        """有效章节"""
        chapters = [
            Chapter(title="开场", start_time=0, end_time=60),
            Chapter(title="正文", start_time=60, end_time=180),
        ]
        result = cb.validate(chapters, 180)

        assert result.valid is True
        assert len(result.issues) == 0

    def test_empty(self):
        """空章节列表"""
        result = cb.validate([], 100)

        assert result.valid is False
        assert any(i.code == "EMPTY" for i in result.issues)

    def test_time_order_error(self):
        """时间顺序错误"""
        chapters = [Chapter(title="错误", start_time=60, end_time=30)]
        result = cb.validate(chapters, 100)

        assert result.valid is False
        assert any(i.code == "TIME_ORDER" for i in result.issues)

    def test_exceed_duration(self):
        """超出时长"""
        chapters = [Chapter(title="超长", start_time=120, end_time=180)]
        result = cb.validate(chapters, 100)

        assert result.valid is False
        assert any(i.code == "EXCEED" for i in result.issues)

    def test_overlap(self):
        """章节重叠"""
        chapters = [
            Chapter(title="章节1", start_time=0, end_time=70),
            Chapter(title="章节2", start_time=60, end_time=120),
        ]
        result = cb.validate(chapters, 120)

        assert result.valid is False
        assert any(i.code == "OVERLAP" for i in result.issues)

    def test_empty_title_warning(self):
        """空标题警告"""
        chapters = [Chapter(title="", start_time=0, end_time=60)]
        result = cb.validate(chapters, 60)

        assert result.valid is True
        assert any(i.code == "EMPTY_TITLE" for i in result.issues)

    def test_short_chapter_warning(self):
        """短章节警告"""
        chapters = [Chapter(title="短", start_time=0, end_time=3)]
        result = cb.validate(chapters, 3)

        assert result.valid is True
        assert any(i.code == "SHORT" for i in result.issues)

    def test_fix_start_gap(self):
        """修正开头间隙"""
        chapters = [Chapter(title="章节", start_time=30, end_time=60)]
        result = cb.validate(chapters, 60)

        assert result.valid is True
        assert result.chapters[0].start_time == 0

    def test_fix_end_gap(self):
        """修正结尾间隙"""
        chapters = [Chapter(title="章节", start_time=0, end_time=60)]
        result = cb.validate(chapters, 120)

        assert result.valid is True
        assert result.chapters[0].end_time == 120

    def test_fix_middle_gap(self):
        """修正中间间隙"""
        chapters = [
            Chapter(title="章节1", start_time=0, end_time=30),
            Chapter(title="章节2", start_time=60, end_time=90),
        ]
        result = cb.validate(chapters, 90)

        assert result.valid is True
        assert result.chapters[0].end_time == 60

    def test_sort_by_start_time(self):
        """按开始时间排序"""
        chapters = [
            Chapter(title="章节2", start_time=60, end_time=120),
            Chapter(title="章节1", start_time=0, end_time=60),
        ]
        result = cb.validate(chapters, 120)

        assert result.valid is True
        assert result.chapters[0].title == "章节1"
