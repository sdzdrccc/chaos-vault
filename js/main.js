import { esc, SKILLS, MEDIA } from "./config.js";
import {
  loadLocal,
  saveLocal,
  resetLocal,
  defaultLocalIfMissing,
  hasUserData,
} from "./state.js";
import {
  supportsFS,
  hasDir,
  getDirHandle,
  connectFolder,
  writeAllToFolder,
  loadFromFolderHandle,
  loadFromContentTree,
  exportJson,
  exportMarkdownBundle,
} from "./storage.js";
import { initModal } from "./ui/modal.js";
import { renderLlm, bindLlm } from "./ui/llm.js";
import {
  renderSidebar,
  renderTopbar,
  renderHome,
  bindHome,
  renderInbox,
  bindInbox,
  renderSkill,
  bindSkill,
  renderMedia,
  bindMedia,
} from "./ui/views.js";

const ctx = {
  state: null,
  route: { kind: "home", name: null },
  skillTab: "材料",
  mediaTab: "doing",
  query: "",
  hasDir,
  syncLabel() {
    if (!supportsFS) return "仅本地缓存 · 可静态部署";
    if (hasDir()) return `已连接 ${getDirHandle().name}`;
    return "未连接文件夹 · content 可读";
  },
  persist() {
    saveLocal(this.state);
    this.render();
    if (hasDir()) {
      writeAllToFolder(this.state).catch((e) => console.warn("write folder", e));
    }
  },
  render,
  bindSidebarActions(el) {
    el.querySelector("#btn-connect")?.addEventListener("click", async () => {
      try {
        await connectFolder();
        this.state = await loadFromFolderHandle();
        saveLocal(this.state);
        this.render();
      } catch (e) {
        if (e?.name === "AbortError") return;
        alert(e?.message || String(e));
      }
    });
    el.querySelector("#btn-sync")?.addEventListener("click", async () => {
      try {
        if (!hasDir()) await connectFolder();
        await writeAllToFolder(this.state);
        this.render();
        alert("已写回 Markdown");
      } catch (e) {
        if (e?.name === "AbortError") return;
        alert(e?.message || String(e));
      }
    });
    el.querySelector("#btn-reload")?.addEventListener("click", async () => {
      if (!confirm("从 Markdown 重载会覆盖当前界面状态，继续？")) return;
      try {
        this.state = hasDir() ? await loadFromFolderHandle() : await loadFromContentTree();
        saveLocal(this.state);
        this.render();
      } catch (e) {
        alert(e?.message || String(e));
      }
    });
    el.querySelector("#btn-export-md")?.addEventListener("click", () => exportMarkdownBundle(this.state));
    el.querySelector("#btn-export-json")?.addEventListener("click", () => exportJson(this.state));
    el.querySelector("#btn-import-json")?.addEventListener("click", () => {
      document.getElementById("import-file").click();
    });
  },
};

function render() {
  const { route } = ctx;
  if (route.kind === "home") {
    renderSidebar(ctx);
    renderTopbar(ctx, "首页", hasDir() ? `已连接 ${getDirHandle().name}` : "材料归位 · 清单勾选");
    document.getElementById("content").innerHTML = renderHome(ctx);
    bindHome(ctx);
    return;
  }
  if (route.kind === "inbox") {
    renderSidebar(ctx);
    renderTopbar(ctx, "收集箱", "先扔进来，再归到技能或媒体");
    document.getElementById("content").innerHTML = renderInbox(ctx);
    bindInbox(ctx);
    return;
  }
  if (route.kind === "skill") {
    renderSidebar(ctx);
    if (route.name === "大模型") {
      renderTopbar(ctx, "大模型", "API 平台与中转站收藏");
      document.getElementById("content").innerHTML = renderLlm(ctx);
      bindLlm(ctx);
      return;
    }
    renderTopbar(ctx, route.name, "总览 · 材料 · 清单");
    document.getElementById("content").innerHTML = renderSkill(ctx);
    bindSkill(ctx);
    return;
  }
  if (route.kind === "media") {
    renderSidebar(ctx);
    renderTopbar(ctx, route.name, route.name === "游戏" ? "想玩 / 在玩 / 通关" : "想看 / 在看 / 看完");
    document.getElementById("content").innerHTML = renderMedia(ctx);
    bindMedia(ctx);
  }
}

