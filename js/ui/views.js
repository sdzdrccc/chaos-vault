import { SKILLS, MEDIA, MATERIAL_TYPES, uid, esc, today } from "../config.js";
import { homeStats } from "../markdown.js";
import { openModal } from "./modal.js";

function go(ctx, kind, name = null) {
  ctx.route = { kind, name };
  ctx.skillTab = "材料";
  ctx.mediaTab = name === "游戏" ? "want" : "doing";
  ctx.render();
}

export function renderSidebar(ctx) {
  const el = document.getElementById("sidebar");
  const skillHtml = SKILLS.map(
    (s) =>
      `<button type="button" class="nav-item ${ctx.route.kind === "skill" && ctx.route.name === s ? "active" : ""}" data-nav="skill" data-name="${esc(s)}">${esc(s)} <span class="count">${skillOpenCount(ctx.state, s)}</span></button>`,
  ).join("");
  const mediaHtml = MEDIA.map(
    (m) =>
      `<button type="button" class="nav-item ${ctx.route.kind === "media" && ctx.route.name === m ? "active" : ""}" data-nav="media" data-name="${esc(m)}">${esc(m)} <span class="count">${mediaOpenCount(ctx.state, m)}</span></button>`,
  ).join("");

  const syncLabel = ctx.syncLabel();
  el.innerHTML = `
    <div class="brand">
      <h1>学习工作台</h1>
      <p>${esc(syncLabel)}</p>
    </div>
    <button type="button" class="nav-item ${ctx.route.kind === "home" ? "active" : ""}" data-nav="home">首页</button>
    <button type="button" class="nav-item ${ctx.route.kind === "inbox" ? "active" : ""}" data-nav="inbox">收集箱 <span class="count">${ctx.state.inbox.length}</span></button>
    <div class="nav-group"><div class="nav-label">技能</div>${skillHtml}</div>
    <div class="nav-group"><div class="nav-label">媒体</div>${mediaHtml}</div>
    <div class="sidebar-foot">
      <button type="button" class="ghost-btn primaryish" id="btn-connect">连接 content 文件夹</button>
      <button type="button" class="ghost-btn" id="btn-sync">写回 Markdown</button>
      <button type="button" class="ghost-btn" id="btn-reload">从 Markdown 重载</button>
      <button type="button" class="ghost-btn" id="btn-export-md">导出 content 捆绑</button>
      <button type="button" class="ghost-btn" id="btn-export-json">导出 JSON</button>
      <button type="button" class="ghost-btn" id="btn-import-json">导入 JSON</button>
    </div>
  `;

  el.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.onclick = () => {
      const kind = btn.dataset.nav;
      ctx.route = { kind, name: btn.dataset.name || null };
      ctx.skillTab = "材料";
      ctx.mediaTab = btn.dataset.name === "游戏" ? "want" : "doing";
      ctx.render();
    };
  });
  ctx.bindSidebarActions(el);
}

export function renderTopbar(ctx, title, sub) {
  document.getElementById("topbar").innerHTML = `
    <div>
      <h2>${esc(title)}</h2>
      <p class="sub">${esc(sub)}</p>
    </div>
    <div class="actions">
      <span class="sync-pill ${ctx.hasDir() ? "on" : ""}">${esc(ctx.syncLabel())}</span>
      <input class="search" id="search" type="search" placeholder="搜索标题 / 备注…" value="${esc(ctx.query)}" />
    </div>
  `;
  document.getElementById("search").addEventListener("input", (e) => {
    ctx.query = e.target.value;
    ctx.render();
  });
}

function skillOpenCount(state, name) {
  const s = state.skills[name];
  return s.materials.filter((m) => !m.done).length + s.checklist.filter((c) => !c.done).length;
}

function mediaOpenCount(state, name) {
  const m = state.media[name];
  return m.want.length + m.doing.length;
}

function matchQ(ctx, ...fields) {
  if (!ctx.query.trim()) return true;
  const q = ctx.query.trim().toLowerCase();
  return fields.some((f) => String(f ?? "").toLowerCase().includes(q));
}

