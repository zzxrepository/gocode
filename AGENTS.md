# GoCode Agent Guide

## Start Here

Before changing this repository, read these files in order:

1. `AGENTS.md`
2. `README.md`
3. `src/site-guide/README.md`
4. The relevant section homepage and the target article

Follow existing frontmatter, directory, naming, and navigation conventions. Preserve unrelated user changes.

## Tutorial Content

- Write every tutorial as a self-contained, reader-facing article. It must make sense without access to the request or the conversation that led to it.
- Use the conversation only to understand the requested topic and scope. Do not include dialogue, user questions, planning notes, personal context, or phrases that address a previous conversation in the published article.
- Put a substantive tutorial in the correct learning category. Use accurate, stable terminology; consult primary sources when the subject is version-sensitive, technical, or externally specified.
- Substantive tutorials must include `## 前言` near the beginning and `## 总结` at the end. Use practical examples, prerequisites, caveats, and comparisons only when they help explain the topic.
- Add `## 参考资料` when sources materially support the tutorial. Prefer official documentation, specifications, and original project documentation. Include only sources actually used; do not add filler references.
- Keep the article's title, frontmatter, ordering, category, tags, and section headings consistent with nearby content.

## Verification and Publishing

Unless the user explicitly asks not to publish, every completed project change must be released:

1. Run `npm run docs:build`.
2. Commit the task-related source changes to `master` with an intentional message. Do not stage unrelated existing worktree changes.
3. Push `master` to `origin`.
4. Build and force-push the generated static site to `gh-pages` using `./deploy.sh` or the equivalent established deployment flow.
5. Confirm the working tree and branch state after publishing. Keep `src/.vuepress/public/CNAME` and `src/.vuepress/public/.nojekyll` in the deployed output.
