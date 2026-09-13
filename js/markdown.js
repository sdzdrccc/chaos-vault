import { SKILLS, MEDIA, MATERIAL_TYPES, LLM_PLATFORM_TYPES, LLM_REGIONS, uid } from "./config.js";

function mdCheck(text, done) {
  return `- [${done ? "x" : " "}] ${text}`;
}

function parseCheckboxLine(line) {
  const m = line.match(/^\s*[-*]\s+\[( |x|X)\]\s*(.*)$/);
  if (!m) return null;
  return { done: m[1].toLowerCase() === "x", text: m[2].trim() };
}

function splitSections(md) {
  const lines = String(md).split(/\r?\n/);
  const sections = { _: [] };
  let cur = "_";
  for (const line of lines) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      cur = h[1];
      if (!sections[cur]) sections[cur] = [];
    } else {
      sections[cur].push(line);
    }
  }
  return sections;
}

function isPlaceholder(text) {
  return /^(待添加|待填写|空|（空）|（无）|（未设定）)/.test(text);
}

export function serializeHome(state) {
  const st = homeStats(state);
  const cont = state.home.continues.length
    ? state.home.continues
        .map(
          (c) =>
            `- [ ] ${c.title} （${c.kind}${c.name ? " · " + c.name : ""}）${c.note ? " — " + c.note : ""}`,
        )
        .join("\n")
    : "- [ ] 待添加";
  const skillLinks = SKILLS.map((s) => `- [${s}](01-技能/${s}/00-总览.md)`).join("\n");
  const mediaLinks = MEDIA.map((m) => `- [${m}](02-媒体/${m}.md)`).join("\n");
  const mediaExtra = `- [修仙游戏目录](02-媒体/_修仙游戏目录.md)`;
  return `# 学习工作台 · 首页

| 指标 | 数量 |
|---|---|
| 收集箱待归 | ${st.inbox} |
| 未消化材料 | ${st.mat} |
| 未完成清单 | ${st.todo} |
| 媒体在途 | ${st.media} |

## 最近要继续的

${cont}

## 技能

${skillLinks}

## 媒体

${mediaLinks}
${mediaExtra}

## 入口

- [收集箱](03-收集箱.md)
`;
}

export function serializeInbox(state) {
  const lines = state.inbox.length
    ? state.inbox
        .map(
          (x) =>
            `- [ ] ${x.date ? x.date + " " : ""}${x.text}${x.target ? ` → 待归：${x.target}` : ""}`,
        )
        .join("\n")
    : "- [ ] 待添加";
  return `# 收集箱

> 先扔进来，每周归档一次。

${lines}
`;
}

export function serializeSkillOverview(name, skill) {
  const goals = skill.goals.length
    ? skill.goals.map((g) => mdCheck(g.text, g.done)).join("\n")
    : "- [ ] 待填写";
  return `# ${name}

## 当前阶段

${skill.phase || "（未设定）"}

## 阶段目标

${goals}

## 备注

${skill.note || "（无）"}

## 相关文件

- [材料](材料.md)
- [清单](清单.md)
`;
}

export function serializeSkillMaterials(name, skill) {
  const byType = Object.fromEntries(MATERIAL_TYPES.map((t) => [t, []]));
  for (const m of skill.materials) {
    const t = byType[m.type] ? m.type : "其他";
    byType[t].push(m);
  }
  const sections = MATERIAL_TYPES.map((t) => {
    const items = byType[t];
    const body = items.length
      ? items
          .map((m) => {
            const link = m.url ? `[${m.title}](${m.url})` : m.title;
            const note = m.note ? ` — ${m.note}` : "";
            return mdCheck(`${link}${note}`, m.done);
          })
          .join("\n")
      : "- [ ] 待添加";
    return `## ${t}\n\n${body}`;
  }).join("\n\n");
  return `# ${name} · 材料

> 勾选表示「看过 / 用过」，不等于学会。

${sections}
`;
}

export function serializeSkillChecklist(name, skill) {
  const cur = skill.checklist.length
    ? skill.checklist
        .map((c) => mdCheck(`${c.text}${c.note ? " — " + c.note : ""}`, c.done))
        .join("\n")
    : "- [ ] 待添加";
  const arch = skill.archive.length
    ? skill.archive
        .map(
          (c) =>
            `- [x] ${c.text}${c.date ? ` （${c.date}）` : ""}${c.note ? " — " + c.note : ""}`,
        )
        .join("\n")
    : "- [x] （空）";
  return `# ${name} · 清单

## 当前

${cur}

## 已完成归档

${arch}
`;
}

