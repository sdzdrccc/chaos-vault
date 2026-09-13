import { LLM_PLATFORM_TYPES, LLM_REGIONS, uid, esc } from "../config.js";
import { openModal } from "./modal.js";

function ensurePlatforms(ctx) {
  const sk = ctx.state.skills["大模型"];
  if (!sk.llmPlatforms) sk.llmPlatforms = [];
  return sk.llmPlatforms;
}

function ensureFilter(ctx) {
  if (!ctx.llmFilter) ctx.llmFilter = { region: "全部", type: "全部" };
  return ctx.llmFilter;
}

function modelsToText(models) {
  return (models || []).join("\n");
}

function textToModels(text) {
  return String(text || "")
    .split(/\r?\n|,|，/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function linkCell(url, label) {
  if (!url) return "—";
  return `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label || url)}</a>`;
}

function maskKey(key) {
  if (!key) return "—";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 3)}…${key.slice(-4)}`;
}

function filterBar(ctx) {
  const f = ensureFilter(ctx);
  const regions = ["全部", ...LLM_REGIONS];
  const types = ["全部", "官方", "中转", "聚合"];
  const options = (list, current) =>
    list
      .map((v) => `<option value="${esc(v)}" ${v === current ? "selected" : ""}>${esc(v)}</option>`)
      .join("");
  return `
    <div class="filter-bar">
      <label class="filter-field">
        <span class="filter-label">地区</span>
        <select id="llm-filter-region">${options(regions, f.region)}</select>
      </label>
      <label class="filter-field">
        <span class="filter-label">类型</span>
        <select id="llm-filter-type">${options(types, f.type)}</select>
      </label>
    </div>
  `;
}

export function renderLlm(ctx) {
  const f = ensureFilter(ctx);
  const platforms = ensurePlatforms(ctx).filter((p) => {
    if (f.region !== "全部" && (p.region || "国外") !== f.region) return false;
    if (f.type !== "全部" && (p.type || "其他") !== f.type) return false;
    if (!ctx.query.trim()) return true;
    const q = ctx.query.trim().toLowerCase();
    return [p.name, p.type, p.region, p.baseUrl, p.site, p.note, ...(p.models || [])]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const rows = platforms.length
    ? platforms
        .map(
          (p) => `
      <tr>
        <td><strong>${esc(p.name)}</strong></td>
        <td><span class="chip">${esc(p.region || "国外")}</span></td>
        <td><span class="chip">${esc(p.type)}</span></td>
        <td class="url-cell">${linkCell(p.baseUrl)}</td>
        <td class="url-cell">${linkCell(p.site, "官方站")}</td>
        <td class="key-cell">
          <code title="${p.key ? "已保存" : "未填写"}">${esc(maskKey(p.key))}</code>
          ${p.key ? `<button type="button" class="btn sm" data-llm-copy="${p.id}">复制</button>` : ""}
        </td>
        <td>
          <div class="chip-row">
            ${(p.models || []).length
              ? (p.models || []).map((m) => `<span class="chip">${esc(m)}</span>`).join("")
              : `<span class="chip">—</span>`}
          </div>
        </td>
        <td class="note-cell">${esc(p.note || "")}</td>
        <td>
          <div class="row-actions">
            <button type="button" class="btn sm" data-llm-edit="${p.id}">编辑</button>
            <button type="button" class="icon-btn" data-llm-del="${p.id}">×</button>
          </div>
        </td>
      </tr>`,
        )
        .join("")
    : `<tr><td colspan="9"><div class="empty">没有符合筛选的平台。可改筛选或点「新增平台」。</div></td></tr>`;

  return `
    <div class="card">
      <div class="section-head">
        <div>
          <h3>API 平台 / 中转站</h3>
          <p>共 ${ensurePlatforms(ctx).length} 条，当前显示 ${platforms.length} 条</p>
        </div>
        <button type="button" class="btn sm primary" id="llm-add">新增平台</button>
      </div>
      ${filterBar(ctx)}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="min-width:110px">名称</th>
              <th style="width:64px">地区</th>
              <th style="width:64px">类型</th>
              <th style="min-width:140px">Base URL</th>
              <th style="min-width:80px">官方站</th>
              <th style="min-width:110px">Key</th>
              <th style="min-width:130px">模型</th>
              <th style="min-width:80px">备注</th>
              <th style="width:96px"></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
    <div class="section note">
      Key → <code>平台.keys.local.md</code>（gitignore）。接口 → <code>平台.md</code>（含 <code>region</code> 国内/国外）。
    </div>
  `;
}

function openPlatformModal(ctx, existing) {
  const isEdit = Boolean(existing);
  openModal({
    title: isEdit ? "编辑平台" : "新增平台",
    hint: "模型列表：一行一个，或用逗号分隔。Key 仅存本地 keys 文件。",
    fields: [
      { name: "name", label: "名称", value: existing?.name || "", placeholder: "OpenAI / 某某中转" },
      {
        name: "type",
        label: "类型",
        type: "select",
        options: LLM_PLATFORM_TYPES,
        value: existing?.type || "官方",
      },
      {
        name: "region",
        label: "地区",
        type: "select",
        options: LLM_REGIONS,
        value: existing?.region || "国外",
      },
      {
        name: "baseUrl",
        label: "Base URL（接口）",
        value: existing?.baseUrl || "",
        placeholder: "https://api.example.com/v1",
      },
      {
        name: "site",
        label: "官方 API 网站",
        value: existing?.site || "",
        placeholder: "https://platform.example.com",
      },
      {
        name: "key",
        label: "API Key（本地）",
        value: existing?.key || "",
        placeholder: "sk-...",
      },
      {
        name: "models",
        label: "模型列表",
        type: "textarea",
        value: modelsToText(existing?.models),
        placeholder: "gpt-4o\nclaude-3-5-sonnet",
      },
      { name: "note", label: "备注", type: "textarea", value: existing?.note || "" },
    ],
    onSubmit(d) {
      if (!d.name.trim()) return;
      const list = ensurePlatforms(ctx);
      const payload = {
        id: existing?.id || uid(),
        name: d.name.trim(),
        type: d.type,
        region: d.region || "国外",
        baseUrl: d.baseUrl.trim(),
        site: d.site.trim(),
        key: (d.key || "").trim(),
        models: textToModels(d.models),
        note: d.note.trim(),
      };
      if (isEdit) {
        const i = list.findIndex((x) => x.id === existing.id);
        if (i >= 0) list[i] = payload;
        else list.push(payload);
      } else {
        list.unshift(payload);
      }
      ctx.persist();
    },
  });
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

export function bindLlm(ctx) {
  const f = ensureFilter(ctx);

  document.getElementById("llm-filter-region")?.addEventListener("change", (e) => {
    f.region = e.target.value;
    ctx.render();
  });
  document.getElementById("llm-filter-type")?.addEventListener("change", (e) => {
    f.type = e.target.value;
    ctx.render();
  });

  document.getElementById("llm-add")?.addEventListener("click", () => openPlatformModal(ctx, null));

  document.querySelectorAll("[data-llm-edit]").forEach((btn) => {
    btn.onclick = () => {
      const p = ensurePlatforms(ctx).find((x) => x.id === btn.dataset.llmEdit);
      if (p) openPlatformModal(ctx, p);
    };
  });

  document.querySelectorAll("[data-llm-copy]").forEach((btn) => {
    btn.onclick = async () => {
      const p = ensurePlatforms(ctx).find((x) => x.id === btn.dataset.llmCopy);
      if (!p?.key) return;
      const ok = await copyText(p.key);
      btn.textContent = ok ? "已复制" : "失败";
      setTimeout(() => {
        btn.textContent = "复制";
      }, 1200);
    };
  });

  document.querySelectorAll("[data-llm-del]").forEach((btn) => {
    btn.onclick = () => {
      const sk = ctx.state.skills["大模型"];
      sk.llmPlatforms = (sk.llmPlatforms || []).filter((x) => x.id !== btn.dataset.llmDel);
      ctx.persist();
    };
  });
}
