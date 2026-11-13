import { Suspense } from "react";
import { connection } from "next/server";
import { isAuthorizedFromHeaders } from "@/lib/auth";
import AdminGate from "@/components/AdminGate";
import BlogAdmin from "@/components/BlogAdmin";

export const metadata = {
  title: "Blog Admin",
};

function AdminFallback() {
  return (
    <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading...</p>
  );
}

async function AdminContent() {
  await connection();
  const authorized = await isAuthorizedFromHeaders();
  if (!authorized) {
    return <AdminGate />;
  }
  return <BlogAdmin />;
}

export default function AdminBlogsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Blog Admin</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Create, edit, and publish posts for your blog.
        </p>
      </div>
      <Suspense fallback={<AdminFallback />}>
        <AdminContent />
      </Suspense>
    </div>
  );
}
