import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(
  defineConfig({
    title: 'Your Trusted Planner',
    description: 'Documentation and Help Center for Your Trusted Planner',

    head: [
      ['link', { rel: 'icon', href: '/favicon.ico' }]
    ],

    vite: {
      optimizeDeps: {
        include: ['mermaid'],
      },
      ssr: {
        noExternal: ['mermaid'],
      },
    },

    themeConfig: {
      logo: '/logo.svg',

      nav: [
        { text: 'Home', link: '/' },
        { text: 'Architecture', link: '/architecture/' },
        { text: 'Help Center', link: '/help/' },
        { text: 'Release Notes', link: '/releases/' }
      ],

      aside: 'left',

      sidebar: {
        '/architecture/': [
          {
            text: 'Architecture',
            collapsed: false,
            items: [
              { text: 'Overview', link: '/architecture/' },
              { text: 'C4 Diagrams', link: '/architecture/c4-diagrams' },
              { text: 'Entity Relationships', link: '/architecture/entity-relationships' },
              { text: 'DOCX Processing', link: '/architecture/docx-processing' }
            ]
          },
          {
            text: 'Technical Reference',
            collapsed: true,
            items: [
              { text: 'API Audit Report', link: '/architecture/api-audit' },
              { text: 'Implementation Summary', link: '/architecture/implementation-summary' }
            ]
          }
        ],
        '/help/': [
          {
            text: 'For Attorneys',
            collapsed: false,
            items: [
              { text: 'Getting Started', link: '/help/attorney/getting-started' },
              { text: 'Managing Clients', link: '/help/attorney/managing-clients' },
              { text: 'Journeys & Workflows', link: '/help/attorney/journeys-workflows' },
              { text: 'Documents', link: '/help/attorney/documents' },
              { text: 'Appointments', link: '/help/attorney/appointments' },
              { text: 'Administration', link: '/help/attorney/administration' }
            ]
          },
          {
            text: 'For Clients',
            collapsed: true,
            items: [
              { text: 'Getting Started', link: '/help/client/getting-started' },
              { text: 'Your Journeys', link: '/help/client/journeys' },
              { text: 'Your Documents', link: '/help/client/documents' },
              { text: 'Uploading Files', link: '/help/client/uploads' },
              { text: 'FAQ', link: '/help/client/faq' }
            ]
          }
        ],
        '/releases/': [
          {
            text: 'Release Notes',
            collapsed: false,
            items: [
              { text: 'Overview', link: '/releases/' },
              { text: 'Current Release', link: '/releases/current' }
            ]
          }
        ]
      },

      socialLinks: [
        { icon: 'github', link: 'https://github.com/your-org/ytp' }
      ],

      footer: {
        message: 'Your Trusted Planner Documentation'
        // copyright: 'Copyright © 2025 -'
      },

      search: {
        provider: 'local'
      },

      outline: {
        level: [2, 3]
      }
    },

    mermaid: {
      // Mermaid configuration
    },

    mermaidPlugin: {
      class: 'mermaid'
    },

    markdown: {
      lineNumbers: true
    }
  })
)