export function renderHome(ctx) {
  const st = homeStats(ctx.state);
  const continues = ctx.state.home.continues.filter((c) =>
    matchQ(ctx, c.title, c.note, c.kind, c.name),
  );
  return `
    <div class="stat-row">
      <div class="stat"><div class="n">${st.inbox}</div><div class="l">收集箱待归</div></div>
      <div class="stat"><div class="n">${st.mat}</div><div class="l">未消化材料</div></div>
      <div class="stat"><div class="n">${st.todo}</div><div class="l">未完成清单</div></div>
      <div class="stat"><div class="n">${st.media}</div><div class="l">媒体在途</div></div>
    </div>
    <div class="section">
      <div class="section-head">
        <div><h3>最近要继续的</h3><p>手动维护 3–5 条即可</p></div>
        <button type="button" class="btn sm primary" id="add-continue">新增继续项</button>
      </div>
      <div class="list">
        ${continues.length ? continues.map((c) => `
          <div class="list-item">
            <div class="body">
              <div class="title">${esc(c.title)}</div>
              <div class="meta">${esc(c.kind)}${c.name ? " · " + esc(c.name) : ""}${c.note ? " · " + esc(c.note) : ""}</div>
            </div>
            <div class="row-actions">
              <button type="button" class="icon-btn" data-go-kind="${esc(c.kind)}" data-go-name="${esc(c.name || "")}">→</button>
              <button type="button" class="icon-btn" data-del-continue="${c.id}">×</button>
            </div>
          </div>`).join("") : `<div class="empty">还没有继续项</div>`}
      </div>
    </div>
    <div class="section">
      <div class="section-head"><div><h3>技能入口</h3></div></div>
      <div class="grid-3">
        ${SKILLS.filter((s) => matchQ(ctx, s, ctx.state.skills[s].phase, ctx.state.skills[s].note))
          .map((s) => {
            const sk = ctx.state.skills[s];
            const openM = sk.materials.filter((x) => !x.done).length;
            const openC = sk.checklist.filter((x) => !x.done).length;
            const doneG = sk.goals.filter((x) => x.done).length;
            const pct = sk.goals.length ? Math.round((doneG / sk.goals.length) * 100) : 0;
            const sub =
              s === "大模型"
                ? `API 平台 ${(sk.llmPlatforms || []).length} 个`
                : `${sk.phase || "未设阶段"} · 材料 ${openM} · 清单 ${openC}`;
            return `<button type="button" class="home-link" data-go-kind="skill" data-go-name="${esc(s)}">
              <div>
                <div class="t">${esc(s)}</div>
                <div class="d">${esc(sub)}</div>
                <div class="progress-bar"><i style="width:${pct}%"></i></div>
              </div>
              <span class="chip">打开</span>
            </button>`;
          }).join("")}
      </div>
    </div>
    <div class="section">
      <div class="section-head"><div><h3>媒体入口</h3></div></div>
      <div class="grid-3">
        ${MEDIA.filter((m) => matchQ(ctx, m)).map((m) => {
          const md = ctx.state.media[m];
          return `<button type="button" class="home-link" data-go-kind="media" data-go-name="${esc(m)}">
            <div>
              <div class="t">${esc(m)}</div>
              <div class="d">想 ${md.want.length} · 在 ${md.doing.length} · 完 ${md.done.length}</div>
            </div>
            <span class="chip">打开</span>
          </button>`;
        }).join("")}
      </div>
    </div>
    <div class="section">
      <div class="note">
        数据源是 <code>content/</code> 下的 Markdown。本地可用「连接 content 文件夹」写回；部署为静态站时通过 HTTP 读取 md。改动默认保存在浏览器 localStorage，可用 JSON / content 捆绑导出。
      </div>
    </div>
  `;
}