export function serializeMedia(name, media) {
  const doing = media.doing.length
    ? `| 标题 | 进度 | 备注 | 链接 |\n|---|---|---|---|\n` +
      media.doing
        .map(
          (r) =>
            `| ${r.link ? `[${r.title}](${r.link})` : r.title} | ${r.progress || ""} | ${r.note || ""} | ${r.link || ""} |`,
        )
        .join("\n")
    : `| 标题 | 进度 | 备注 | 链接 |\n|---|---|---|---|\n|  |  |  |  |`;
  const want = media.want.length
    ? media.want
        .map(
          (r) =>
            `- [ ] ${r.link ? `[${r.title}](${r.link})` : r.title}${r.note ? " — " + r.note : ""}`,
        )
        .join("\n")
    : "- [ ] 待添加";
  const done = media.done.length
    ? media.done
        .map(
          (r) =>
            `- [x] ${r.date ? r.date + " " : ""}${r.title}${r.rating ? " " + r.rating : ""}${r.comment ? " — " + r.comment : ""}`,
        )
        .join("\n")
    : "- [ ] 空";
  return `# ${name}

## 在看

${doing}

## 想看

${want}

## 看完

${done}
`;
}

export function parseHome(md) {
  const sec = splitSections(md);
  const continues = [];
  for (const line of sec["最近要继续的"] || []) {
    const c = parseCheckboxLine(line);
    if (!c || isPlaceholder(c.text)) continue;
    let title = c.text;
    let kind = "其他";
    let name = "";
    let note = "";
    const m = c.text.match(/^(.*?)\s*（([^）]+)）\s*(?:—\s*(.*))?$/);
    if (m) {
      title = m[1].trim();
      const parts = m[2].split("·").map((x) => x.trim());
      kind = parts[0] || "其他";
      name = parts[1] || "";
      note = (m[3] || "").trim();
    }
    continues.push({ id: uid(), title, kind, name, note });
  }
  return { continues };
}

export function parseInbox(md) {
  const items = [];
  for (const line of md.split(/\r?\n/)) {
    const c = parseCheckboxLine(line);
    if (!c || isPlaceholder(c.text)) continue;
    let text = c.text;
    let target = "";
    let date = "";
    const tm = text.match(/^(\d{4}-\d{2}-\d{2})\s+([\s\S]*)$/);
    if (tm) {
      date = tm[1];
      text = tm[2];
    }
    const arrow = text.match(/^(.*?)\s*→\s*待归：\s*(.+)$/);
    if (arrow) {
      text = arrow[1].trim();
      target = arrow[2].trim();
    }
    items.push({ id: uid(), text, target, date });
  }
  return items;
}

export function parseSkillOverview(md) {
  const sec = splitSections(md);
  const phaseRaw = (sec["当前阶段"] || []).join("\n").trim();
  const phase =
    phaseRaw && !isPlaceholder(phaseRaw) ? phaseRaw.split("\n")[0].trim() : "";
  const goals = [];
  for (const line of sec["阶段目标"] || []) {
    const c = parseCheckboxLine(line);
    if (!c || isPlaceholder(c.text)) continue;
    goals.push({ id: uid(), text: c.text, done: c.done });
  }
  const noteRaw = (sec["备注"] || []).join("\n").trim();
  const note = noteRaw && !isPlaceholder(noteRaw) ? noteRaw : "";
  return { phase, goals, note };
}

export function parseMaterials(md) {
  const sec = splitSections(md);
  const out = [];
  for (const [type, lines] of Object.entries(sec)) {
    if (type === "_") continue;
    const t = MATERIAL_TYPES.includes(type) ? type : "其他";
    for (const line of lines) {
      const c = parseCheckboxLine(line);
      if (!c || isPlaceholder(c.text)) continue;
      let title = c.text;
      let url = "";
      let note = "";
      const link = c.text.match(/^\[([^\]]+)\]\(([^)]+)\)(.*)$/);
      if (link) {
        title = link[1];
        url = link[2];
        note = (link[3] || "").replace(/^\s*—\s*/, "").trim();
      } else {
        const parts = c.text.split(/\s+—\s+/);
        title = parts[0].trim();
        note = parts.slice(1).join(" — ").trim();
      }
      out.push({ id: uid(), type: t, title, url, note, done: c.done });
    }
  }
  return out;
}

