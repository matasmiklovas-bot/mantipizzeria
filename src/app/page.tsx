import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { About } from "@/components/landing/About";
import { Contact } from "@/components/landing/Contact";
import { HomeScrollReset } from "@/components/landing/HomeScrollReset";

export default function HomePage() {
  return (
    <>
      <HomeScrollReset />
      <Header variant="landing" />
      <main>
        <Hero />
        <About />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
