import Nav from '@/components/Nav';
import Hero from '@/components/Hero';
import BannerBand from '@/components/BannerBand';
import Features from '@/components/Features';
import Showcase from '@/components/Showcase';
import Modules from '@/components/Modules';
import HowItWorks from '@/components/HowItWorks';
import Download from '@/components/Download';
import FAQ from '@/components/FAQ';
import Footer from '@/components/Footer';

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <section className="wrap">
          <BannerBand />
        </section>
        <Features />
        <Showcase />
        <Modules />
        <HowItWorks />
        <Download />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
