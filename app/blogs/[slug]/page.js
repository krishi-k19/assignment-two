import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchPublicBlogPosts } from "@/lib/publicPosts";
import { formatDate } from "@/lib/formatDate";
import seededPosts from "@/data/blog-posts.json";

export async function generateStaticParams() {
  return seededPosts
    .filter((post) => post.isPublic)
    .map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = seededPosts.find(
    (item) => item.slug === slug && item.isPublic
  );
  return { title: post ? post.title : "Blog" };
}

async function BlogPostContent({ params }) {
  const { slug } = await params;
  let publicPosts;
  try {
    publicPosts = await fetchPublicBlogPosts();
  } catch {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Could not load this post. Please try again later.
      </p>
    );
  }
  const post = publicPosts.find((item) => item.slug === slug);
  if (!post) {
    notFound();
  }
  const paragraphs = String(post.content ?? "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <article className="flex flex-col gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">{post.title}</h1>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {formatDate(post.createdAt)}
        {post.tags?.length ? ` · ${post.tags.join(" · ")}` : ""}
      </p>
      {post.excerpt && (
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          {post.excerpt}
        </p>
      )}
      <div className="flex flex-col gap-4">
        {paragraphs.map((paragraph, index) => (
          <p
            key={index}
            className="whitespace-pre-line text-zinc-600 dark:text-zinc-400"
          >
            {paragraph}
          </p>
        ))}
      </div>
      <Link
        href="/blogs"
        className="mt-6 w-fit text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400"
      >
        Back to all posts
      </Link>
    </article>
  );
}

export default function BlogPostPage({ params }) {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Loading post...
        </p>
      }
    >
      <BlogPostContent params={params} />
    </Suspense>
  );
}
