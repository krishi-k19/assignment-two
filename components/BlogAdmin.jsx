"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDate } from "@/lib/formatDate";

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-400";
const labelClass = "text-sm font-medium";
const errorClass = "text-xs text-red-600 dark:text-red-400";
const buttonClass =
  "w-fit rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-50";
const secondaryButtonClass =
  "rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800";
const deleteButtonClass =
  "rounded-full border border-red-300 px-4 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950";

function badgeClass(isPublic) {
  return `rounded-full px-2.5 py-0.5 text-xs font-medium ${
    isPublic
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
  }`;
}

function emptyDraft() {
  return {
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    tags: "",
    isPublic: true,
  };
}

function draftFromPost(post) {
  return {
    title: post.title ?? "",
    slug: post.slug ?? "",
    excerpt: post.excerpt ?? "",
    content: post.content ?? "",
    tags: (post.tags ?? []).join(", "),
    isPublic: Boolean(post.isPublic),
  };
}

export default function BlogAdmin() {
  const [posts, setPosts] = useState(null);
  const [listError, setListError] = useState("");
  const [editor, setEditor] = useState(null);
  const [status, setStatus] = useState("idle");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const fetchPosts = useCallback(async () => {
    const response = await fetch("/api/blogs", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error ?? "Could not load blog posts.");
    }
    return body.posts;
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchPosts()
      .then((loaded) => {
        if (!cancelled) {
          setPosts(loaded);
          setListError("");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setListError(
            error?.message || "Network error. Could not load blog posts."
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPosts]);

  const refreshPosts = useCallback(async () => {
    try {
      const loaded = await fetchPosts();
      setPosts(loaded);
      setListError("");
    } catch (error) {
      setListError(
        error?.message || "Network error. Could not load blog posts."
      );
    }
  }, [fetchPosts]);

  function openNew() {
    setEditor({ mode: "new", draft: emptyDraft() });
    setFieldErrors({});
    setFormError("");
  }

  function openEdit(post) {
    setEditor({ mode: "edit", id: post.id, draft: draftFromPost(post) });
    setFieldErrors({});
    setFormError("");
  }

  function closeEditor() {
    setEditor(null);
    setFieldErrors({});
    setFormError("");
  }

  function updateDraft(key, value) {
    setEditor((current) => ({
      ...current,
      draft: { ...current.draft, [key]: value },
    }));
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!editor) {
      return;
    }
    setStatus("saving");
    setFieldErrors({});
    setFormError("");
    const draft = editor.draft;
    const payload = {
      title: draft.title,
      slug: draft.slug,
      excerpt: draft.excerpt,
      content: draft.content,
      tags: draft.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      isPublic: draft.isPublic,
    };
    try {
      const response = await fetch(
        editor.mode === "new" ? "/api/blogs" : `/api/blogs/${editor.id}`,
        {
          method: editor.mode === "new" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const body = await response.json();
      if (response.status === 201 || response.status === 200) {
        setEditor(null);
        setStatus("idle");
        await refreshPosts();
        return;
      }
      if (response.status === 400) {
        setFieldErrors(body.errors ?? {});
        setFormError(body.error ?? "");
        setStatus("idle");
        return;
      }
      setFormError(body.error ?? "Something went wrong. Please try again.");
      setStatus("idle");
    } catch {
      setFormError("Network error. Please try again.");
      setStatus("idle");
    }
  }

  async function handleToggleVisibility(post) {
    setBusyId(post.id);
    try {
      const response = await fetch(`/api/blogs/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !post.isPublic }),
      });
      if (!response.ok) {
        const body = await response.json();
        setListError(body.error ?? "Could not update visibility.");
        return;
      }
      await refreshPosts();
    } catch {
      setListError("Network error. Could not update visibility.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(post) {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) {
      return;
    }
    setBusyId(post.id);
    try {
      const response = await fetch(`/api/blogs/${post.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = await response.json();
        setListError(body.error ?? "Could not delete the post.");
        return;
      }
      await refreshPosts();
    } catch {
      setListError("Network error. Could not delete the post.");
    } finally {
      setBusyId(null);
    }
  }

  if (posts === null) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Loading posts...
        </p>
        {listError && <p className={errorClass}>{listError}</p>}
      </div>
    );
  }

  if (editor) {
    const isEdit = editor.mode === "edit";
    return (
      <form
        onSubmit={handleSave}
        className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800"
      >
        <h2 className="text-lg font-semibold">
          {isEdit ? "Edit post" : "New post"}
        </h2>
        <div className="flex flex-col gap-1">
          <label htmlFor="blog-title" className={labelClass}>
            Title
          </label>
          <input
            id="blog-title"
            type="text"
            required
            value={editor.draft.title}
            onChange={(event) => updateDraft("title", event.target.value)}
            className={inputClass}
          />
          {fieldErrors.title && (
            <p className={errorClass}>{fieldErrors.title}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="blog-slug" className={labelClass}>
            Slug
          </label>
          <input
            id="blog-slug"
            type="text"
            placeholder="auto-generated from the title"
            value={editor.draft.slug}
            onChange={(event) => updateDraft("slug", event.target.value)}
            className={inputClass}
          />
          {fieldErrors.slug && <p className={errorClass}>{fieldErrors.slug}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="blog-excerpt" className={labelClass}>
            Excerpt (optional)
          </label>
          <input
            id="blog-excerpt"
            type="text"
            value={editor.draft.excerpt}
            onChange={(event) => updateDraft("excerpt", event.target.value)}
            className={inputClass}
          />
          {fieldErrors.excerpt && (
            <p className={errorClass}>{fieldErrors.excerpt}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="blog-content" className={labelClass}>
            Content
          </label>
          <textarea
            id="blog-content"
            rows={10}
            required
            value={editor.draft.content}
            onChange={(event) => updateDraft("content", event.target.value)}
            className={inputClass}
          />
          {fieldErrors.content && (
            <p className={errorClass}>{fieldErrors.content}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="blog-tags" className={labelClass}>
            Tags (comma-separated)
          </label>
          <input
            id="blog-tags"
            type="text"
            placeholder="Analytics, AI"
            value={editor.draft.tags}
            onChange={(event) => updateDraft("tags", event.target.value)}
            className={inputClass}
          />
          {fieldErrors.tags && <p className={errorClass}>{fieldErrors.tags}</p>}
        </div>
        <div className="flex items-center gap-2">
          <input
            id="blog-public"
            type="checkbox"
            checked={editor.draft.isPublic}
            onChange={(event) => updateDraft("isPublic", event.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="blog-public" className={labelClass}>
            Public (visible on the blog page)
          </label>
        </div>
        {formError && (
          <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={status === "saving"}
            className={buttonClass}
          >
            {status === "saving" ? "Saving..." : isEdit ? "Save changes" : "Publish post"}
          </button>
          <button
            type="button"
            onClick={closeEditor}
            disabled={status === "saving"}
            className={secondaryButtonClass}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {posts.length} post{posts.length === 1 ? "" : "s"}
        </h2>
        <button type="button" onClick={openNew} className={buttonClass}>
          New post
        </button>
      </div>
      {listError && (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <p>{listError}</p>
          <button
            type="button"
            onClick={refreshPosts}
            className={secondaryButtonClass}
          >
            Retry
          </button>
        </div>
      )}
      {posts.length === 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No blog posts yet. Click &quot;New post&quot; to write your first
          one.
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {posts.map((post) => (
          <li
            key={post.id}
            className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{post.title}</span>
              <span className={badgeClass(post.isPublic)}>
                {post.isPublic ? "Public" : "Private"}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              /blogs/{post.slug} · created {formatDate(post.createdAt)} ·
              updated {formatDate(post.updatedAt)}
            </p>
            {post.excerpt && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {post.excerpt}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openEdit(post)}
                className={secondaryButtonClass}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleToggleVisibility(post)}
                disabled={busyId === post.id}
                className={secondaryButtonClass}
              >
                {post.isPublic ? "Make private" : "Make public"}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(post)}
                disabled={busyId === post.id}
                className={deleteButtonClass}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