document.getElementById("import-file").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const local = loadLocal();
    ctx.state = {
      ...local,
      ...data,
      skills: { ...local.skills, ...(data.skills || {}) },
      media: { ...local.media, ...(data.media || {}) },
      home: { ...local.home, ...(data.home || {}) },
    };
    ctx.persist();
    alert("导入完成");
  } catch (err) {
    alert("导入失败：" + err.message);
  }
  e.target.value = "";
});

function mediaIsEmpty(m) {
  return !m || (!(m.want?.length || m.doing?.length || m.done?.length));
}

function skillIsEmpty(s) {
  return (
    !s ||
    (!s.phase &&
      !s.note &&
      !s.goals?.length &&
      !s.materials?.length &&
      !s.checklist?.length &&
      !s.archive?.length &&
      !s.llmPlatforms?.length)
  );
}

function syncLlmPlatforms(localList, treeList) {
  const byName = new Map((localList || []).map((p) => [p.name, { ...p }]));
  for (const t of treeList || []) {
    const cur = byName.get(t.name);
    if (!cur) {
      byName.set(t.name, { ...t });
      continue;
    }
    // fill schema fields from curated content; keep local keys/edits
    if (!cur.region) cur.region = t.region || "国外";
    if (!cur.site) cur.site = t.site || "";
    if (!cur.baseUrl) cur.baseUrl = t.baseUrl || "";
    if (!cur.type || cur.type === "其他") cur.type = t.type || cur.type;
    if (!cur.models?.length && t.models?.length) cur.models = [...t.models];
    // if local never had region (old cache treated everything as 国外),
    // prefer tree region when local is default 国外 and tree says 国内
    if (t.region && cur.region === "国外" && t.region === "国内" && !cur.__regionTouched) {
      cur.region = t.region;
    }
    byName.set(t.name, cur);
  }
  return [...byName.values()];
}

function seedMissingDomains(local, fromTree) {
  if (!fromTree) return local;
  const state = {
    ...local,
    media: { ...local.media },
    skills: { ...local.skills },
  };
  for (const m of MEDIA) {
    if (mediaIsEmpty(state.media[m]) && !mediaIsEmpty(fromTree.media?.[m])) {
      state.media[m] = fromTree.media[m];
    }
  }
  for (const s of SKILLS) {
    if (skillIsEmpty(state.skills[s]) && !skillIsEmpty(fromTree.skills?.[s])) {
      state.skills[s] = fromTree.skills[s];
      continue;
    }
    if (s === "大模型") {
      const treePlats = fromTree.skills?.[s]?.llmPlatforms || [];
      const localPlats = state.skills[s]?.llmPlatforms || [];
      if (treePlats.length) {
        state.skills[s] = {
          ...state.skills[s],
          llmPlatforms: syncLlmPlatforms(localPlats, treePlats),
        };
      }
    }
  }
  return state;
}

async function boot() {
  initModal();

  let fromTree = null;
  try {
    fromTree = await loadFromContentTree();
  } catch {
    fromTree = null;
  }

  const local = loadLocal();
  // Prefer live content/ unless the user already has real edits in localStorage
  if (hasUserData(local)) {
    ctx.state = seedMissingDomains(local, fromTree);
    saveLocal(ctx.state);
  } else if (fromTree) {
    ctx.state = fromTree;
    saveLocal(ctx.state);
  } else {
    ctx.state = defaultLocalIfMissing();
  }

  render();
}

boot().catch((e) => {
  document.getElementById("content").innerHTML = `<div class="empty">启动失败：${esc(e.message)}</div>`;
});

window.__workbench = { ctx, resetLocal };
