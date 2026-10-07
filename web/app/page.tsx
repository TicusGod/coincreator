import { CreateCoinForm } from "@/components/CreateCoinForm";

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden px-4 pb-8 pt-16">
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-[#fafafa] sm:text-5xl lg:text-6xl">Launch Your Own Coin</h1>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-[#696e77] sm:text-lg">Launch your own token on Solana in seconds. No coding required.</p>
        </div>
      </section>
      <section className="px-4 pb-16">
        <div className="mx-auto max-w-2xl">
          <CreateCoinForm />
        </div>
      </section>
    </>
  );
}
