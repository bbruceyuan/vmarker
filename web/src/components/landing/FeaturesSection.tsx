"use client";

/**
 * [INPUT]: 依赖 framer-motion, lucide-react, @/lib/motion
 * [OUTPUT]: 对外提供 FeaturesSection 组件
 * [POS]: Landing Page 功能展示区，3 个核心功能简洁展示
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { motion } from "framer-motion";
import { fadeInUp, staggerContainer, viewportConfig } from "@/lib/motion";
import { Upload, Sparkles, Download } from "lucide-react";

const features = [
  {
    icon: Upload,
    title: "上传字幕",
    description: "支持 SRT 格式，自动解析时间轴和文字内容",
  },
  {
    icon: Sparkles,
    title: "AI 智能分段",
    description: "大语言模型理解内容，自动识别主题边界",
  },
  {
    icon: Download,
    title: "透明视频",
    description: "生成 MOV 格式，直接叠加到任何视频上",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-20 md:py-28">
      <motion.div
        className="container mx-auto px-4 sm:px-6 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={viewportConfig}
        variants={staggerContainer}
      >
        <motion.div className="mx-auto max-w-2xl text-center" variants={fadeInUp}>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            三步完成，简单高效
          </h2>
          <p className="mt-3 text-muted-foreground">
            从字幕到章节进度条视频，只需 2 分钟
          </p>
        </motion.div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-8 sm:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="group text-center"
              variants={fadeInUp}
            >
              {/* Step number + icon */}
              <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20" />
                <feature.icon className="relative h-7 w-7 text-primary" />
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </span>
              </div>

              <h3 className="font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
