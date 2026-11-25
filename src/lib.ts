import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

export const SITE = {
  title: 'Eileen Yu',
  subtitle: 'still curious, even when it makes no sense',
  github: 'https://github.com/Eileen-Yu',
  twitter: 'https://twitter.com/eil7007',
  linkedin: 'https://www.linkedin.com/in/eileen-yu/',
};

export async function allPosts() {
  const posts = await getCollection('posts');
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

// Same as Hexo's :year/:month/:day/:title/ with the UTC date from front matter.
export function postParts(p: Post) {
  const d = p.data.date;
  return {
    year: String(d.getUTCFullYear()),
    month: String(d.getUTCMonth() + 1).padStart(2, '0'),
    day: String(d.getUTCDate()).padStart(2, '0'),
    slug: p.id,
  };
}

export function postUrl(p: Post) {
  const { year, month, day, slug } = postParts(p);
  return `/${year}/${month}/${day}/${encodeURI(slug)}/`;
}

// Hexo turns "Node.js" into "Node-js".
export const termSlug = (s: string) => s.replace(/[.\s]+/g, '-');

export function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function excerpt(p: Post, n = 220) {
  const text = (p.body ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#+\s.*$/gm, '')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > n ? text.slice(0, n).replace(/\s\S*$/, '') + '…' : text;
}