export function bindHome(ctx) {
  document.getElementById("add-continue")?.addEventListener("click", () => {
    openModal({
      title: "新增继续项",
      fields: [
        { name: "title", label: "标题" },
        { name: "kind", label: "类型", type: "select", options: ["技能", "媒体", "收集箱", "其他"] },
        { name: "name", label: "领域（可选）" },
        { name: "note", label: "备注（可选）" },
      ],
      onSubmit(d) {
        if (!d.title.trim()) return;
        ctx.state.home.continues.unshift({
          id: uid(),
          title: d.title.trim(),
          kind: d.kind,
          name: d.name.trim(),
          note: d.note.trim(),
        });
        ctx.persist();
      },
    });
  });
  document.querySelectorAll("[data-del-continue]").forEach((btn) => {
    btn.onclick = () => {
      ctx.state.home.continues = ctx.state.home.continues.filter((x) => x.id !== btn.dataset.delContinue);
      ctx.persist();
    };
  });
  document.querySelectorAll("[data-go-kind]").forEach((btn) => {
    btn.onclick = () => {
      const kind = btn.dataset.goKind;
      const name = btn.dataset.goName;
      if (kind === "收集箱" || kind === "inbox") go(ctx, "inbox");
      else if (kind === "技能" || kind === "skill") go(ctx, "skill", name || SKILLS[0]);
      else if (kind === "媒体" || kind === "media") go(ctx, "media", name || MEDIA[0]);
      else go(ctx, "home");
    };
  });
}

export function renderInbox(ctx) {
  const items = ctx.state.inbox.filter((x) => matchQ(ctx, x.text, x.target, x.date));
  return `
    <div class="section">
      <div class="section-head">
        <div><h3>待归档</h3><p>每周清一次</p></div>
        <button type="button" class="btn sm primary" id="inbox-add">扔进收集箱</button>
      </div>
      <div class="list">
        ${items.length ? items.map((x) => `
          <div class="list-item">
            <div class="body">
              <div class="title">${esc(x.text)}</div>
              <div class="meta">${esc(x.date)}${x.target ? " → 拟归：" + esc(x.target) : ""}</div>
            </div>
            <div class="row-actions">
              <button type="button" class="btn sm" data-inbox-file="${x.id}">归档</button>
              <button type="button" class="icon-btn" data-inbox-del="${x.id}">×</button>
            </div>
          </div>`).join("") : `<div class="empty">收集箱是空的</div>`}
      </div>
    </div>
  `;
}

export function bindInbox(ctx) {
  document.getElementById("inbox-add")?.addEventListener("click", () => {
    openModal({
      title: "扔进收集箱",
      fields: [
        { name: "text", label: "内容 / 链接", type: "textarea" },
        { name: "target", label: "拟归入（可选）" },
      ],
      onSubmit(d) {
        if (!d.text.trim()) return;
        ctx.state.inbox.unshift({
          id: uid(),
          text: d.text.trim(),
          target: d.target.trim(),
          date: today(),
        });
        ctx.persist();
      },
    });
  });
  document.querySelectorAll("[data-inbox-del]").forEach((btn) => {
    btn.onclick = () => {
      ctx.state.inbox = ctx.state.inbox.filter((x) => x.id !== btn.dataset.inboxDel);
      ctx.persist();
    };
  });
  document.querySelectorAll("[data-inbox-file]").forEach((btn) => {
    btn.onclick = () => {
      const item = ctx.state.inbox.find((x) => x.id === btn.dataset.inboxFile);
      if (!item) return;
      openModal({
        title: "归档到",
        fields: [
          {
            name: "destType",
            label: "去向",
            type: "select",
            options: ["技能材料", "技能清单", "媒体-想看", "媒体-在看", "媒体-看完"],
          },
          { name: "destName", label: "领域", type: "select", options: [...SKILLS, ...MEDIA] },
          { name: "note", label: "备注（可选）", value: item.target || "" },
        ],
        onSubmit(d) {
          const name = d.destName;
          const text = item.text.split("\n")[0].slice(0, 120);
          if (SKILLS.includes(name)) {
            if (d.destType === "技能清单") {
              ctx.state.skills[name].checklist.push({ id: uid(), text, done: false, note: d.note });
            } else {
              ctx.state.skills[name].materials.push({
                id: uid(),
                type: "其他",
                title: text,
                url: "",
                note: d.note,
                done: false,
              });
            }
          } else if (MEDIA.includes(name)) {
            const row = {
              id: uid(),
              title: text,
              progress: "",
              note: d.note,
              link: "",
              date: today(),
              rating: "",
              comment: "",
            };
            if (d.destType === "媒体-想看") ctx.state.media[name].want.push(row);
            else if (d.destType === "媒体-在看") ctx.state.media[name].doing.push(row);
            else ctx.state.media[name].done.push(row);
          }
          ctx.state.inbox = ctx.state.inbox.filter((x) => x.id !== item.id);
          ctx.persist();
        },
      });
    };
  });
}

