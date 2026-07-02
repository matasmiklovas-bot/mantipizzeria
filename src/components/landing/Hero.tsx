"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Hero() {
  return (
    <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden bg-olive">
      <video
        className="absolute inset-0 h-full w-full object-cover scale-105"
        src="/brand/hero-video.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      />

      <div className="absolute inset-0 hero-overlay" />

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl text-white font-bold leading-tight mb-6">
            Sveiki atvykę į
            <br />
            <span className="text-gold">Manti Pizzeria</span>
          </h1>
          <Link href="/t/1">
            <Button
              size="lg"
              className="bg-gold text-black hover:bg-gold-light text-lg px-10"
            >
              Užsisakyti dabar
            </Button>
          </Link>
        </motion.div>
      </div>

      <motion.a
        href="#apie"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 hover:text-gold transition-colors z-10"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        aria-label="Slinkti žemyn"
      >
        <ChevronDown className="w-8 h-8" />
      </motion.a>
    </section>
  );
}
