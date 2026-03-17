"use client";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
  {
    question: "Was muss ich mitbringen?",
    answer:
      "Das hängt vom jeweiligen Event ab. Bei jedem Event findest du eine Angabe zur Kleiderordnung bzw. was du mitbringen solltest. Generell empfehlen wir: Sportkleidung, Trinkflasche und gute Laune! Für Schwimm-Events benötigst du Badebekleidung und ein Handtuch.",
  },
  {
    question: "Kostet die Teilnahme etwas?",
    answer:
      "Viele unserer Events sind komplett kostenlos. Bei einigen Events fällt ein kleiner Unkostenbeitrag an, z.B. für Hallenbad-Eintritt. Die genauen Kosten findest du bei jedem Event. Unser Ziel ist es, Sport für alle zugänglich zu machen – Geld soll kein Hindernis sein. Sprich uns an, wenn du Fragen hast.",
  },
  {
    question: "Für wen sind die Events geeignet?",
    answer:
      "Unsere Events richten sich an alle – unabhängig von Alter, Geschlecht, Herkunft oder sportlicher Erfahrung. Ob Anfänger oder Fortgeschrittene: Bei uns findet jeder das passende Angebot. Kinder sind in Begleitung eines Erwachsenen herzlich willkommen.",
  },
  {
    question: "Wie kann ich den Verein unterstützen?",
    answer:
      "Es gibt viele Möglichkeiten! Du kannst Mitglied werden, bei der Organisation von Events helfen, als Trainer oder Betreuer mitwirken, oder den Verein durch eine Spende unterstützen. Wir freuen uns über jede Form der Unterstützung. Kontaktiere uns einfach!",
  },
  {
    question: "Kann ich jemanden mitbringen?",
    answer:
      "Ja, auf jeden Fall! Bei der Anmeldung kannst du angeben, wie viele Personen du mitbringst. Bitte beachte, dass die Plätze begrenzt sind und auch für deine Begleitung ein Platz reserviert werden muss.",
  },
];

export default function GeneralInfo() {
  return (
    <section id="infos" className="py-20 px-4 bg-white">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Häufige Fragen
          </h2>
          <div className="w-16 h-1 bg-green-500 mx-auto mb-8 rounded-full" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Accordion>
            {faqs.map((faq, index) => (
              <AccordionItem key={index} defaultOpen={index === 0}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