export function renderSkill(ctx) {
  const name = ctx.route.name;
  const sk = ctx.state.skills[name];
  const tabs = ["总览", "材料", "清单"];
  let body = "";

  if (ctx.skillTab === "总览") {
    const goals = sk.goals.filter((g) => matchQ(ctx, g.text));
    body = `
      <div class="card">
        <div class="section-head">
          <div><h3>当前阶段</h3><p>阶段目标写这里，清单只服务当前阶段</p></div>
          <div class="actions">
            <button type="button" class="btn sm" id="edit-phase">编辑阶段</button>
            <button type="button" class="btn sm primary" id="add-goal">添加目标</button>
          </div>
        </div>
        <div style="font-size:15px;font-weight:600;margin:4px 0 12px">${esc(sk.phase || "尚未设定阶段")}</div>
        <div class="list">
          ${goals.length ? goals.map((g) => `
            <div class="list-item ${g.done ? "done" : ""}">
              <button type="button" class="tick ${g.done ? "on" : ""}" data-toggle-goal="${g.id}">${g.done ? "✓" : ""}</button>
              <div class="body"><div class="title">${esc(g.text)}</div></div>
              <div class="row-actions"><button type="button" class="icon-btn" data-del-goal="${g.id}">×</button></div>
            </div>`).join("") : `<div class="empty">还没有阶段目标</div>`}
        </div>
      </div>
      <div class="card section">
        <div class="section-head"><div><h3>备注</h3></div><button type="button" class="btn sm" id="edit-note">编辑</button></div>
        <div class="note">${esc(sk.note || "可以写每周投入节奏、注意事项等。")}</div>
      </div>`;
  } else if (ctx.skillTab === "材料") {
    const mats = sk.materials.filter((m) => matchQ(ctx, m.title, m.note, m.type, m.url));
    body = `
      <div class="card">
        <div class="section-head">
          <div><h3>材料</h3><p>勾选表示看过/用过</p></div>
          <button type="button" class="btn sm primary" id="add-mat">新增材料</button>
        </div>
        <div class="list">
          ${mats.length ? mats.map((m) => `
            <div class="list-item ${m.done ? "done" : ""}">
              <button type="button" class="tick ${m.done ? "on" : ""}" data-toggle-mat="${m.id}">${m.done ? "✓" : ""}</button>
              <div class="body">
                <div class="title">${m.url ? `<a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.title)}</a>` : esc(m.title)}</div>
                <div class="meta"><span class="chip">${esc(m.type)}</span>${m.note ? " " + esc(m.note) : ""}</div>
              </div>
              <div class="row-actions">
                <button type="button" class="icon-btn" data-edit-mat="${m.id}">✎</button>
                <button type="button" class="icon-btn" data-del-mat="${m.id}">×</button>
              </div>
            </div>`).join("") : `<div class="empty">还没有材料</div>`}
        </div>
      </div>`;
  } else {
    const list = sk.checklist.filter((c) => matchQ(ctx, c.text, c.note));
    const arch = sk.archive.filter((c) => matchQ(ctx, c.text, c.note));
    body = `
      <div class="card">
        <div class="section-head">
          <div><h3>当前清单</h3></div>
          <button type="button" class="btn sm primary" id="add-check">新增事项</button>
        </div>
        <div class="list">
          ${list.length ? list.map((c) => `
            <div class="list-item ${c.done ? "done" : ""}">
              <button type="button" class="tick ${c.done ? "on" : ""}" data-toggle-check="${c.id}">${c.done ? "✓" : ""}</button>
              <div class="body">
                <div class="title">${esc(c.text)}</div>
                ${c.note ? `<div class="meta">${esc(c.note)}</div>` : ""}
              </div>
              <div class="row-actions">
                <button type="button" class="btn sm" data-archive="${c.id}">归档</button>
                <button type="button" class="icon-btn" data-del-check="${c.id}">×</button>
              </div>
            </div>`).join("") : `<div class="empty">清单是空的</div>`}
        </div>
      </div>
      <div class="card section">
        <div class="section-head"><div><h3>已完成归档</h3></div></div>
        <div class="list">
          ${arch.length ? arch.map((c) => `
            <div class="list-item done">
              <div class="tick on">✓</div>
              <div class="body">
                <div class="title">${esc(c.text)}</div>
                ${c.date ? `<div class="meta">${esc(c.date)}</div>` : ""}
              </div>
              <div class="row-actions"><button type="button" class="icon-btn" data-del-arch="${c.id}">×</button></div>
            </div>`).join("") : `<div class="empty">归档区为空</div>`}
        </div>
      </div>`;
  }

  return `<div class="tabs">${tabs
    .map((t) => `<button type="button" class="tab ${t === ctx.skillTab ? "active" : ""}" data-skill-tab="${t}">${t}</button>`)
    .join("")}</div>${body}`;
}

