import LoginForm from "@/components/LoginForm";

export const metadata = {
  title: "Admin Sign In",
};

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Admin Sign In</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Sign in to manage your blog posts.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
