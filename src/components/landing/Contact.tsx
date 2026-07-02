"use client";

import { motion } from "framer-motion";
import { Phone, Mail, MapPin } from "lucide-react";

export function Contact() {
  return (
    <section id="kontaktai" className="py-24 md:py-32 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold text-black">
            Kur mus rasti
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-olive/10 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-olive" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Telefonas</h3>
                <a href="tel:+37063878788" className="text-black/60 hover:text-olive transition-colors">
                  +370 638 78788
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-olive/10 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-olive" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">El. paštas</h3>
                <a href="mailto:surelis00@gmail.com" className="text-black/60 hover:text-olive transition-colors">
                  surelis00@gmail.com
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-olive/10 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-olive" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Adresas</h3>
                <p className="text-black/60">
                  Vaivorykštės g. 53, Palanga, 00222
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl overflow-hidden card-shadow h-[400px] lg:h-auto"
          >
            <iframe
              src="https://maps.google.com/maps?q=Vaivorykštės+g.+53+Palanga&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: 400 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Manti Pizzeria vieta"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