export function bindSkill(ctx) {
  const sk = ctx.state.skills[ctx.route.name];
  document.querySelectorAll("[data-skill-tab]").forEach((b) => {
    b.onclick = () => {
      ctx.skillTab = b.dataset.skillTab;
      ctx.render();
    };
  });
  document.getElementById("edit-phase")?.addEventListener("click", () => {
    openModal({
      title: "编辑阶段",
      fields: [
        { name: "phase", label: "当前阶段", value: sk.phase },
        { name: "note", label: "备注", type: "textarea", value: sk.note },
      ],
      onSubmit(d) {
        sk.phase = d.phase.trim();
        sk.note = d.note;
        ctx.persist();
      },
    });
  });
  document.getElementById("edit-note")?.addEventListener("click", () => {
    openModal({
      title: "编辑备注",
      fields: [{ name: "note", label: "备注", type: "textarea", value: sk.note }],
      onSubmit(d) {
        sk.note = d.note;
        ctx.persist();
      },
    });
  });
  document.getElementById("add-goal")?.addEventListener("click", () => {
    openModal({
      title: "添加阶段目标",
      fields: [{ name: "text", label: "目标" }],
      onSubmit(d) {
        if (!d.text.trim()) return;
        sk.goals.push({ id: uid(), text: d.text.trim(), done: false });
        ctx.persist();
      },
    });
  });
  document.querySelectorAll("[data-toggle-goal]").forEach((b) => {
    b.onclick = () => {
      const g = sk.goals.find((x) => x.id === b.dataset.toggleGoal);
      if (g) g.done = !g.done;
      ctx.persist();
    };
  });
  document.querySelectorAll("[data-del-goal]").forEach((b) => {
    b.onclick = () => {
      sk.goals = sk.goals.filter((x) => x.id !== b.dataset.delGoal);
      ctx.persist();
    };
  });
  document.getElementById("add-mat")?.addEventListener("click", () => {
    openModal({
      title: "新增材料",
      fields: [
        { name: "title", label: "标题" },
        { name: "type", label: "类型", type: "select", options: MATERIAL_TYPES },
        { name: "url", label: "链接（可选）" },
        { name: "note", label: "备注（可选）" },
      ],
      onSubmit(d) {
        if (!d.title.trim()) return;
        sk.materials.unshift({
          id: uid(),
          title: d.title.trim(),
          type: d.type,
          url: d.url.trim(),
          note: d.note.trim(),
          done: false,
        });
        ctx.persist();
      },
    });
  });
  document.querySelectorAll("[data-toggle-mat]").forEach((b) => {
    b.onclick = () => {
      const m = sk.materials.find((x) => x.id === b.dataset.toggleMat);
      if (m) m.done = !m.done;
      ctx.persist();
    };
  });
  document.querySelectorAll("[data-del-mat]").forEach((b) => {
    b.onclick = () => {
      sk.materials = sk.materials.filter((x) => x.id !== b.dataset.delMat);
      ctx.persist();
    };
  });
  document.querySelectorAll("[data-edit-mat]").forEach((b) => {
    b.onclick = () => {
      const m = sk.materials.find((x) => x.id === b.dataset.editMat);
      if (!m) return;
      openModal({
        title: "编辑材料",
        fields: [
          { name: "title", label: "标题", value: m.title },
          { name: "type", label: "类型", type: "select", options: MATERIAL_TYPES, value: m.type },
          { name: "url", label: "链接", value: m.url },
          { name: "note", label: "备注", value: m.note },
          { name: "done", label: "已看过/用过", type: "checkbox", value: m.done },
        ],
        onSubmit(d) {
          m.title = d.title.trim();
          m.type = d.type;
          m.url = d.url.trim();
          m.note = d.note.trim();
          m.done = !!d.done;
          ctx.persist();
        },
      });
    };
  });
  document.getElementById("add-check")?.addEventListener("click", () => {
    openModal({
      title: "新增清单事项",
      fields: [
        { name: "text", label: "事项" },
        { name: "note", label: "备注（可选）" },
      ],
      onSubmit(d) {
        if (!d.text.trim()) return;
        sk.checklist.push({ id: uid(), text: d.text.trim(), note: d.note.trim(), done: false });
        ctx.persist();
      },
    });
  });
  document.querySelectorAll("[data-toggle-check]").forEach((b) => {
    b.onclick = () => {
      const c = sk.checklist.find((x) => x.id === b.dataset.toggleCheck);
      if (c) c.done = !c.done;
      ctx.persist();
    };
  });
  document.querySelectorAll("[data-del-check]").forEach((b) => {
    b.onclick = () => {
      sk.checklist = sk.checklist.filter((x) => x.id !== b.dataset.delCheck);
      ctx.persist();
    };
  });
  document.querySelectorAll("[data-archive]").forEach((b) => {
    b.onclick = () => {
      const c = sk.checklist.find((x) => x.id === b.dataset.archive);
      if (!c) return;
      sk.checklist = sk.checklist.filter((x) => x.id !== c.id);
      sk.archive.unshift({ id: uid(), text: c.text, note: c.note, date: today() });
      ctx.persist();
    };
  });
  document.querySelectorAll("[data-del-arch]").forEach((b) => {
    b.onclick = () => {
      sk.archive = sk.archive.filter((x) => x.id !== b.dataset.delArch);
      ctx.persist();
    };
  });
}

