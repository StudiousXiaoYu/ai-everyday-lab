/* Browser-local BM25 retrieval. Also exported for dependency-free Node checks. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LocalSearch = api;
})(globalThis, function () {
  "use strict";
  function tokens(text) {
    const normalized = String(text).toLowerCase().normalize("NFKC");
    const result = normalized.match(/[a-z0-9]+/g) || [];
    for (const run of normalized.match(/[\u3400-\u9fff]+/g) || []) {
      if (run.length === 1) result.push(run);
      else
        for (let i = 0; i < run.length - 1; i++)
          result.push(run.slice(i, i + 2));
    }
    return result;
  }
  function chunks(doc) {
    const result = [];
    let heading = doc.title,
      parts = [];
    function flush() {
      const text = parts.join("\n").trim();
      if (text)
        result.push({
          docId: doc.id,
          title: doc.title,
          category: doc.category,
          tags: doc.tags,
          heading,
          text,
          id: `${doc.id}:${result.length + 1}`,
        });
      parts = [];
    }
    for (const line of doc.content.split(/\r?\n/)) {
      if (/^#{1,3}\s/.test(line)) {
        flush();
        heading = line.replace(/^#+\s/, "").trim();
      } else parts.push(line);
    }
    flush();
    return result;
  }
  function create(documents) {
    const sections = documents.flatMap(chunks);
    const rows = sections.map((section) => {
      const terms = tokens(
        `${section.heading} ${section.heading} ${section.title} ${section.tags.join(" ")} ${section.text}`,
      );
      const freq = new Map();
      terms.forEach((t) => freq.set(t, (freq.get(t) || 0) + 1));
      return { ...section, freq, length: terms.length };
    });
    const df = new Map();
    rows.forEach((row) =>
      row.freq.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1)),
    );
    const average =
      rows.reduce((n, row) => n + row.length, 0) / (rows.length || 1);
    return {
      sections,
      search(query, limit = 5) {
        const queryTerms = [...new Set(tokens(query))];
        if (!queryTerms.length) return [];
        return rows
          .map((row) => {
            let score = 0,
              matched = 0;
            for (const term of queryTerms) {
              const tf = row.freq.get(term) || 0;
              if (!tf) continue;
              matched++;
              const idf = Math.log(
                1 +
                  (rows.length - (df.get(term) || 0) + 0.5) /
                    ((df.get(term) || 0) + 0.5),
              );
              score +=
                (idf * tf * 2.5) /
                (tf + 1.5 * (1 - 0.75 + (0.75 * row.length) / average));
            }
            const coverage = matched / queryTerms.length;
            return { ...row, score: score * (0.55 + coverage), coverage };
          })
          .filter(
            (r) =>
              r.score > 0.5 &&
              (queryTerms.length <= 2 ? r.coverage >= 0.5 : r.coverage >= 0.16),
          )
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
          .map(({ freq, length, ...r }) => r);
      },
    };
  }
  return { tokens, chunks, create };
});
