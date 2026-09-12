import { esc } from "./config.js";
import { loadLocal, saveLocal, resetLocal, defaultLocalIfMissing } from "./state.js";
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
    renderTopbar(ctx, route.name, "总览 · 材料 · 清单");
    document.getElementById("content").innerHTML = renderSkill(ctx);
    bindSkill(ctx);
    return;
  }
  if (route.kind === "media") {
    renderSidebar(ctx);
    renderTopbar(ctx, route.name, "想看 / 在看 / 看完");
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

async function boot() {
  initModal();

  // 1) localStorage session wins if present
  const local = loadLocal();
  if (localStorage.getItem("learning-workbench-v3")) {
    ctx.state = local;
  } else {
    // 2) first visit: try content/ over HTTP, else empty defaults
    try {
      ctx.state = await loadFromContentTree();
      saveLocal(ctx.state);
    } catch {
      ctx.state = defaultLocalIfMissing();
    }
  }

  render();
}

boot().catch((e) => {
  document.getElementById("content").innerHTML = `<div class="empty">启动失败：${esc(e.message)}</div>`;
});

window.__workbench = { ctx, resetLocal };
