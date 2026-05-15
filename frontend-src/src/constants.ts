import type { PageId, RealmType } from "./types/tudou";

export interface WorkflowStep {
  id: number;
  title: string;
  desc: string;
  slug: string;
}

export interface NavItem {
  id: PageId;
  label: string;
  eyebrow: string;
  realm: RealmType;
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  { id: 1, title: "破题", desc: "商业钩子、核心冲突、类型承诺", slug: "concept" },
  { id: 2, title: "人物", desc: "主角欲望、反派压力与关系张力", slug: "characters" },
  { id: 3, title: "世界", desc: "规则、场域、代价与视觉母题", slug: "world" },
  { id: 4, title: "大纲", desc: "三幕推进与关键转折", slug: "outline" },
  { id: 5, title: "分场", desc: "场景节拍与情绪曲线", slug: "scenes" },
  { id: 6, title: "对白", desc: "角色声音、潜台词与信息密度", slug: "dialogue" },
  { id: 7, title: "成稿", desc: "完整剧本文本与格式收束", slug: "script" },
  { id: 8, title: "医生", desc: "结构自检、漏洞扫描、修改建议", slug: "doctor" },
];

export const NAV_ITEMS: NavItem[] = [
  { id: "hub", label: "灵感枢纽", eyebrow: "Genesis", realm: "cloudcity" },
  { id: "workflow", label: "剧本工作流", eyebrow: "Screenplay", realm: "valley" },
  { id: "assets", label: "资产锻造", eyebrow: "Assets", realm: "samurai" },
  { id: "image", label: "图像提示词", eyebrow: "Image Prompt", realm: "samurai" },
  { id: "video", label: "视频提示词", eyebrow: "Video Prompt", realm: "valley" },
  { id: "seedance", label: "Seedance", eyebrow: "Shot Units", realm: "valley" },
  { id: "projects", label: "项目库", eyebrow: "Archive", realm: "cloudcity" },
  { id: "settings", label: "本地设置", eyebrow: "Local Core", realm: "cloudcity" },
];
