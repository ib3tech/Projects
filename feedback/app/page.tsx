import Image from "next/image";
import FeedbackForm from "@/components/FeedbackForm";
import logo from "@/public/homelink-logo.png";

export default function Page() {
  return (
    <>
      <header className="px-4 pt-6 pb-2">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          {/* Cream badge so the navy wordmark stays readable on the dark theme. */}
          <div className="rounded-3xl bg-cream px-5 py-4 shadow-sm ring-1 ring-black/5">
            <Image src={logo} alt="HomeLink" priority className="h-auto w-44 sm:w-52" />
          </div>
          <p className="mt-3 font-display text-lg italic text-muted">
            your property back home, handled.
          </p>
        </div>
      </header>
      <main className="px-4 pb-16">
        <FeedbackForm />
      </main>
    </>
  );
}
