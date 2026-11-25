import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { allPosts, postUrl, excerpt, SITE } from '../lib';

export async function GET(context: APIContext) {
  const posts = await allPosts();
  return rss({
    title: SITE.title,
    description: SITE.subtitle,
    site: context.site!,
    items: posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      link: postUrl(p),
      description: excerpt(p, 300),
    })),
  });
}
