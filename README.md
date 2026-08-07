# GoCode

GoCode is a personal programming learning site for 毛毛张. It is built with VuePress 2 and VuePress Theme Hope, and is deployed with GitHub Pages at:

```text
https://gocode.mmzhang.cn/
```

The site collects programming notes, official documentation links, AI application development material, backend knowledge, algorithms, computer fundamentals, frontend basics, developer tools, resource navigation, and site maintenance notes.

## Tech Stack

- VuePress 2
- VuePress Theme Hope
- Vite bundler
- Markdown content under `src/`
- GitHub Pages deployment from the `gh-pages` branch
- Custom domain through `src/.vuepress/public/CNAME`
- Giscus comments through GitHub Discussions
- SlimSearch local full-text search
- Umami Cloud analytics

## Project Layout

```text
gocode/
├── src/
│   ├── README.md                  # site home page
│   ├── backend/                   # backend development notes
│   ├── algorithm/                 # algorithms and data structures
│   ├── computer-fundamentals/     # network and operating system notes
│   ├── frontend/                  # frontend basics
│   ├── tools/                     # developer tools
│   ├── ai-application-development/# AI app development notes
│   ├── learning-paths/            # learning routes
│   ├── resources/                 # curated resource navigation page
│   ├── site-guide/                # site maintenance guide
│   └── .vuepress/
│       ├── config.ts              # base path, head scripts, theme entry
│       ├── theme.ts               # theme, plugins, search, comments, redirects
│       ├── navbar.ts              # top navigation
│       ├── sidebar.ts             # sidebar entry rules
│       ├── public/                # static assets, CNAME, .nojekyll
│       └── styles/                # theme style overrides
├── package.json
├── package-lock.json
└── deploy.sh
```

## Common Commands

Install dependencies:

```bash
npm install
```

Run local preview:

```bash
npm run docs:dev
```

Run local preview with a clean VuePress cache:

```bash
npm run docs:clean-dev
```

Build before publishing:

```bash
npm run docs:build
```

Publish source and generated pages:

```bash
npm run docs:build && ./deploy.sh
```

## Content Rules

- Write public site content under `src/`.
- Use `README.md` as the index page for a directory.
- Put article metadata in frontmatter, especially `title`, `shortTitle`, `order`, `icon`, `category`, and `tag`.
- Use `order` to control article order inside the automatically generated sidebar.
- Add a new top-level section to `src/.vuepress/navbar.ts` and `src/.vuepress/sidebar.ts` only when the site gains a real new section.
- Keep ordinary articles out of the top navigation; let the sidebar own normal article discovery.
- Put shared static assets in `src/.vuepress/public/`.
- Prefer Chinese documentation URLs on the resource navigation page when an official Chinese page exists.
- Curate resources instead of dumping links. Avoid low-quality, duplicated, or rarely useful sites.

## Site Configuration

Current domain configuration:

```text
src/.vuepress/config.ts       base: "/"
src/.vuepress/theme.ts        hostname: "https://gocode.mmzhang.cn"
src/.vuepress/public/CNAME    gocode.mmzhang.cn
```

Current Aliyun DNS record:

```text
gocode.mmzhang.cn -> CNAME -> zzxrepository.github.io
```

Do not change `base`, `hostname`, or `CNAME` unless the deployment domain changes.

Current site enhancements:

- Search: `@vuepress/plugin-slimsearch`, configured in `src/.vuepress/theme.ts`.
- Comments: Giscus, configured in `src/.vuepress/theme.ts`.
- Analytics: Umami Cloud script, configured in `src/.vuepress/config.ts`.

## Maintenance Workflow For AI Assistants

When updating this project, start by reading this file and `src/site-guide/README.md`.

For content-only updates:

1. Edit the relevant Markdown files under `src/`.
2. Check frontmatter and sidebar ordering.
3. If resource links are added, review the whole resource category for quality, language, duplication, and usefulness.
4. Run `npm run docs:build`.
5. Commit the source changes to `master`.
6. Push `master`.
7. Deploy the built site to `gh-pages`.
8. Verify that the generated site still contains `CNAME` and `.nojekyll`.

For configuration updates:

1. Identify whether the change belongs in `config.ts`, `theme.ts`, `navbar.ts`, `sidebar.ts`, styles, or static assets.
2. Update the site maintenance guide when the change affects future operation.
3. Run `npm run docs:build`.
4. Push source and deploy `gh-pages`.
5. Check the affected public page after deployment.

Important habits:

- Do not revert unrelated local changes.
- Do not remove `src/.vuepress/public/CNAME`.
- Do not remove `src/.vuepress/public/.nojekyll`.
- Do not mix multiple comment systems unless the owner explicitly requests it.
- Keep the root README focused on repository operation; keep long site-building explanations in `src/site-guide/README.md`.

## More Details

The full site-building and article-publishing guide lives at:

```text
src/site-guide/README.md
```

