"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, Activity, Heart } from "lucide-react";
import { motion } from "framer-motion";

const values = [
  {
    icon: Users,
    title: "Gemeinschaft",
    description:
      "Wir bringen Menschen zusammen – unabhängig von Herkunft, Alter oder sportlicher Erfahrung.",
  },
  {
    icon: Activity,
    title: "Bewegung",
    description:
      "Von Schwimmen über Fußball bis Fitness: Wir bieten ein breites Spektrum an Sportmöglichkeiten.",
  },
  {
    icon: Heart,
    title: "Inklusion",
    description:
      "Jeder ist willkommen. Wir schaffen einen Ort, der offen, modern und zugänglich für alle ist.",
  },
];

export default function AboutUs() {
  return (
    <section id="ueber-uns" className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Über uns
          </h2>
          <div className="w-16 h-1 bg-green-500 mx-auto mb-8 rounded-full" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-3xl mx-auto mb-16 space-y-4 text-gray-600 leading-relaxed"
        >
          <p>
            Die Idee hinter diesem Verein ist so einfach wie sie überzeugend
            ist: <strong>Sport verbindet.</strong> Er verbindet Menschen
            unterschiedlichster Herkunft, unterschiedlichsten Alters und mit
            unterschiedlichsten Interessen. Genau das soll hier, in der Region
            Rhein-Main, gelebt und gestaltet werden.
          </p>
          <p>
            Mit „Allsport Freunde 2026" entsteht ein Ort, an dem jeder
            willkommen ist – ob jung oder alt, Anfänger oder erfahrener
            Sportler. Ein breites Spektrum an Sportaktivitäten wird angeboten:
            vom Schwimmen über Fußball bis hin zu Fitness und vielem mehr. Ziel
            ist es, für jeden die passende Sportart und die passende
            Gemeinschaft zu finden.
          </p>
          <p>
            Warum gerade jetzt? Weil Bewegung, Gesundheit und Gemeinschaft
            wichtiger sind denn je. In einer Zeit, in der viele Menschen den
            Anschluss an aktive Freizeitgestaltung verloren haben, soll dieser
            Verein eine Anlaufstelle sein – modern, offen und zugänglich für
            alle.
          </p>
          <p>
            Warum gerade hier, in der Rhein-Main-Region? Weil diese Region
            pulsiert. Sie ist vielfältig, dynamisch und lebt von Menschen, die
            anpacken und Dinge bewegen wollen. Genau dieser Geist soll den
            Verein prägen.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {values.map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.1 * (index + 1) }}
            >
              <Card className="text-center h-full hover:shadow-md transition-shadow border-0 bg-green-50/50">
                <CardContent className="pt-8 pb-6 px-6">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-7 h-7 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {value.title}
                  </h3>
                  <p className="text-gray-600 text-sm">{value.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
