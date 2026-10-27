(function () {
  "use strict";
  const U = {
    id() {
      return (
        globalThis.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`
      );
    },
    read(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
      } catch {
        return fallback;
      }
    },
    save(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        U.toast("浏览器无法保存数据，请及时导出备份。");
        return false;
      }
    },
    toast(message) {
      let box = document.querySelector(".toast");
      if (!box) {
        box = document.createElement("div");
        box.className = "toast";
        box.setAttribute("role", "status");
        document.body.append(box);
      }
      box.textContent = message;
      box.hidden = false;
      clearTimeout(U.toastTimer);
      U.toastTimer = setTimeout(() => (box.hidden = true), 3300);
    },
    download(name, value, type = "application/json") {
      const blob = new Blob(
        [typeof value === "string" ? value : JSON.stringify(value, null, 2)],
        { type: `${type};charset=utf-8` },
      );
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    el(tag, props = {}, ...children) {
      const node = document.createElement(tag);
      for (const [key, value] of Object.entries(props)) {
        if (key === "className") node.className = value;
        else if (key === "text") node.textContent = value;
        else node.setAttribute(key, value);
      }
      for (const child of children) node.append(child);
      return node;
    },
    date(d = new Date()) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    },
    after(days, date = U.date()) {
      const d = new Date(`${date}T12:00:00`);
      d.setDate(d.getDate() + days);
      return U.date(d);
    },
    confirm(title, message, action) {
      const modal = document.createElement("dialog");
      const head = U.el("h2", { text: title });
      const text = U.el("p", { text: message });
      const buttons = U.el("div", { className: "form-actions" });
      const cancel = U.el("button", {
        className: "btn ghost",
        type: "button",
        text: "取消",
      });
      const yes = U.el("button", {
        className: "btn",
        type: "button",
        text: "确认",
      });
      buttons.append(cancel, yes);
      modal.append(head, text, buttons);
      document.body.append(modal);
      cancel.onclick = () => modal.close();
      yes.onclick = () => {
        modal.close();
        action();
      };
      modal.addEventListener("close", () => modal.remove());
      modal.showModal();
      cancel.focus();
    },
  };
  window.App = U;
})();
