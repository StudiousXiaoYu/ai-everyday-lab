"use strict";
const $ = (id) => document.getElementById(id),
  KEY = "everyday-knowledge-v1",
  today = App.date(),
  builtins = window.KB_DOCUMENTS;
function initial() {
  return {
    version: 1,
    notes: [],
    mistakes: [
      {
        id: "sample-equation",
        question: "2(x+3)=10，求 x。",
        wrong: "去括号写成 2x+3=10。",
        answer: "2x+6=10 → 2x=4 → x=2。代回：2×(2+3)=10。",
        reason: "括号外的 2 要乘括号内每一项，不能只乘 x。",
        docId: "equations",
        due: today,
        level: 0,
        reviews: 0,
      },
      {
        id: "sample-fraction",
        question: "计算 1/2 + 1/3。",
        wrong: "把分子分母分别相加，得到 2/5。",
        answer: "先通分：3/6 + 2/6 = 5/6。",
        reason: "分母不同，每一份的大小不同，要先通分再加分子。",
        docId: "fractions",
        due: today,
        level: 0,
        reviews: 0,
      },
      {
        id: "sample-english",
        question: "改错：She read every day.（描述现在的习惯）",
        wrong: "主语是 she，动词仍用了原形 read。",
        answer: "She reads every day.",
        reason: "一般现在时肯定句里，第三人称单数主语的实义动词通常要变形。",
        docId: "english-tense",
        due: today,
        level: 0,
        reviews: 0,
      },
    ],
  };
}
function validNotes(notes) {
  return (
    Array.isArray(notes) &&
    notes.length <= 100 &&
    notes.every(
      (n) =>
        n &&
        typeof n.id === "string" &&
        n.id.startsWith("local-") &&
        typeof n.title === "string" &&
        n.title.length > 0 &&
        n.title.length <= 100 &&
        typeof n.content === "string" &&
        n.content.length > 0 &&
        n.content.length <= 100000 &&
        typeof n.category === "string" &&
        n.category.length <= 30 &&
        Array.isArray(n.tags) &&
        n.tags.length <= 30 &&
        n.tags.every((t) => typeof t === "string" && t.length <= 100),
    ) &&
    new Set(notes.map((n) => n.id)).size === notes.length
  );
}
function validMistakes(items) {
  return (
    Array.isArray(items) &&
    items.length <= 1000 &&
    items.every(
      (m) =>
        m &&
        typeof m.id === "string" &&
        ["question", "wrong", "answer", "reason", "docId", "due"].every(
          (k) => typeof m[k] === "string",
        ) &&
        m.question.length > 0 &&
        m.question.length <= 300 &&
        m.wrong.length <= 500 &&
        m.answer.length <= 3000 &&
        m.reason.length <= 2000 &&
        /^\d{4}-\d{2}-\d{2}$/.test(m.due) &&
        Number.isInteger(m.level) &&
        m.level >= 0 &&
        m.level <= 4 &&
        Number.isInteger(m.reviews) &&
        m.reviews >= 0,
    ) &&
    new Set(items.map((m) => m.id)).size === items.length
  );
}
function validState(value) {
  return (
    value &&
    value.version === 1 &&
    validNotes(value.notes) &&
    validMistakes(value.mistakes)
  );
}
let state = App.read(KEY, null);
if (!validState(state)) state = initial();
let engine,
  activeView = "search",
  noteId = null,
  mistakeId = null,
  sessionCount = 0,
  currentReviewId = null;
const docs = () => [...builtins, ...state.notes];
const due = () =>
  state.mistakes
    .filter((m) => m.due <= App.date())
    .sort((a, b) => a.due.localeCompare(b.due));
