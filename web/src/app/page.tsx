/**
 * [INPUT]: 依赖 @/components/landing/*
 * [OUTPUT]: 对外提供 Home 页面组件
 * [POS]: 首页，组合 Landing Page Sections
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import {
  HeroSection,
  FeaturesSection,
  Pricing,
  FAQ,
  FinalCTA,
} from "@/components/landing";

export default function Home() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <Pricing />
      <FAQ />
      <FinalCTA />
    </>
  );
}