export function parseChecklist(md) {
  const sec = splitSections(md);
  const checklist = [];
  for (const line of sec["当前"] || []) {
    const c = parseCheckboxLine(line);
    if (!c || isPlaceholder(c.text)) continue;
    const parts = c.text.split(/\s+—\s+/);
    checklist.push({
      id: uid(),
      text: parts[0].trim(),
      note: parts.slice(1).join(" — ").trim(),
      done: c.done,
    });
  }
  const archive = [];
  for (const line of sec["已完成归档"] || []) {
    const c = parseCheckboxLine(line);
    if (!c || isPlaceholder(c.text)) continue;
    let text = c.text;
    let date = "";
    let note = "";
    const dm = text.match(/^(.*?)\s*（(\d{4}-\d{2}-\d{2})）\s*(?:—\s*(.*))?$/);
    if (dm) {
      text = dm[1].trim();
      date = dm[2];
      note = (dm[3] || "").trim();
    }
    archive.push({ id: uid(), text, date, note });
  }
  return { checklist, archive };
}

export function parseMedia(md) {
  const sec = splitSections(md);
  const out = { want: [], doing: [], done: [] };

  for (const line of sec["在看"] || []) {
    if (!line.trim().startsWith("|")) continue;
    if (/^\|\s*---/.test(line)) continue;
    if (/^\|\s*标题\s*\|/.test(line)) continue;
    const parts = line
      .replace(/^\|/, "")
      .replace(/\|\s*$/, "")
      .split("|")
      .map((x) => x.trim());
    if (parts.every((p) => !p)) continue;
    let title = parts[0];
    let link = parts[3] || "";
    const lm = title.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (lm) {
      title = lm[1];
      link = link || lm[2];
    }
    if (!title) continue;
    out.doing.push({
      id: uid(),
      title,
      progress: parts[1] || "",
      note: parts[2] || "",
      link,
      date: "",
      rating: "",
      comment: "",
    });
  }

  for (const line of sec["想看"] || []) {
    const c = parseCheckboxLine(line);
    if (!c || isPlaceholder(c.text)) continue;
    let title = c.text;
    let link = "";
    let note = "";
    const lm = c.text.match(/^\[([^\]]+)\]\(([^)]+)\)(?:\s+—\s+(.*))?$/);
    if (lm) {
      title = lm[1];
      link = lm[2];
      note = (lm[3] || "").trim();
    } else {
      const parts = c.text.split(/\s+—\s+/);
      title = parts[0].trim();
      note = parts.slice(1).join(" — ").trim();
    }
    out.want.push({
      id: uid(),
      title,
      progress: "",
      note,
      link,
      date: "",
      rating: "",
      comment: "",
    });
  }

  for (const line of sec["看完"] || []) {
    const c = parseCheckboxLine(line);
    if (!c || isPlaceholder(c.text)) continue;
    let text = c.text;
    let date = "";
    const dm = text.match(/^(\d{4}-\d{2}-\d{2})\s+([\s\S]*)$/);
    if (dm) {
      date = dm[1];
      text = dm[2];
    }
    let rating = "";
    const rm = text.match(/([★☆]{1,5})\s*/);
    if (rm) {
      rating = rm[1];
      text = text.replace(rm[0], "").trim();
    }
    let title = text;
    let comment = "";
    const parts = text.split(/\s+—\s+/);
    if (parts.length > 1) {
      title = parts[0].trim();
      comment = parts.slice(1).join(" — ").trim();
    }
    out.done.push({
      id: uid(),
      title,
      progress: "",
      note: "",
      link: "",
      date,
      rating,
      comment,
    });
  }
  return out;
}

export function homeStats(state) {
  let mat = 0;
  let todo = 0;
  let media = 0;
  for (const s of SKILLS) {
    mat += state.skills[s].materials.filter((x) => !x.done).length;
    todo += state.skills[s].checklist.filter((x) => !x.done).length;
  }
  for (const m of MEDIA) {
    media += state.media[m].want.length + state.media[m].doing.length;
  }
  return { mat, todo, media, inbox: state.inbox.length };
}