function persist() {
  return App.save(KEY, state);
}
function rebuild() {
  engine = LocalSearch.create(docs());
  const cats = [...new Set(docs().map((d) => d.category))];
  const selected = $("category-filter").value;
  $("category-filter").replaceChildren(
    App.el("option", { value: "all", text: "全部分类" }),
    ...cats.map((c) => App.el("option", { value: c, text: c })),
  );
  $("category-filter").value = cats.includes(selected) ? selected : "all";
  stats();
}
function stats() {
  const n = docs().length,
    m = state.mistakes.length,
    d = due().length;
  $("doc-count").textContent = n;
  $("mistake-count").textContent = m;
  $("review-count").textContent = d;
  $("stat-docs").textContent = n;
  $("stat-wrongs").textContent = m;
  $("stat-due").textContent = d;
}
function setView(view) {
  activeView = view;
  document.querySelectorAll("[data-view]").forEach((b) => {
    if (b.dataset.view === view) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  document
    .querySelectorAll(".view")
    .forEach((v) => (v.hidden = v.id !== `view-${view}`));
  if (view === "library") renderLibrary();
  if (view === "mistakes") renderMistakes();
  if (view === "review") renderReview();
}
document
  .querySelectorAll("[data-view]")
  .forEach((b) => (b.onclick = () => setView(b.dataset.view)));
$("start-review").onclick = () => setView("review");
document
  .querySelectorAll("[data-close]")
  .forEach((b) => (b.onclick = () => $(b.dataset.close).close()));
function runSearch() {
  const query = $("query").value.trim();
  if (!query) return;
  setView("search");
  const hits = engine.search(query, 5),
    box = $("results");
  box.replaceChildren();
  if (!hits.length) {
    box.append(
      App.el(
        "div",
        { className: "empty" },
        App.el("h3", { text: "这里还没有足够相关的资料。" }),
        App.el("p", {
          text: "试试更具体的关键词，或者先添加一份包含答案的笔记。",
        }),
      ),
    );
    return;
  }
  box.append(
    App.el("p", {
      className: "result-summary",
      text: `找到 ${hits.length} 个相关片段。以下内容摘自本地资料，请结合原文理解。`,
    }),
  );
  hits.forEach((hit, i) => {
    const card = App.el("article", { className: "result-card" });
    const head = App.el(
      "div",
      { className: "result-head" },
      App.el("span", { className: "tag", text: hit.category }),
      App.el("span", { className: "result-index", text: `来源 ${i + 1}` }),
    );
    const source = App.el(
      "div",
      { className: "result-source" },
      App.el("span", { text: `《${hit.title}》 / ${hit.heading}` }),
    );
    const read = App.el("button", { type: "button", text: "查看原文 ↗" });
    read.onclick = () => openDoc(hit.docId, hit.id);
    source.append(read);
    card.append(
      head,
      App.el("h3", { text: hit.heading }),
      App.el("blockquote", { text: hit.text }),
      source,
    );
    box.append(card);
  });
}
$("search-form").onsubmit = (e) => {
  e.preventDefault();
  runSearch();
};
document.querySelectorAll("[data-query]").forEach(
  (b) =>
    (b.onclick = () => {
      $("query").value = b.dataset.query;
      runSearch();
    }),
);
function openDoc(id, highlight) {
  const doc = docs().find((d) => d.id === id);
  if (!doc) return App.toast("这份资料已被移除。");
  $("reader-category").textContent =
    `${doc.category} / ${doc.file ? "项目内置原文" : "本机笔记"}`;
  $("reader-title").textContent = doc.title;
  $("reader-content").replaceChildren();
  LocalSearch.chunks(doc).forEach((section) => {
    const block = App.el("section", {
      className: section.id === highlight ? "source-highlight" : "",
    });
    block.append(App.el("h2", { text: section.heading }));
    for (const paragraph of section.text.split(/\n\s*\n/))
      block.append(App.el("p", { text: paragraph }));
    $("reader-content").append(block);
  });
  const actions = $("reader-actions");
  actions.replaceChildren();
  const download = App.el("button", {
    className: "btn ghost small",
    text: "下载原文 .md",
    type: "button",
  });
  download.onclick = () =>
    App.download(
      `${doc.title.replace(/[<>:"/\\|?*]/g, "-")}.md`,
      `# ${doc.title}\n\n${doc.content.replace(/^#\s[^\n]+\n*/, "")}`,
      "text/markdown",
    );
  actions.append(download);
  if (!doc.file) {
    const edit = App.el("button", {
      className: "btn small",
      text: "编辑笔记",
      type: "button",
    });
    edit.onclick = () => {
      $("reader-dialog").close();
      editNote(doc.id);
    };
    actions.append(edit);
  }
  const find = App.el("button", {
    className: "btn secondary small",
    text: "搜索相关知识",
    type: "button",
  });
  find.onclick = () => {
    $("reader-dialog").close();
    $("query").value = doc.tags.slice(0, 2).join(" ");
    runSearch();
  };
  actions.append(find);
  $("reader-dialog").showModal();
  if (highlight)
    requestAnimationFrame(() =>
      document
        .querySelector(".source-highlight")
        ?.scrollIntoView({ block: "center" }),
    );
  else $("reader-dialog").scrollTop = 0;
}
function renderLibrary() {
  const category = $("category-filter").value,
    box = $("document-list");
  box.replaceChildren();
  for (const doc of docs().filter(
    (d) => category === "all" || d.category === category,
  )) {
    const card = App.el("article", { className: "document-card" });
    card.append(
      App.el("div", {
        className: "doc-icon",
        "aria-hidden": "true",
        text:
          doc.category === "数学" ? "∑" : doc.category === "英语" ? "Aa" : "▤",
      }),
      App.el("span", { className: "tag", text: doc.category }),
      App.el("h3", { text: doc.title }),
      App.el("p", { text: doc.tags.join(" · ") }),
    );
    const foot = App.el(
      "div",
      { className: "doc-bottom" },
      App.el("small", {
        text: doc.file ? "内置原创资料 / Markdown" : "我的本地笔记",
      }),
    );
    const read = App.el("button", {
      className: "btn small secondary",
      text: "阅读 ↗",
      type: "button",
    });
    read.onclick = () => openDoc(doc.id);
    foot.append(read);
    card.append(foot);
    if (!doc.file) {
      const remove = App.el("button", {
        className: "text-button",
        text: "删除笔记",
        type: "button",
      });
      remove.style.marginTop = "13px";
      remove.onclick = () =>
        App.confirm(
          "删除这份笔记？",
          "删除后可以通过之前导出的备份恢复。",
          () => {
            state.notes = state.notes.filter((n) => n.id !== doc.id);
            persist();
            rebuild();
            renderLibrary();
          },
        );
      card.append(remove);
    }
    box.append(card);
  }
  if (!box.childElementCount)
    box.append(
      App.el("div", { className: "empty", text: "这个分类还没有资料。" }),
    );
}
$("category-filter").onchange = renderLibrary;
function editNote(id = null) {
  noteId = id;
  const doc = id ? state.notes.find((n) => n.id === id) : null;
  $("note-dialog-title").textContent = doc
    ? "更新这份知识。"
    : "收好一份新知识。";
  $("note-title").value = doc?.title || "";
  $("note-category").value = doc?.category || "我的笔记";
  $("note-tags").value = doc?.tags.join("，") || "";
  $("note-content").value = doc?.content || "";
  $("note-dialog").showModal();
}
$("new-note").onclick = () => editNote();
$("note-form").onsubmit = (e) => {
  e.preventDefault();
  const note = {
    id: noteId || `local-${App.id()}`,
    title: $("note-title").value.trim(),
    category: $("note-category").value.trim(),
    tags: $("note-tags")
      .value.split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 30),
    content: $("note-content").value.trim(),
  };
  if (!validNotes([note]))
    return App.toast("请填写完整标题、分类和内容，标签请简短一些。");
  if (!noteId && state.notes.length >= 100)
    return App.toast("已达到 100 份本地笔记，请先导出整理。");
  if (noteId)
    state.notes = state.notes.map((n) => (n.id === noteId ? note : n));
  else state.notes.push(note);
  const saved = persist();
  rebuild();
  $("note-dialog").close();
  setView("library");
  if (saved) App.toast("笔记已保存，也可以被搜索到了。");
};
function wireFileLabel(label, input) {
  $(label).onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      $(input).click();
    }
  };
}
wireFileLabel("import-files-label", "import-files");
wireFileLabel("import-backup-label", "import-kb");
$("import-files").onchange = async (e) => {
  const files = Array.from(e.target.files || []);
  let added = 0;
  for (const file of files) {
    try {
      if (!/\.(md|txt)$/i.test(file.name) || file.size > 300000)
        throw Error("请选用 300 KB 以内的 Markdown / TXT 文件。");
      let content = (await file.text())
        .replace(/^\uFEFF/, "")
        .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "")
        .trim();
      if (!content || content.length > 100000)
        throw Error("文件为空或文字过多。");
      if (state.notes.length >= 100) throw Error("已达到 100 份本地笔记。");
      const title = (
        content.match(/^#\s+(.+)$/m)?.[1] || file.name.replace(/\.[^.]+$/, "")
      ).slice(0, 100);
      state.notes.push({
        id: `local-${App.id()}`,
        title,
        category: "导入资料",
        tags: ["导入"],
        content,
      });
      added++;
    } catch (err) {
      App.toast(`${file.name}：${err.message}`);
    }
  }
  if (added) {
    persist();
    rebuild();
    setView("library");
    App.toast(`已导入 ${added} 份资料，检索索引已更新。`);
  }
  e.target.value = "";
};
function editMistake(id = null) {
  mistakeId = id;
  const m = id ? state.mistakes.find((x) => x.id === id) : null;
  $("mistake-dialog-title").textContent = m
    ? "再整理一下这道题。"
    : "把错题，变成线索。";
  $("wrong-question").value = m?.question || "";
  $("wrong-answer").value = m?.wrong || "";
  $("right-answer").value = m?.answer || "";
  $("wrong-reason").value = m?.reason || "";
  $("wrong-topic").replaceChildren(
    App.el("option", { value: "", text: "暂不关联" }),
    ...docs().map((d) => App.el("option", { value: d.id, text: d.title })),
  );
  $("wrong-topic").value = m?.docId || "";
  $("mistake-dialog").showModal();
}
$("add-mistake").onclick = () => editMistake();
$("mistake-form").onsubmit = (e) => {
  e.preventDefault();
  const old = state.mistakes.find((m) => m.id === mistakeId);
  const m = {
    id: mistakeId || App.id(),
    question: $("wrong-question").value.trim(),
    wrong: $("wrong-answer").value.trim(),
    answer: $("right-answer").value.trim(),
    reason: $("wrong-reason").value.trim(),
    docId: $("wrong-topic").value,
    due: today,
    level: 0,
    reviews: old?.reviews || 0,
  };
  if (!m.question || !m.wrong || !m.answer || !m.reason) return;
  if (!mistakeId && state.mistakes.length >= 1000)
    return App.toast("错题已达上限，请先导出整理。");
  if (mistakeId)
    state.mistakes = state.mistakes.map((x) => (x.id === mistakeId ? m : x));
  else state.mistakes.push(m);
  const saved = persist();
  stats();
  $("mistake-dialog").close();
  setView("mistakes");
  if (saved) App.toast("已保存，加入今天的复习。");
};
function renderMistakes() {
  const box = $("mistake-list");
  box.replaceChildren();
  for (const m of state.mistakes) {
    const card = App.el("article", { className: "mistake-card" });
    card.append(
      App.el("span", {
        className: "tag",
        text: m.due <= App.date() ? "今天待复习" : `下次复习 ${m.due}`,
      }),
      App.el("h3", { text: m.question }),
    );
    for (const [label, text, cls] of [
      ["我的答案", m.wrong, "wrong"],
      ["正确解法", m.answer, ""],
      ["错误原因", m.reason, "reason"],
    ])
      card.append(
        App.el(
          "div",
          { className: `mistake-row ${cls}` },
          App.el("span", { text: label }),
          App.el("div", { text }),
        ),
      );
    const footer = App.el(
        "div",
        { className: "mistake-footer" },
        App.el("span", { text: `已复习 ${m.reviews} 次` }),
      ),
      buttons = App.el("div", { className: "btn-row" });
    if (m.docId) {
      const related = App.el("button", {
        className: "text-button",
        type: "button",
        text: "关联知识 ↗",
      });
      related.onclick = () => openDoc(m.docId);
      buttons.append(related);
    }
    const edit = App.el("button", {
      className: "text-button",
      type: "button",
      text: "编辑",
    });
    edit.onclick = () => editMistake(m.id);
    const del = App.el("button", {
      className: "text-button",
      type: "button",
      text: "删除",
    });
    del.onclick = () =>
      App.confirm("删除这条错题？", "会移除错题及其复习记录。", () => {
        state.mistakes = state.mistakes.filter((x) => x.id !== m.id);
        persist();
        stats();
        renderMistakes();
      });
    buttons.append(edit, del);
    footer.append(buttons);
    card.append(footer);
    box.append(card);
  }
  if (!state.mistakes.length)
    box.append(
      App.el("div", {
        className: "empty",
        text: "错题本还是空的。把一次卡住的地方，变成下次的提示。",
      }),
    );
}
function renderReview() {
  const box = $("review-card"),
    queue = due();
  box.replaceChildren();
  if (!queue.length) {
    const done = App.el(
      "div",
      { className: "review-complete" },
      App.el("span", { "aria-hidden": "true", text: "✳" }),
      App.el("h3", {
        text: sessionCount ? "今天的复习，完成了。" : "今天没有待复习的错题。",
      }),
      App.el("p", {
        text: sessionCount
          ? `这次认真回顾了 ${sessionCount} 道题，给自己一点肯定。`
          : "可以读读资料，或者记录一个新问题。",
      }),
    );
    const b = App.el("button", {
      className: "btn secondary",
      type: "button",
      text: "去看看学习资料 ↗",
    });
    b.onclick = () => setView("library");
    done.append(b);
    box.append(done);
    return;
  }
  const m = queue[0];
  currentReviewId = m.id;
  const paper = App.el(
    "article",
    { className: "review-paper" },
    App.el("div", {
      className: "eyebrow",
      text: `还有 ${queue.length} 道待复习 · 本次已完成 ${sessionCount} 道`,
    }),
    App.el("h3", { text: m.question }),
  );
  const reveal = App.el("button", {
    className: "btn secondary",
    type: "button",
    text: "想好了，看看解答 ↓",
  });
  const revealRow = App.el("div", { className: "btn-row" }, reveal);
  paper.append(revealRow);
  reveal.onclick = () => {
    revealRow.remove();
    const answer = App.el(
      "div",
      { className: "review-answer" },
      App.el("small", { text: "正确解法" }),
      App.el("p", { text: m.answer }),
      App.el("small", { text: "上次卡住的地方" }),
      App.el("p", { text: m.reason }),
    );
    const row = App.el("div", { className: "btn-row" });
    for (const [label, remembered] of [
      ["还不熟，明天再看", false],
      ["记住了，下一题", true],
    ]) {
      const b = App.el("button", {
        className: `btn${remembered ? "" : " ghost"}`,
        type: "button",
        text: label,
      });
      b.onclick = () => {
        if (currentReviewId !== m.id) return;
        currentReviewId = null;
        const interval = remembered ? [1, 3, 7, 14][Math.min(m.level, 3)] : 1;
        m.level = remembered ? Math.min(m.level + 1, 4) : 0;
        m.due = App.after(interval);
        m.reviews++;
        m.lastReviewed = App.date();
        sessionCount++;
        persist();
        stats();
        renderReview();
      };
      row.append(b);
    }
    answer.append(row);
    paper.append(answer);
  };
  box.append(paper);
}
$("export-kb").onclick = () =>
  App.download(`学习知识库备份-${App.date()}.json`, {
    app: "everyday-knowledge",
    ...state,
  });
