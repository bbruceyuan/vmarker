"""
[INPUT]: 依赖 pytest, vmarker.video_composer_parallel
[OUTPUT]: video_composer_parallel 模块测试用例
[POS]: tests/ 的并行合成测试
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

from pathlib import Path    

import pytest

from vmarker.video_composer_parallel import (
    ParallelConfig,
    Segment,
    calculate_segments,
    cleanup_segments,
)


class TestCalculateSegments:
    """分片计算测试"""

    def test_single_segment(self):
        """单分片（时长 <= chunk_seconds）"""
        result = calculate_segments(duration=60, chunk_seconds=120)

        assert len(result) == 1
        assert result[0].index == 0
        assert result[0].start == 0.0
        assert result[0].duration == 60

    def test_multiple_segments(self):
        """多分片"""
        result = calculate_segments(duration=300, chunk_seconds=60)

        assert len(result) == 5
        assert result[0].duration == 60
        assert result[1].start == 60
        assert result[4].duration == 60

    def test_partial_last_segment(self):
        """最后一片不足 chunk_seconds"""
        result = calculate_segments(duration=250, chunk_seconds=60)

        assert len(result) == 5
        assert result[4].duration == 10  # 250 - 60*4 = 10

    def test_chunk_seconds_zero_raises(self):
        """chunk_seconds=0 应抛出 ValueError"""
        with pytest.raises(ValueError, match="chunk_seconds must be positive"):
            calculate_segments(duration=60, chunk_seconds=0)

    def test_chunk_seconds_negative_raises(self):
        """chunk_seconds<0 应抛出 ValueError"""
        with pytest.raises(ValueError, match="chunk_seconds must be positive"):
            calculate_segments(duration=60, chunk_seconds=-10)


class TestParallelConfig:
    """ParallelConfig 测试"""

    def test_default_values(self):
        """默认值"""
        config = ParallelConfig()

        assert config.chunk_seconds > 0
        assert config.max_workers > 0
        assert config.gop_multiplier == 2

    def test_chunk_seconds_zero_raises(self):
        """chunk_seconds=0 应抛出 ValueError"""
        with pytest.raises(ValueError, match="chunk_seconds must be positive"):
            ParallelConfig(chunk_seconds=0)

    def test_max_workers_zero_raises(self):
        """max_workers=0 应抛出 ValueError"""
        with pytest.raises(ValueError, match="max_workers must be positive"):
            ParallelConfig(max_workers=0)


class TestCleanupSegments:
    """分片清理测试"""

    def test_cleanup_nonexistent_files(self):
        """清理不存在的文件不应报错"""
        paths = [
            Path("/tmp/does_not_exist_1.mp4"),
            Path("/tmp/does_not_exist_2.mp4"),
        ]

        # 不应抛出异常
        cleanup_segments(paths)

    def test_cleanup_existing_files(self, tmp_path):
        """清理存在的文件"""
        # 创建测试文件
        paths = [
            tmp_path / "segment_0.mp4",
            tmp_path / "segment_1.mp4",
        ]
        for p in paths:
            p.write_text("test")

        # 清理
        cleanup_segments(paths)

        # 验证文件已删除
        for p in paths:
            assert not p.exists()


class TestSegmentModel:
    """Segment 数据模型测试"""

    def test_segment_creation(self):
        """创建 Segment"""
        seg = Segment(index=0, start=0.0, duration=60)

        assert seg.index == 0
        assert seg.start == 0.0
        assert seg.duration == 60
        assert seg.status.value == "queued"
        assert seg.output_path is None
        assert seg.error is None

    def test_segment_with_output(self):
        """Segment 带输出路径"""
        output = Path("/tmp/segment_0.mp4")
        seg = Segment(index=0, start=0.0, duration=60, output_path=output)

        assert seg.output_path == output


class TestIntegration:
    """集成测试（需要 FFmpeg）"""

    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_parallel_flow_with_cleanup(self, tmp_path):
        """测试并行流程的清理逻辑"""
        # 模拟创建分片文件
        segment_files = [
            tmp_path / "segment_0000.mp4",
            tmp_path / "segment_0001.mp4",
            tmp_path / "segment_0002.mp4",
        ]
        for f in segment_files:
            f.write_text("mock content")

        concat_file = tmp_path / "segments.txt"

        try:
            # 模拟流程
            segments = [
                Segment(index=0, start=0, duration=60),
                Segment(index=1, start=60, duration=60),
                Segment(index=2, start=120, duration=60),
            ]

            # 验证文件存在
            for f in segment_files:
                assert f.exists()

        finally:
            # 清理（模拟真实流程中的 finally 块）
            cleanup_segments(segment_files)
            try:
                if concat_file.exists():
                    concat_file.unlink()
            except Exception:
                pass

        # 验证清理完成
        for f in segment_files:
            assert not f.exists()
        assert not concat_file.exists()
