/**
 * [INPUT]: 依赖 framer-motion 类型
 * [OUTPUT]: 对外提供 fadeInUp, staggerContainer, scaleIn, slideInLeft, slideInRight 动效预设
 * [POS]: lib 目录的动效工具，被所有 landing 组件消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { Variants } from "framer-motion";

// ============================================================
// Fade In Up - 淡入上升
// ============================================================
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

// ============================================================
// Stagger Container - 子元素依次入场容器
// ============================================================
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

// ============================================================
// Scale In - 缩放淡入
// ============================================================
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

// ============================================================
// Slide In Left - 从左滑入
// ============================================================
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

// ============================================================
// Slide In Right - 从右滑入
// ============================================================
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

// ============================================================
// Viewport 配置
// ============================================================
export const viewportConfig = {
  once: true,
  margin: "-100px",
};
