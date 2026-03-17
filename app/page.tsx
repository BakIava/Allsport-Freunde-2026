import Hero from "@/components/Hero";
import AboutUs from "@/components/AboutUs";
import EventGrid from "@/components/EventGrid";
import GeneralInfo from "@/components/GeneralInfo";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <AboutUs />
      <EventGrid />
      <GeneralInfo />
      <Footer />
    </main>
  );
}
