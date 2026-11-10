"use client";

import { useState } from "react";

export default function ContactForm() {
  const [status, setStatus] = useState("idle");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("submitting");
    setFieldErrors({});
    setFormError("");

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          message: formData.get("message"),
        }),
      });
      const body = await response.json();
      if (response.status === 201) {
        setStatus("success");
        return;
      }
      if (response.status === 400) {
        setFieldErrors(body.errors ?? {});
        setFormError(body.error ?? "");
        setStatus("error");
        return;
      }
      setFormError(body.error ?? "Something went wrong. Please try again.");
      setStatus("error");
    } catch {
      setFormError("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
        Thanks for reaching out! Your message has been received.
      </p>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-400";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input id="name" name="name" type="text" required className={inputClass} />
        {fieldErrors.name && (
          <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.name}</p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input id="email" name="email" type="email" required className={inputClass} />
        {fieldErrors.email && (
          <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="message" className="text-sm font-medium">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          className={inputClass}
        />
        {fieldErrors.message && (
          <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.message}</p>
        )}
      </div>
      {formError && (
        <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
      )}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-fit rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-50"
      >
        {status === "submitting" ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
