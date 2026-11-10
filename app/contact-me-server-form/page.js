import ContactForm from "@/components/ContactForm";

export const metadata = {
  title: "Contact Me",
};

export default function ContactMePage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Contact Me</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Fill out the form below and your message will be saved on the server.
        </p>
      </div>
      <ContactForm />
    </div>
  );
}
