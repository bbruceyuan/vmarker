"use client";

/**
 * [INPUT]: 依赖 @/lib/api, @/components/ui/*
 * [OUTPUT]: 对外提供 ChapterEditor 组件
 * [POS]: Chapter Bar 章节编辑器组件，支持增删改查
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { chapterBarApi, formatTime, parseTime, type Chapter, type ValidationIssue } from "@/lib/api";

// ============================================================
// TimeInput - 专用时间输入组件
// ============================================================
interface TimeInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

function TimeInput({ value, onChange, className }: TimeInputProps) {
  const [inputValue, setInputValue] = useState(formatTime(value));
  const [isFocused, setIsFocused] = useState(false);
  const prevValueRef = useRef(value);

  // 外部 value 变化时同步（仅在非聚焦状态）
  useEffect(() => {
    if (!isFocused && value !== prevValueRef.current) {
      setInputValue(formatTime(value));
      prevValueRef.current = value;
    }
  }, [value, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseTime(inputValue);
    if (parsed !== null && parsed >= 0) {
      onChange(parsed);
      setInputValue(formatTime(parsed));
      prevValueRef.current = parsed;
    } else {
      // 恢复为原值
      setInputValue(formatTime(value));
    }
  };

  return (
    <Input
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      className={className}
      placeholder="0:00"
    />
  );
}

// ============================================================
// ChapterEditor - 主组件
// ============================================================
interface ChapterEditorProps {
  chapters: Chapter[];
  duration: number;
  onChange: (chapters: Chapter[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function ChapterEditor({
  chapters: initialChapters,
  duration,
  onChange,
  onNext,
  onPrev,
}: ChapterEditorProps) {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [isValid, setIsValid] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const validateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Validate chapters on change with debounce
  useEffect(() => {
    // Clear previous timeout
    if (validateTimeoutRef.current) {
      clearTimeout(validateTimeoutRef.current);
    }

    // Debounce validation
    validateTimeoutRef.current = setTimeout(async () => {
      if (chapters.length === 0) {
        setIsValid(false);
        setIssues([]);
        return;
      }

      setIsValidating(true);
      try {
        const result = await chapterBarApi.validate(chapters, duration);
        setIsValid(result.valid);
        setIssues(result.issues);
        // 只在后端修正了章节时更新（如填补间隙），且必须真的有变化
        if (result.chapters.length > 0) {
          const hasChange = JSON.stringify(result.chapters) !== JSON.stringify(chapters);
          if (hasChange) {
            setChapters(result.chapters);
            onChange(result.chapters);
          }
        }
      } catch {
        setIsValid(false);
        setIssues([]);
      } finally {
        setIsValidating(false);
      }
    }, 300);

    return () => {
      if (validateTimeoutRef.current) {
        clearTimeout(validateTimeoutRef.current);
      }
    };
  }, [chapters, duration, onChange]);

  // Update chapter
  const updateChapter = useCallback(
    (index: number, field: keyof Chapter, value: string | number) => {
      setChapters((prev) => {
        const updated = [...prev];
        if (field === "start_time" || field === "end_time") {
          const parsed = typeof value === "string" ? parseTime(value) : value;
          if (parsed !== null) {
            updated[index] = { ...updated[index], [field]: parsed };
          }
        } else if (field === "title") {
          updated[index] = { ...updated[index], title: String(value) };
        }
        onChange(updated);
        return updated;
      });
    },
    [onChange]
  );

  // Add chapter
  const addChapter = useCallback(() => {
    const lastChapter = chapters[chapters.length - 1];
    const newStart = lastChapter ? lastChapter.end_time : 0;
    const newEnd = Math.min(newStart + 60, duration);

    setChapters((prev) => {
      const updated = [
        ...prev,
        { title: `章节 ${prev.length + 1}`, start_time: newStart, end_time: newEnd },
      ];
      onChange(updated);
      return updated;
    });
  }, [chapters, duration, onChange]);

  // Delete chapter
  const deleteChapter = useCallback(
    (index: number) => {
      setChapters((prev) => {
        const updated = prev.filter((_, i) => i !== index);
        onChange(updated);
        return updated;
      });
    },
    [onChange]
  );

  // Get issue for a specific chapter
  const getChapterIssues = useCallback(
    (index: number) => {
      return issues.filter((issue) => issue.chapter_index === index);
    },
    [issues]
  );

  return (
    <div className="space-y-6">
      {/* Chapter List */}
      <div className="space-y-3">
        {chapters.map((chapter, index) => {
          const chapterIssues = getChapterIssues(index);
          const hasError = chapterIssues.some((i) => i.blocking);
          const hasWarning = chapterIssues.some((i) => !i.blocking);

          return (
            <div
              key={index}
              className={`rounded-lg border p-4 ${
                hasError
                  ? "border-destructive/50 bg-destructive/5"
                  : hasWarning
                  ? "border-yellow-500/50 bg-yellow-500/5"
                  : "bg-muted/20"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Chapter Number */}
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {index + 1}
                </div>

                {/* Chapter Fields */}
                <div className="flex-1 space-y-3">
                  {/* Title */}
                  <Input
                    value={chapter.title}
                    onChange={(e) => updateChapter(index, "title", e.target.value)}
                    placeholder="章节标题"
                    className="font-medium"
                  />

                  {/* Time Range */}
                  <div className="flex items-center gap-2">
                    <TimeInput
                      value={chapter.start_time}
                      onChange={(val) => updateChapter(index, "start_time", val)}
                      className="w-24 text-center font-mono text-sm"
                    />
                    <span className="text-muted-foreground">→</span>
                    <TimeInput
                      value={chapter.end_time}
                      onChange={(val) => updateChapter(index, "end_time", val)}
                      className="w-24 text-center font-mono text-sm"
                    />
                    <span className="text-sm text-muted-foreground">
                      ({formatTime(chapter.end_time - chapter.start_time)})
                    </span>
                  </div>

                  {/* Issues */}
                  {chapterIssues.length > 0 && (
                    <div className="space-y-1">
                      {chapterIssues.map((issue, i) => (
                        <p
                          key={i}
                          className={`text-xs ${
                            issue.blocking ? "text-destructive" : "text-yellow-600"
                          }`}
                        >
                          {issue.message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Delete Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteChapter(index)}
                  disabled={chapters.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Chapter Button */}
      <Button variant="outline" className="w-full" onClick={addChapter}>
        <Plus className="mr-2 h-4 w-4" />
        添加章节
      </Button>

      {/* Validation Summary */}
      <div
        className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
          isValidating
            ? "bg-muted/50 text-muted-foreground"
            : isValid
            ? "bg-green-500/10 text-green-700"
            : "bg-destructive/10 text-destructive"
        }`}
      >
        {isValidating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            正在验证...
          </>
        ) : isValid ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            章节配置有效，共 {chapters.length} 个章节
          </>
        ) : (
          <>
            <AlertCircle className="h-4 w-4" />
            存在 {issues.filter((i) => i.blocking).length} 个错误需要修复
          </>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          上一步
        </Button>
        <Button onClick={onNext} disabled={!isValid || isValidating}>
          下一步
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
