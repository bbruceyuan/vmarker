"use client";

/**
 * [INPUT]: 依赖 @/components/ui/card, @/components/ui/button, @/components/ui/badge, framer-motion, lucide-react, @/lib/motion
 * [OUTPUT]: 对外提供 Pricing 组件
 * [POS]: Landing Page 定价区，简洁的双栏定价
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer, viewportConfig } from "@/lib/motion";
import { Check, Github, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "CLI 开源版",
    price: "免费",
    description: "开发者自部署",
    features: ["完整功能", "本地运行", "自带 API Key", "无限使用"],
    cta: "GitHub",
    ctaIcon: Github,
    highlighted: false,
  },
  {
    name: "Web 版",
    price: "¥3",
    period: "/次",
    description: "即开即用",
    features: ["AI 智能分段", "可视化编辑", "多套配色", "优先支持"],
    cta: "开始使用",
    ctaIcon: ArrowRight,
    highlighted: true,
  },
];

export default function Pricing() {
  return (
    <section className="bg-muted/30 py-20 md:py-28">
      <motion.div
        className="container mx-auto px-4 sm:px-6 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={viewportConfig}
        variants={staggerContainer}
      >
        <motion.div className="mx-auto max-w-2xl text-center" variants={fadeInUp}>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            简单透明的定价
          </h2>
          <p className="mt-3 text-muted-foreground">
            开源免费，或使用即开即用的 Web 服务
          </p>
        </motion.div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
          {plans.map((plan) => (
            <motion.div key={plan.name} variants={fadeInUp}>
              <Card
                className={`relative h-full ${
                  plan.highlighted ? "border-primary shadow-lg" : ""
                }`}
              >
                {plan.highlighted && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    推荐
                  </Badge>
                )}
                <CardHeader className="pb-4 text-center">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                  <div className="mt-3">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-muted-foreground">{plan.period}</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-6 w-full gap-2"
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    {plan.cta}
                    <plan.ctaIcon className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
