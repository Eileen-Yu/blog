import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Posts stay where Hexo kept them. The id is the file name, so URLs match the old site.
const posts = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: './source/_posts',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    categories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { posts };