export function serializeLlmPlatforms(platforms) {
  const list = platforms?.length
    ? platforms
        .map((p) => {
          const models = (p.models || []).length
            ? `models:\n${(p.models || []).map((m) => `  - ${m}`).join("\n")}`
            : "models:";
          return [
            `### ${p.name || "未命名"}`,
            `- type: ${p.type || "其他"}`,
            `- region: ${p.region || "国外"}`,
            `- url: ${p.baseUrl || ""}`,
            `- site: ${p.site || ""}`,
            `- ${models}`,
            `- note: ${p.note || ""}`,
          ].join("\n");
        })
        .join("\n\n")
    : `### （暂无平台）

- type: 官方
- region: 国外
- url:
- site:
- models:
- note:`;

  return `# 大模型 · 平台收藏

> 账号与 API 接口备忘。请勿在此保存 API Key 明文（Key 见 平台.keys.local.md）。

## 平台列表

${list}
`;
}

/** Keys only — keep out of git-tracked 平台.md */
export function serializeLlmKeys(platforms) {
  const list = (platforms || [])
    .filter((p) => p.key)
    .map((p) => [`### ${p.name || "未命名"}`, `- key: ${p.key}`].join("\n"))
    .join("\n\n");
  return `# 大模型 · API Keys（本地）

> 本文件应被 .gitignore 忽略（*.local）。勿提交到 GitHub。

## Keys

${list || "### （空）\n\n- key:"}
`;
}

export function parseLlmKeys(md) {
  const map = new Map();
  if (!md) return map;
  const lines = String(md).split(/\r?\n/);
  let name = null;
  for (const line of lines) {
    const h3 = line.match(/^###\s+(.+?)\s*$/);
    if (h3) {
      name = h3[1];
      continue;
    }
    const kv = line.match(/^[-*]\s+key\s*:\s*(.*)$/i);
    if (kv && name) map.set(name, kv[1].trim());
  }
  return map;
}

export function applyLlmKeys(platforms, keyMap) {
  if (!keyMap || !keyMap.size) return platforms || [];
  return (platforms || []).map((p) => ({
    ...p,
    key: keyMap.get(p.name) || p.key || "",
  }));
}

export function parseLlmPlatforms(md) {
  const platforms = [];
  if (!md) return platforms;
  const lines = String(md).split(/\r?\n/);
  let cur = null;
  let inModels = false;

  const flush = () => {
    if (cur && cur.name && !isPlaceholder(cur.name) && !/^（?暂无/.test(cur.name)) {
      platforms.push({
        id: cur.id || uid(),
        name: cur.name,
        type: LLM_PLATFORM_TYPES.includes(cur.type) ? cur.type : "其他",
        region: LLM_REGIONS.includes(cur.region) ? cur.region : "国外",
        baseUrl: cur.baseUrl || "",
        site: cur.site || "",
        models: (cur.models || []).filter(Boolean),
        note: cur.note || "",
      });
    }
    cur = null;
    inModels = false;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    const h3 = line.match(/^###\s+(.+?)\s*$/);
    if (h3) {
      flush();
      cur = {
        id: uid(),
        name: h3[1],
        type: "官方",
        region: "国外",
        baseUrl: "",
        site: "",
        models: [],
        note: "",
      };
      inModels = false;
      continue;
    }
    if (!cur) continue;

    const modelBullet = line.match(/^\s{2,}[-*]\s+(.+)$/);
    if (inModels && modelBullet) {
      cur.models.push(modelBullet[1].trim());
      continue;
    }
    inModels = false;

    const kv = line.match(/^[-*]\s+(type|region|url|site|models|note)\s*:\s*(.*)$/i);
    if (kv) {
      const key = kv[1].toLowerCase();
      const val = kv[2].trim();
      if (key === "type") cur.type = val || "其他";
      else if (key === "region") cur.region = val || "国外";
      else if (key === "url") cur.baseUrl = val;
      else if (key === "site") cur.site = val;
      else if (key === "note") cur.note = val;
      else if (key === "models") {
        inModels = true;
        if (val) {
          cur.models.push(
            ...val
              .split(/[,，]/)
              .map((s) => s.trim())
              .filter(Boolean),
          );
        }
      }
      continue;
    }

    if (inModels && line.trim() && !line.startsWith("#")) {
      // allow plain model lines under models:
      cur.models.push(line.replace(/^[-*]\s*/, "").trim());
    }
  }
  flush();
  return platforms;
}
