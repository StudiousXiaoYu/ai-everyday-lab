# 把想法，做成作品

海报里三个原创示例的可操作版本：**个人网站、日常计划、学习知识库**。

**在线体验：[打开我的小站](https://studiousxiaoyu.github.io/ai-everyday-lab/)**

| 示例 | 能做什么 | 直接打开 |
| --- | --- | --- |
| 个人网站 | 浏览作品、按类型筛选、本机修改简介 | `index.html` |
| 日常计划 | 按日期增删改任务、勾选完成、记录笔记、导入导出 | `planner/index.html` |
| 学习知识库 | 检索资料与引用原文、添加或导入笔记、错题记录、间隔复习、备份 | `knowledge/index.html` |

## 下载就能用

1. 点仓库的 **Code → Download ZIP**，解压完整文件夹。
2. 双击 `index.html`，用现代桌面浏览器打开。三个应用的资源都在项目内，无需安装依赖、构建、登录或配置密钥。
3. 如果浏览器限制本地文件的存储，可在项目目录执行 `python -m http.server 8000`，打开 `http://localhost:8000`。

网页可以直接离线打开。在线版第一次访问需要网络加载文件；这个项目没有安装式离线缓存。`file://` 下的本地保存支持程度取决于浏览器；页面会在保存失败时提示。固定使用同一个 HTTP 地址可获得更稳定的存储行为。

## 本地知识库具体怎么工作

知识库是实做的浏览器本地检索系统，使用**文档分段 + 中文二元分词/英文分词 + BM25 排序 + 原文溯源**。查询会找到相关资料片段，展示真实内容和文档标题；点击“查看原文”可以核对。资料不足时返回未找到相关资料。

这是为了方便小白下载体验的轻量方案，默认不运行大语言模型、不调用云 API、不模拟生成式 AI 回答。知识库的更新来自资料和笔记的积累，不是模型自训练。项目没有后端服务和第三方知识库组件。

### 资料随源码提供

`knowledge/materials/` 包含 8 份本项目原创教学示例：方程、分数、百分比、英语时态、阅读理解、学习复习、AI 核验、知识整理。它们是公开示例资料，未使用任何人的私有笔记或真实学生数据。

浏览器通过已生成并提交的 `knowledge/kb-data.js` 读取相同资料，因此离线打开也能检索。浏览器无需跨域 `fetch` 本地 Markdown。

- **临时体验**：在页面“添加笔记”，或“我的资料 → 导入 Markdown / TXT”，新内容马上可被检索。
- **修改仓库资料**：编辑 `knowledge/materials/*.md`，执行 `node scripts/build-knowledge.cjs`，把 Markdown 和新生成的 `kb-data.js` 一起提交。
- 自行添加资料时沿用现有文件头的 `id`、`title`、`category`、`tags`，每份文档使用唯一 `id`，使用 `##` 按知识点分段。
- 页面导入每个文件最多 300 KB / 10 万字符，最多 100 份个人资料。个人笔记只存本机，不会自动修改仓库。仓库 Markdown 资料规模不受这个页面导入上限约束。

### 错题与复习

每条错题记录题目、错误答案、正确解法、错误原因和关联资料。复习时先回忆，再翻看解答；选择“记住了”按 1 / 3 / 7 / 14 天安排下次复习，选“还不熟”回到 1 天。复习日期与进度保存在本机。此间隔是演示用规则，不宣称适合所有学习者。

## 本机数据与备份

- 任务、笔记、个人介绍、错题、复习进度使用 `localStorage`，各应用使用独立键。
- 不同访客的数据互不共享。清理浏览器数据、更换设备/浏览器，或更换访问地址会影响本地记录。
- 计划工具和知识库都提供 **JSON 导出 / 导入**。导入前会说明覆盖范围并要求确认。
- 公开 Pages 仅托管项目内置文件。页面新增资料不会上传、同步到 GitHub，也不会被其他访客看到。
- 网站只是演示，没有用户账户、支付、云端同步或后台管理。请不要把它当作生产系统保存唯一的重要资料。

## 项目结构

```text
index.html                   个人网站 / 总入口
assets/                      共享样式、工具、原创 SVG 插画
planner/                     日常计划
knowledge/
  index.html                 知识库页面
  knowledge.js               笔记、错题、复习、备份
  search.js                  无依赖 BM25 检索
  kb-data.js                 已打包资料（提交到仓库）
  materials/*.md             可编辑知识库原文（提交到仓库）
scripts/build-knowledge.cjs   可选：重建资料文件
scripts/check.cjs            可选：检索与资源核验
```

技术：原生 HTML / CSS / JavaScript，零运行时依赖。维护脚本使用 Node.js 内置模块，没有 `npm install` 步骤。界面插画为本项目原创 SVG，无外部字体、图片、CDN 或统计请求。

## 检查与部署

```sh
node scripts/build-knowledge.cjs
node scripts/check.cjs
```

本仓库 GitHub Pages 使用 **main 分支 / 根目录**，`.nojekyll` 关闭 Jekyll 处理。修改后推送即可触发部署。Fork 后在 **Settings → Pages → Deploy from a branch → main → /(root)** 开启；再把 HTML 中指向本仓库的源码 / 下载链接替换成自己的地址。页面内部均为相对路径，可部署到任意子目录。

参考：[GitHub Pages 官方部署说明](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)。
