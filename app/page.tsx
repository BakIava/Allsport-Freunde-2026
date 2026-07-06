import Hero from "@/components/home/hero";
import AboutUs from "@/components/home/about-us";
import EventGrid from "@/components/events/event-grid";
import GeneralInfo from "@/components/home/general-info";
import Footer from "@/components/shared/footer";

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
