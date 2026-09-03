import { defineConfig } from 'vitepress'
import { fileURLToPath } from 'node:url'

const vuePath = fileURLToPath(new URL('../node_modules/vue', import.meta.url))

export default defineConfig({
  title: 'Playblast Docs',
  description: 'Self-hosted video proofing for studios.',
  lang: 'en-US',
  base: process.env.DOCS_BASE || '/Playblast/',
  srcDir: '../docs',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: false,
  vite: {
    resolve: {
      alias: { vue: vuePath }
    }
  },
  srcExclude: [
    'Playblast-MVP-Audit.md',
    'client-management-schema.md',
    'pilot-manual-verification.md',
    'phase-0/**',
    'release/**'
  ],
  themeConfig: {
    siteTitle: 'Playblast',
    nav: [
      { text: 'Get started', link: '/deployment/' },
      { text: 'GitHub', link: 'https://github.com/brzrk-motion/Playblast' }
    ],
    sidebar: [
      {
        text: 'Start here',
        items: [
          { text: 'Deployment guide', link: '/deployment/' },
          { text: 'Install on Linux or Synology', link: '/deployment/install-linux-nas' },
          { text: 'First-run onboarding', link: '/deployment/onboarding-walkthrough' },
          { text: 'Operator vs Admin', link: '/deployment/operator-responsibilities' }
        ]
      },
      {
        text: 'Operate Playblast',
        items: [
          { text: 'Roles, SMTP, and recovery', link: '/deployment/roles-smtp-recovery' },
          { text: 'Backup and restore', link: '/deployment/backup-restore' },
          { text: 'Migrations', link: '/deployment/migrations' },
          { text: 'Secrets and permissions', link: '/deployment/secrets' },
          { text: 'Upgrade and rollback', link: '/deployment/upgrade-rollback' }
        ]
      }
    ],
    search: { provider: 'local' },
    editLink: {
      pattern: 'https://github.com/brzrk-motion/Playblast/edit/development-mvp/docs/:path'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/brzrk-motion/Playblast' }
    ],
    footer: {
      message: 'Free, open-source, and self-hosted.',
      copyright: 'Playblast contributors'
    }
  }
})
