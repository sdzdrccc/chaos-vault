import { esc } from "./config.js";

let modalSubmit = null;

export function initModal() {
  const modal = document.getElementById("modal");
  document.getElementById("modal-cancel").onclick = closeModal;
  document.getElementById("modal-ok").onclick = () => modalSubmit && modalSubmit();
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
}

export function openModal({ title, hint = "", fields, onSubmit }) {
  const modal = document.getElementById("modal");
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-hint").textContent = hint;
  const body = document.getElementById("modal-body");
  body.innerHTML = fields
    .map((f) => {
      if (f.type === "textarea") {
        return `<div class="field"><label>${esc(f.label)}</label><textarea name="${f.name}" placeholder="${esc(f.placeholder || "")}">${esc(f.value || "")}</textarea></div>`;
      }
      if (f.type === "select") {
        return `<div class="field"><label>${esc(f.label)}</label><select name="${f.name}">${f.options
          .map((o) => `<option value="${esc(o)}" ${o === f.value ? "selected" : ""}>${esc(o)}</option>`)
          .join("")}</select></div>`;
      }
      if (f.type === "checkbox") {
        return `<div class="field"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="${f.name}" ${f.value ? "checked" : ""}/> ${esc(f.label)}</label></div>`;
      }
      return `<div class="field"><label>${esc(f.label)}</label><input name="${f.name}" type="${f.type || "text"}" value="${esc(f.value || "")}" placeholder="${esc(f.placeholder || "")}"/></div>`;
    })
    .join("");
  modalSubmit = () => {
    const data = {};
    for (const f of fields) {
      const el = body.querySelector(`[name="${f.name}"]`);
      if (!el) continue;
      data[f.name] = f.type === "checkbox" ? el.checked : el.value;
    }
    onSubmit(data);
    closeModal();
  };
  modal.hidden = false;
  const first = body.querySelector("input,textarea,select");
  if (first) first.focus();
}

export function closeModal() {
  document.getElementById("modal").hidden = true;
  modalSubmit = null;
}
