# Playblast documentation site

This is the static documentation site toolchain for Playblast. Public Markdown lives in `../docs`; site configuration and publishing concerns stay here.

## Local development

From the repository root:

```bash
npm run docs:dev
```

Build and preview the production site with:

```bash
npm run docs:build
npm run docs:preview
```

The generated site is not part of the Playblast Docker image. GitHub Actions publishes it independently to GitHub Pages.
