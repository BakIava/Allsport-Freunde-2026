import Hero from "@/components/home/Hero";
import AboutUs from "@/components/home/AboutUs";
import EventGrid from "@/components/events/EventGrid";
import GeneralInfo from "@/components/home/GeneralInfo";
import Footer from "@/components/shared/Footer";

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
