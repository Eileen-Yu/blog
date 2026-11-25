import { defineConfig } from 'astro/config';

// Output stays `public/` so an existing Cloudflare Pages project that
// publishes that folder keeps working. Build command becomes `npm run build`.
export default defineConfig({
  site: 'https://eileenyu.dev',
  outDir: 'public',
  publicDir: 'static',
  trailingSlash: 'always',
  redirects: {
    // The LinkedIn post used hyphens; Hexo's real URL keeps the spaces.
    '/2026/11/23/Building-AI-Werewolf-with-Dapr-Workflow': '/2026/11/23/Building AI Werewolf with Dapr Workflow/',
  },
  markdown: {
    shikiConfig: { theme: 'github-light' },
  },
});
