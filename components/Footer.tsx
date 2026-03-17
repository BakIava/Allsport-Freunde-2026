"use client";

import { Mail, Phone, MapPin } from "lucide-react";
import { motion } from "framer-motion";

export default function Footer() {
  return (
    <footer id="kontakt" className="bg-gray-900 text-gray-300">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-10"
        >
          {/* Verein */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">
              Allsport Freunde 2026 e.V.
            </h3>
            <p className="text-sm leading-relaxed">
              Gemeinnütziger Sportverein in der Rhein-Main-Region. Sport
              verbindet – und wir bringen Menschen zusammen.
            </p>
          </div>

          {/* Kontakt */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">Kontakt</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-green-400" />
                <a
                  href="mailto:info@allsport-freunde.de"
                  className="hover:text-white transition-colors"
                >
                  info@allsport-freunde.de
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-green-400" />
                <a
                  href="tel:+4969123456"
                  className="hover:text-white transition-colors"
                >
                  +49 (0) 69 123 456
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-green-400 mt-0.5" />
                <span>
                  Musterstraße 42
                  <br />
                  60000 Frankfurt am Main
                </span>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">Folge uns</h3>
            <div className="flex gap-3">
              {["Instagram", "Facebook", "WhatsApp"].map((platform) => (
                <a
                  key={platform}
                  href="#"
                  className="w-10 h-10 bg-gray-800 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors text-sm font-medium"
                  aria-label={platform}
                >
                  {platform[0]}
                </a>
              ))}
            </div>
            <p className="text-sm mt-4 text-gray-500">
              Folge uns auf Social Media für aktuelle Updates und Neuigkeiten.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500">
          <p>&copy; 2026 Allsport Freunde 2026 e.V. – Gemeinnütziger Verein</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">
              Impressum
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Datenschutz
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
