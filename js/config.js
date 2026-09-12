export const SKILLS = ["大模型", "日语", "虚幻引擎", "声乐", "六爻", "健身", "素描"];
export const MEDIA = ["动漫", "书籍", "电影", "小说", "音乐"];
export const MATERIAL_TYPES = [
  "课程/视频",
  "书籍/PDF",
  "文章/笔记",
  "工具/网站",
  "练习参考",
  "其他",
];

export const STORAGE_KEY = "learning-workbench-v3";
export const CONTENT_BASE = "./content";

export function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

export function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function emptySkill() {
  return { phase: "", goals: [], note: "", materials: [], checklist: [], archive: [] };
}

export function emptyMedia() {
  return { want: [], doing: [], done: [] };
}

export function defaultState() {
  const skills = Object.fromEntries(SKILLS.map((s) => [s, emptySkill()]));
  const media = Object.fromEntries(MEDIA.map((m) => [m, emptyMedia()]));
  return {
    skills,
    media,
    inbox: [],
    home: { continues: [] },
    updatedAt: new Date().toISOString(),
  };
}
