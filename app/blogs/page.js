import { Suspense } from "react";
import Link from "next/link";
import { fetchPublicBlogPosts } from "@/lib/publicPosts";
import { formatDate } from "@/lib/formatDate";

export const metadata = {
  title: "Blog",
};

function BlogCard({ post }) {
  return (
    <Link
      href={`/blogs/${post.slug}`}
      className="group flex flex-col gap-1 rounded-lg border border-zinc-200 p-5 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      <h2 className="text-lg font-semibold tracking-tight group-hover:underline">
        {post.title}
      </h2>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {formatDate(post.createdAt)}
        {post.tags?.length ? ` · ${post.tags.join(" · ")}` : ""}
      </p>
      {post.excerpt && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {post.excerpt}
        </p>
      )}
    </Link>
  );
}

async function BlogList() {
  let posts;
  try {
    posts = await fetchPublicBlogPosts();
  } catch {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Could not load blog posts. Please try again later.
      </p>
    );
  }
  if (posts.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No posts yet. Check back soon.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {posts.map((post) => (
        <BlogCard key={post.id} post={post} />
      ))}
    </div>
  );
}

export default function BlogsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Blog</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Notes on data, AI, and things I am building and learning.
        </p>
      </div>
      <Suspense
        fallback={
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Loading posts...
          </p>
        }
      >
        <BlogList />
      </Suspense>
    </div>
  );
}
