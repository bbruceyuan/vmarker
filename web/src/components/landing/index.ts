/**
 * [INPUT]: 依赖 landing 目录下组件
 * [OUTPUT]: 对外提供所有 Landing Page 组件的统一导出
 * [POS]: landing 目录入口，提供命名导出
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export { default as HeroSection } from "./HeroSection";
export { default as FeaturesSection } from "./FeaturesSection";
export { default as Pricing } from "./Pricing";
export { default as FAQ } from "./FAQ";
export { default as FinalCTA } from "./FinalCTA";
