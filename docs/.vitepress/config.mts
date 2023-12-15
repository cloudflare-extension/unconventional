import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Unconventional",
  description: "A lightweight query builder for postgres",
  base: '/unconventional/',
  appearance: {
    initialValue: 'dark'
  },
  markdown: {
    toc: { level: [1, 2, 3] }
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' }
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/getting-started' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/cloudflare-extension/unconventional' },
      {
        icon: {
          svg: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>npm</title><path d="M0 7.5V15.75H6.75V17.25H12V15.75H24V7.5H0ZM1.33301 8.83301H6.6665H6.66797V14.584H5.3335V10.1675H4.00049V14.584H1.33301V8.83301ZM8.00098 8.83301H13.333H13.3345V14.5825H10.667V15.917H8.00098V8.83301ZM14.6675 8.83301H22.667H22.6685V14.584H21.334V10.1675H20.001V14.584H18.668V10.1675H17.3335V14.584H14.6675V8.83301ZM10.667 10.1675V13.251H12V10.1675H10.667Z"/></svg>'
        },
        link: 'https://www.npmjs.com/package/unconventional',
        ariaLabel: 'npm'
      }
    ],
    outline: { level: [2,3] },
    search: {
      provider: 'local'
    }
  }
})
