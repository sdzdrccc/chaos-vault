import { CONTENT_BASE, SKILLS, MEDIA, defaultState } from "./config.js";
import {
  parseHome,
  parseInbox,
  parseSkillOverview,
  parseMaterials,
  parseChecklist,
  parseMedia,
  serializeHome,
  serializeInbox,
  serializeSkillOverview,
  serializeSkillMaterials,
  serializeSkillChecklist,
  serializeMedia,
} from "./markdown.js";

export const supportsFS =
  typeof window !== "undefined" &&
  "showDirectoryPicker" in window &&
  window.isSecureContext;

let dirHandle = null;

export function getDirHandle() {
  return dirHandle;
}

export function setDirHandle(handle) {
  dirHandle = handle;
}

export function hasDir() {
  return Boolean(dirHandle);
}

export async function fetchText(path) {
  const encoded = path
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  const url = `${CONTENT_BASE}/${encoded}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.text();
}

export async function loadFromContentTree() {
  const state = defaultState();

  const tasks = [];
  const load = async (fn) => fn();

  tasks.push(
    load(async () => {
      try {
        state.home = parseHome(await fetchText("00-首页.md"));
      } catch {
        /* keep default */
      }
    }),
  );
  tasks.push(
    load(async () => {
      try {
        state.inbox = parseInbox(await fetchText("03-收集箱.md"));
      } catch {
        /* keep default */
      }
    }),
  );

  for (const s of SKILLS) {
    tasks.push(
      load(async () => {
        const skill = state.skills[s];
        try {
          Object.assign(skill, parseSkillOverview(await fetchText(`01-技能/${s}/00-总览.md`)));
        } catch {
          /* optional */
        }
        try {
          skill.materials = parseMaterials(await fetchText(`01-技能/${s}/材料.md`));
        } catch {
          /* optional */
        }
        try {
          Object.assign(skill, parseChecklist(await fetchText(`01-技能/${s}/清单.md`)));
        } catch {
          /* optional */
        }
      }),
    );
  }

  for (const m of MEDIA) {
    tasks.push(
      load(async () => {
        try {
          state.media[m] = parseMedia(await fetchText(`02-媒体/${m}.md`));
        } catch {
          /* optional */
        }
      }),
    );
  }

  await Promise.all(tasks);
  return state;
}

export function serializeAll(state) {
  const files = {
    "00-首页.md": serializeHome(state),
    "03-收集箱.md": serializeInbox(state),
  };
  for (const s of SKILLS) {
    files[`01-技能/${s}/00-总览.md`] = serializeSkillOverview(s, state.skills[s]);
    files[`01-技能/${s}/材料.md`] = serializeSkillMaterials(s, state.skills[s]);
    files[`01-技能/${s}/清单.md`] = serializeSkillChecklist(s, state.skills[s]);
  }
  for (const m of MEDIA) {
    files[`02-媒体/${m}.md`] = serializeMedia(m, state.media[m]);
  }
  return files;
}

export async function connectFolder() {
  if (!supportsFS) {
    throw new Error("当前环境不支持文件夹授权，请用本地 HTTP 服务打开本页");
  }
  dirHandle = await window.showDirectoryPicker({
    id: "learning-workbench",
    mode: "readwrite",
    startIn: "documents",
  });
  return dirHandle;
}

async function ensureDir(root, parts) {
  let cur = root;
  for (const p of parts) {
    cur = await cur.getDirectoryHandle(p, { create: true });
  }
  return cur;
}

async function writeFile(dir, name, text) {
  const fh = await dir.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(text);
  await w.close();
}

export async function writeAllToFolder(state) {
  if (!dirHandle) throw new Error("尚未连接文件夹");
  const files = serializeAll(state);
  for (const [rel, text] of Object.entries(files)) {
    const parts = rel.split("/");
    const name = parts.pop();
    const dir = await ensureDir(dirHandle, parts);
    await writeFile(dir, name, text);
  }
}

export async function loadFromFolderHandle() {
  if (!dirHandle) throw new Error("尚未连接文件夹");
  const state = defaultState();

  async function read(rel) {
    const parts = rel.split("/");
    const name = parts.pop();
    let cur = dirHandle;
    for (const p of parts) {
      cur = await cur.getDirectoryHandle(p);
    }
    const fh = await cur.getFileHandle(name);
    return fh.getFile().then((f) => f.text());
  }

  try {
    state.home = parseHome(await read("00-首页.md"));
  } catch {
    /* ignore */
  }
  try {
    state.inbox = parseInbox(await read("03-收集箱.md"));
  } catch {
    /* ignore */
  }
  for (const s of SKILLS) {
    try {
      Object.assign(state.skills[s], parseSkillOverview(await read(`01-技能/${s}/00-总览.md`)));
    } catch {
      /* ignore */
    }
    try {
      state.skills[s].materials = parseMaterials(await read(`01-技能/${s}/材料.md`));
    } catch {
      /* ignore */
    }
    try {
      Object.assign(state.skills[s], parseChecklist(await read(`01-技能/${s}/清单.md`)));
    } catch {
      /* ignore */
    }
  }
  for (const m of MEDIA) {
    try {
      state.media[m] = parseMedia(await read(`02-媒体/${m}.md`));
    } catch {
      /* ignore */
    }
  }
  return state;
}

export function download(filename, text, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportJson(state) {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const day = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  download(`学习工作台_备份_${day}.json`, JSON.stringify(state, null, 2), "application/json");
}

export function exportMarkdownBundle(state) {
  const files = serializeAll(state);
  // single combined file for easy download without zip dependency
  const parts = [
    "# 学习工作台导出",
    "",
    `导出时间：${new Date().toLocaleString()}`,
    "",
    "将下列内容按路径拆回 `content/` 即可恢复。",
    "",
  ];
  for (const [rel, text] of Object.entries(files)) {
    parts.push(`---`, `<!-- path: content/${rel} -->`, "", text, "");
  }
  download("学习工作台_content导出.md", parts.join("\n"));
}
