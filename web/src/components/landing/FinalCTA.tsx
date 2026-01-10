"use client";

/**
 * [INPUT]: 依赖 @/components/ui/button, framer-motion, lucide-react, @/lib/motion
 * [OUTPUT]: 对外提供 FinalCTA 组件
 * [POS]: Landing Page 最终号召区，简洁柔和的行动号召
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer, viewportConfig } from "@/lib/motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function FinalCTA() {
  return (
    <section className="border-t bg-muted/30 py-16 md:py-20">
      <motion.div
        className="container mx-auto px-4 sm:px-6 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={viewportConfig}
        variants={staggerContainer}
      >
        <div className="mx-auto max-w-2xl text-center">
          <motion.h2
            className="text-2xl font-bold tracking-tight sm:text-3xl"
            variants={fadeInUp}
          >
            让观众一眼看清你的视频结构
          </motion.h2>
          <motion.p
            className="mt-3 text-muted-foreground"
            variants={fadeInUp}
          >
            CLI 免费开源，Web 服务按需付费
          </motion.p>
          <motion.div className="mt-8" variants={fadeInUp}>
            <Button size="lg" className="h-11 gap-2 px-8" asChild>
              <Link href="/app">
                开始使用
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
