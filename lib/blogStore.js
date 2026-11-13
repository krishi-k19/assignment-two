import path from "path";
import { nextId, readJsonArray, writeJsonArrayAtomic } from "./jsonStore";

export const BLOG_POSTS_PATH = path.join(
  process.cwd(),
  "data",
  "blog-posts.json"
);

const MAX_LENGTHS = {
  slug: 80,
  title: 200,
  excerpt: 500,
  content: 50000,
  tag: 30,
  tags: 10,
};
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readString(raw, label, errors, { required = false } = {}) {
  if (raw === undefined || raw === null) {
    if (required) {
      errors[label.toLowerCase()] = `${label} is required.`;
    }
    return "";
  }
  if (typeof raw !== "string") {
    errors[label.toLowerCase()] = `${label} must be a string.`;
    return "";
  }
  const value = raw.trim();
  if (!value && required) {
    errors[label.toLowerCase()] = `${label} is required.`;
    return "";
  }
  return value;
}

function checkLength(value, label, errors, max) {
  if (value.length > max) {
    errors[label.toLowerCase()] = `${label} must be at most ${max} characters.`;
  }
}

function parseIsPublic(raw, errors) {
  if (raw === undefined) {
    return undefined;
  }
  if (typeof raw === "boolean") {
    return raw;
  }
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }
  errors.isPublic = "isPublic must be a boolean.";
  return undefined;
}

function slugifyTitle(title) {
  const slug = String(title)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_LENGTHS.slug)
    .replace(/-+$/g, "");
  return slug || "post";
}

function uniqueSlug(base, posts, excludeId = null) {
  const taken = new Set(
    posts.filter((post) => post.id !== excludeId).map((post) => post.slug)
  );
  if (!taken.has(base)) {
    return base;
  }
  let n = 2;
  while (taken.has(`${base}-${n}`)) {
    n += 1;
  }
  return `${base}-${n}`;
}

function normalizeTags(value) {
  if (value === undefined || value === null) {
    return { tags: [] };
  }
  if (!Array.isArray(value)) {
    return { error: "Tags must be a list of strings." };
  }
  const tags = [];
  for (const raw of value) {
    if (typeof raw !== "string") {
      return { error: "Tags must be a list of strings." };
    }
    const tag = raw.trim();
    if (!tag) {
      continue;
    }
    if (tag.length > MAX_LENGTHS.tag) {
      return {
        error: `Each tag must be at most ${MAX_LENGTHS.tag} characters.`,
      };
    }
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
    if (tags.length > MAX_LENGTHS.tags) {
      return { error: `At most ${MAX_LENGTHS.tags} tags are allowed.` };
    }
  }
  return { tags };
}

function validateBlogInput(body) {
  const errors = {};
  const title = readString(body.title, "Title", errors, { required: true });
  if (title) {
    checkLength(title, "Title", errors, MAX_LENGTHS.title);
  }
  const slug = readString(body.slug, "Slug", errors).toLowerCase();
  if (slug && !errors.slug) {
    checkLength(slug, "Slug", errors, MAX_LENGTHS.slug);
    if (!errors.slug && !SLUG_PATTERN.test(slug)) {
      errors.slug =
        "Slug may only contain lowercase letters, numbers, and hyphens.";
    }
  }
  const excerpt = readString(body.excerpt, "Excerpt", errors);
  if (excerpt) {
    checkLength(excerpt, "Excerpt", errors, MAX_LENGTHS.excerpt);
  }
  const content = readString(body.content, "Content", errors, {
    required: true,
  });
  if (content) {
    checkLength(content, "Content", errors, MAX_LENGTHS.content);
  }
  const tagsResult = normalizeTags(body.tags);
  if (tagsResult.error) {
    errors.tags = tagsResult.error;
  }
  const isPublicRaw = parseIsPublic(body.isPublic, errors);
  const isPublic = isPublicRaw === undefined ? true : isPublicRaw;
  return {
    errors,
    fields: { title, slug, excerpt, content },
    isPublic,
    tags: tagsResult.tags ?? [],
  };
}

