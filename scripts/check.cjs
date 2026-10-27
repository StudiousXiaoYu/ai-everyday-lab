const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const root = path.join(__dirname, ".."),
  sandbox = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(root, "knowledge/kb-data.js"), "utf8"),
  sandbox,
);
const docs = JSON.parse(JSON.stringify(sandbox.window.KB_DOCUMENTS));
const search = require("../knowledge/search.js").create(docs);
let checks = 0;
for (const [query, expected] of [
  ["2(x+3)=10 去括号", "equations"],
  ["分数加法通分", "fractions"],
  ["打八折怎么算", "percentages"],
  ["第三人称单数动词", "english-tense"],
  ["阅读理解概括主旨", "reading"],
  ["错题间隔复习", "learning-method"],
  ["AI答案核验", "ai-check"],
  ["知识库本地备份", "knowledge-base"],
]) {
  const hits = search.search(query);
  assert(
    hits.some((h) => h.docId === expected),
    `${query} should find ${expected}`,
  );
  checks++;
}
for (const query of ["火星大气压强", "量子计算芯片工艺", "qwertyuiopzz"]) {
  assert.equal(
    search.search(query).length,
    0,
    `Unrelated query must return empty: ${query}`,
  );
  checks++;
}
for (const doc of docs) {
  const raw = fs.readFileSync(path.join(root, "knowledge", doc.file), "utf8");
  assert(
    raw.includes(doc.content),
    `Bundled document must match original: ${doc.id}`,
  );
  checks++;
}
const custom = {
  id: "local-check",
  title: "我的独特笔记",
  category: "测试",
  tags: ["测试"],
  content: "## 蓝莓水彩画\n蓝莓水彩画使用群青和紫色调配，先画浅色再叠深色。",
};
assert(
  require("../knowledge/search.js")
    .create([...docs, custom])
    .search("蓝莓水彩画")[0].docId === "local-check",
);
checks++;
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((x) => ![".git", "artifacts"].includes(x.name))
    .flatMap((x) =>
      x.isDirectory() ? walk(path.join(dir, x.name)) : [path.join(dir, x.name)],
    );
}
for (const file of walk(root).filter((f) => f.endsWith(".html"))) {
  const html = fs.readFileSync(file, "utf8");
  for (const match of html.matchAll(/(?:href|src)="([^"#?]+)"/g)) {
    const ref = match[1];
    if (/^(https?:|mailto:|data:)/.test(ref)) continue;
    assert(
      fs.existsSync(path.resolve(path.dirname(file), ref)),
      `${file} refers to missing ${ref}`,
    );
    checks++;
  }
}
console.log(`PASS: ${checks} retrieval, source, and local asset checks.`);
