import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#000212] text-white">
      <Header />
      <Hero />
      {/* We will add Section 2 (USPs) here next */}
    </main>
  );
}