function validateBlogUpdate(body) {
  const patch = {};
  const errors = {};
  let hasAny = false;

  if (body.title !== undefined) {
    hasAny = true;
    const title = readString(body.title, "Title", errors, { required: true });
    if (title) {
      checkLength(title, "Title", errors, MAX_LENGTHS.title);
    }
    if (!errors.title && title) {
      patch.title = title;
    }
  }
  if (body.slug !== undefined) {
    hasAny = true;
    const slug = readString(body.slug, "Slug", errors).toLowerCase();
    if (slug && !errors.slug) {
      checkLength(slug, "Slug", errors, MAX_LENGTHS.slug);
      if (!errors.slug && !SLUG_PATTERN.test(slug)) {
        errors.slug =
          "Slug may only contain lowercase letters, numbers, and hyphens.";
      } else if (!errors.slug) {
        patch.slug = slug;
      }
    }
  }
  if (body.excerpt !== undefined) {
    hasAny = true;
    const excerpt = readString(body.excerpt, "Excerpt", errors);
    if (excerpt) {
      checkLength(excerpt, "Excerpt", errors, MAX_LENGTHS.excerpt);
    }
    if (!errors.excerpt) {
      patch.excerpt = excerpt;
    }
  }
  if (body.content !== undefined) {
    hasAny = true;
    const content = readString(body.content, "Content", errors, {
      required: true,
    });
    if (content) {
      checkLength(content, "Content", errors, MAX_LENGTHS.content);
    }
    if (!errors.content && content) {
      patch.content = content;
    }
  }
  if (body.tags !== undefined) {
    hasAny = true;
    const tagsResult = normalizeTags(body.tags);
    if (tagsResult.error) {
      errors.tags = tagsResult.error;
    } else {
      patch.tags = tagsResult.tags;
    }
  }
  const isPublic = parseIsPublic(body.isPublic, errors);
  if (body.isPublic !== undefined) {
    hasAny = true;
    if (isPublic !== undefined) {
      patch.isPublic = isPublic;
    }
  }
  if (!hasAny) {
    errors.form = "Provide at least one field to update.";
  }
  return { errors, patch };
}

async function createBlogPost(fields, tags, isPublic) {
  const posts = await readJsonArray(BLOG_POSTS_PATH);
  const now = new Date().toISOString();
  const post = {
    id: nextId(posts),
    slug: uniqueSlug(fields.slug || slugifyTitle(fields.title), posts, null),
    title: fields.title,
    excerpt: fields.excerpt,
    content: fields.content,
    tags,
    isPublic,
    createdAt: now,
    updatedAt: now,
  };
  posts.push(post);
  await writeJsonArrayAtomic(BLOG_POSTS_PATH, posts);
  return post;
}

async function updateBlogPost(id, patch) {
  const posts = await readJsonArray(BLOG_POSTS_PATH);
  const index = posts.findIndex((post) => post.id === id);
  if (index === -1) {
    return null;
  }
  const current = posts[index];
  const updated = {
    ...current,
    ...patch,
    slug: patch.slug ? uniqueSlug(patch.slug, posts, id) : current.slug,
    updatedAt: new Date().toISOString(),
  };
  posts[index] = updated;
  await writeJsonArrayAtomic(BLOG_POSTS_PATH, posts);
  return updated;
}

async function deleteBlogPost(id) {
  const posts = await readJsonArray(BLOG_POSTS_PATH);
  const index = posts.findIndex((post) => post.id === id);
  if (index === -1) {
    return false;
  }
  posts.splice(index, 1);
  await writeJsonArrayAtomic(BLOG_POSTS_PATH, posts);
  return true;
}

async function listBlogPosts({ publicOnly }) {
  const posts = await readJsonArray(BLOG_POSTS_PATH);
  const visible = publicOnly
    ? posts.filter((post) => post.isPublic)
    : posts;
  return [...visible].sort((a, b) =>
    String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))
  );
}

export {
  createBlogPost,
  deleteBlogPost,
  listBlogPosts,
  slugifyTitle,
  updateBlogPost,
  validateBlogInput,
  validateBlogUpdate,
};
