"use client";

import { motion } from "framer-motion";
import { Leaf, Flame, Clock, ChefHat } from "lucide-react";

const features = [
  {
    icon: Leaf,
    title: "Švieži ingredientai",
    description: "Kiekvieną dieną atrenkame geriausius sezoninius produktus",
  },
  {
    icon: Flame,
    title: "Itališka tešla",
    description: "Autentiška neapolietiška tešla, brandinama 48 valandas",
  },
  {
    icon: Clock,
    title: "Greitas aptarnavimas",
    description: "Jūsų picos paruošiamos per 15–25 minutes",
  },
  {
    icon: ChefHat,
    title: "Autentiški receptai",
    description: "Tradicioniniai receptai tiesiai iš Italijos",
  },
];

export function About() {
  return (
    <section id="apie" className="py-24 md:py-32 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-display text-3xl md:text-5xl font-bold text-black mb-6 leading-tight">
              Picos be
              <br />
              nereikalingų kalbų
            </h2>
            <p className="text-black/60 text-lg leading-relaxed mb-6">
              Manti Pizzeria kepa picas iš paprastų, gerų ingredientų. Tešla,
              padažas, sūris ir priedai. Viskas paruošta taip, kad būtų skanu,
              o ne sudėtinga.
            </p>
            <p className="text-black/60 text-lg leading-relaxed">
              Užsisakykite prie staliuko, o mes pasirūpinsime, kad karšta pica
              greitai pasiektų jus.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="rounded-3xl overflow-hidden card-shadow">
              <img
                src="/brand/box-red.png"
                alt="Manti Pizzeria dėžutė"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-cream p-5 rounded-2xl card-shadow">
              <img
                src="/brand/logo-mark.png"
                alt="Manti Pizzeria logotipas"
                className="h-10 w-auto object-contain"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export function Features() {
  return (
    <section id="kodel" className="py-24 md:py-32 bg-sand">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-olive text-sm tracking-[0.2em] uppercase mb-3 font-medium">
            Kodėl verta rinktis mus
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-black">
            Mūsų privalumai
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-cream rounded-2xl p-8 card-shadow hover:card-shadow-hover transition-all duration-300 group"
            >
              <div className="w-14 h-14 rounded-xl bg-olive/10 flex items-center justify-center mb-6 group-hover:bg-olive group-hover:text-white transition-all duration-300">
                <feature.icon className="w-7 h-7 text-olive group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-3">
                {feature.title}
              </h3>
              <p className="text-black/60 text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