export function renderMedia(ctx) {
  const name = ctx.route.name;
  const md = ctx.state.media[name];
  const isGame = name === "游戏";
  const tabs = isGame
    ? [
        { key: "want", label: "想玩" },
        { key: "doing", label: "在玩" },
        { key: "done", label: "通关" },
      ]
    : [
        { key: "want", label: "想看" },
        { key: "doing", label: "在看" },
        { key: "done", label: "看完" },
      ];
  const rows = (md[ctx.mediaTab] || []).filter((r) =>
    matchQ(ctx, r.title, r.note, r.comment, r.progress),
  );
  const progressLabel =
    name === "动漫"
      ? "进度（第 N 集/季）"
      : name === "书籍" || name === "小说"
        ? "进度（%）"
        : name === "游戏"
          ? "进度（境界/时长）"
          : "进度";

  let table;
  if (!rows.length) table = `<div class="empty">这一栏还是空的</div>`;
  else if (ctx.mediaTab === "done") {
    table = `<div class="table-wrap"><table>
      <thead><tr><th>标题</th><th>完成</th><th>评价</th><th>一句话</th><th></th></tr></thead>
      <tbody>${rows.map((r) => `
        <tr class="done">
          <td>${r.link ? `<a href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.title)}</a>` : esc(r.title)}</td>
          <td>${esc(r.date || "—")}</td>
          <td>${esc(r.rating || "—")}</td>
          <td>${esc(r.comment || "")}</td>
          <td><div class="row-actions">
            <button type="button" class="btn sm" data-media-move="${r.id}" data-from="done" data-to="doing">移到在看</button>
            <button type="button" class="icon-btn" data-media-del="${r.id}" data-from="done">×</button>
          </div></td>
        </tr>`).join("")}</tbody></table></div>`;
  } else {
    table = `<div class="table-wrap"><table>
      <thead><tr><th>标题</th><th>${esc(progressLabel)}</th><th>备注</th><th></th></tr></thead>
      <tbody>${rows.map((r) => `
        <tr>
          <td>${r.link ? `<a href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.title)}</a>` : esc(r.title)}</td>
          <td>${esc(r.progress || "—")}</td>
          <td>${esc(r.note || "")}</td>
          <td><div class="row-actions">
            ${ctx.mediaTab === "want" ? `<button type="button" class="btn sm" data-media-move="${r.id}" data-from="want" data-to="doing">${isGame ? "→在玩" : "→在看"}</button>` : ""}
            ${ctx.mediaTab === "doing" ? `<button type="button" class="btn sm" data-media-move="${r.id}" data-from="doing" data-to="done">${isGame ? "通关" : "完成"}</button>` : ""}
            <button type="button" class="icon-btn" data-media-edit="${r.id}" data-from="${ctx.mediaTab}">✎</button>
            <button type="button" class="icon-btn" data-media-del="${r.id}" data-from="${ctx.mediaTab}">×</button>
          </div></td>
        </tr>`).join("")}</tbody></table></div>`;
  }

  return `
    <div class="tabs">${tabs.map((t) => `<button type="button" class="tab ${t.key === ctx.mediaTab ? "active" : ""}" data-media-tab="${t.key}">${t.label} · ${md[t.key].length}</button>`).join("")}</div>
    <div class="card">
      <div class="section-head">
        <div>
          <h3>${tabs.find((t) => t.key === ctx.mediaTab).label}</h3>
          <p>${isGame ? '追踪想玩/在玩/通关；完整分层目录见 <a href="./content/02-媒体/_修仙游戏目录.md" target="_blank" rel="noopener">修仙游戏目录</a>' : "状态只有三档"}</p>
        </div>
        <button type="button" class="btn sm primary" id="media-add">新增</button>
      </div>
      ${table}
    </div>
  `;
}