$("import-kb").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 8 * 1024 * 1024) throw Error("备份超过 8 MB，请检查文件。");
    const imported = JSON.parse(await file.text());
    if (imported.app !== "everyday-knowledge" || !validState(imported))
      throw Error("不是有效的学习知识库备份。");
    App.confirm(
      "恢复这份知识库备份？",
      "会替换本机新增的笔记、错题与复习进度。内置资料保持可用。",
      () => {
        state = {
          version: 1,
          notes: imported.notes,
          mistakes: imported.mistakes,
        };
        persist();
        rebuild();
        sessionCount = 0;
        setView("library");
        App.toast("备份已恢复。");
      },
    );
  } catch (err) {
    App.toast(err.message || "读取失败");
  }
  e.target.value = "";
};
$("reset-kb").onclick = () =>
  App.confirm(
    "恢复全部示例？",
    "会清除本机新增的笔记和错题，恢复 3 条示例错题。建议先导出备份。",
    () => {
      state = initial();
      persist();
      rebuild();
      sessionCount = 0;
      $("query").value = "";
      $("results").replaceChildren(
        App.el("div", {
          className: "empty",
          text: "示例已恢复。输入一个问题，继续探索吧。",
        }),
      );
      setView("search");
    },
  );
rebuild();
setView("search");
