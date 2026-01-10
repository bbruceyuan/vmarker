"use client";

/**
 * [INPUT]: 依赖 @/components/ui/accordion, framer-motion, @/lib/motion
 * [OUTPUT]: 对外提供 FAQ 组件
 * [POS]: Landing Page 常见问题区，简洁的 Accordion
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer, viewportConfig } from "@/lib/motion";

const faqs = [
  {
    question: "支持哪些字幕格式？",
    answer: "目前支持 SRT 格式。其他格式可先用在线工具转换。",
  },
  {
    question: "AI 分段准确吗？",
    answer: "基于大语言模型理解语义，准确率约 85%。可手动调整。",
  },
  {
    question: "生成的视频怎么用？",
    answer:
      "在剪辑软件中将透明视频放到最上层轨道，会自动叠加到原视频上。",
  },
  {
    question: "支持多长的视频？",
    answer: "Web 版最长 2 小时，CLI 版无限制。",
  },
  {
    question: "CLI 需要付费吗？",
    answer: "完全免费开源，需自备 AI 模型 API Key。",
  },
];

export default function FAQ() {
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
            常见问题
          </h2>
        </motion.div>

        <motion.div className="mx-auto mt-10 max-w-2xl" variants={fadeInUp}>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-sm">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </motion.div>
    </section>
  );
}