export function bindMedia(ctx) {
  const md = ctx.state.media[ctx.route.name];
  document.querySelectorAll("[data-media-tab]").forEach((b) => {
    b.onclick = () => {
      ctx.mediaTab = b.dataset.mediaTab;
      ctx.render();
    };
  });
  document.getElementById("media-add")?.addEventListener("click", () => {
    openModal({
      title: `新增到「${ctx.route.name}」`,
      fields: [
        { name: "title", label: "标题" },
        { name: "progress", label: "进度" },
        { name: "link", label: "链接（可选）" },
        { name: "note", label: "备注（可选）" },
        ...(ctx.mediaTab === "done"
          ? [
              { name: "rating", label: "评价（可选）", placeholder: "★★★★" },
              { name: "comment", label: "一句话感想" },
            ]
          : []),
      ],
      onSubmit(d) {
        if (!d.title.trim()) return;
        md[ctx.mediaTab].unshift({
          id: uid(),
          title: d.title.trim(),
          progress: (d.progress || "").trim(),
          link: (d.link || "").trim(),
          note: (d.note || "").trim(),
          date: ctx.mediaTab === "done" ? today() : "",
          rating: (d.rating || "").trim(),
          comment: (d.comment || "").trim(),
        });
        ctx.persist();
      },
    });
  });
  document.querySelectorAll("[data-media-del]").forEach((b) => {
    b.onclick = () => {
      md[b.dataset.from] = md[b.dataset.from].filter((x) => x.id !== b.dataset.mediaDel);
      ctx.persist();
    };
  });
  document.querySelectorAll("[data-media-edit]").forEach((b) => {
    b.onclick = () => {
      const from = b.dataset.from;
      const row = md[from].find((x) => x.id === b.dataset.mediaEdit);
      if (!row) return;
      openModal({
        title: "编辑条目",
        fields: [
          { name: "title", label: "标题", value: row.title },
          { name: "progress", label: "进度", value: row.progress },
          { name: "link", label: "链接", value: row.link },
          { name: "note", label: "备注", value: row.note },
        ],
        onSubmit(d) {
          row.title = d.title.trim();
          row.progress = d.progress.trim();
          row.link = d.link.trim();
          row.note = d.note.trim();
          ctx.persist();
        },
      });
    };
  });
  document.querySelectorAll("[data-media-move]").forEach((b) => {
    b.onclick = () => {
      const from = b.dataset.from;
      const to = b.dataset.to || "doing";
      const row = md[from].find((x) => x.id === b.dataset.mediaMove);
      if (!row) return;
      md[from] = md[from].filter((x) => x.id !== row.id);
      if (to === "done") row.date = today();
      md[to].unshift(row);
      ctx.mediaTab = to;
      ctx.persist();
    };
  });
}
