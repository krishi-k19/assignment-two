"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-400";

export default function LoginForm() {
  const router = useRouter();
  const [status, setStatus] = useState("idle");
  const [formError, setFormError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("submitting");
    setFormError("");
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.get("username"),
          password: formData.get("password"),
        }),
      });
      let body = {};
      try {
        body = await response.json();
      } catch {
        setFormError(
          `Unexpected server response (HTTP ${response.status}). Please reload the page and try again.`
        );
        setStatus("idle");
        return;
      }
      if (response.ok) {
        router.replace("/admin/blogs");
        router.refresh();
        return;
      }
      setFormError(body.error ?? "Sign-in failed. Please try again.");
      setStatus("idle");
    } catch (error) {
      setFormError(
        error instanceof TypeError
          ? "Could not reach the server. Is it still running? Reload and try again."
          : "Sign-in failed. Please try again."
      );
      setStatus("idle");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="admin-username" className="text-sm font-medium">
          Username
        </label>
        <input
          id="admin-username"
          name="username"
          type="text"
          autoComplete="username"
          required
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="admin-password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>
      {formError && (
        <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
      )}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-fit rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-50"
      >
        {status === "submitting" ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
