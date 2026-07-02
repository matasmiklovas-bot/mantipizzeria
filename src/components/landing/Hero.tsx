"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function Hero() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setReady(true), 8000);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden bg-black">
      {!ready && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-cream">
          <motion.img
            src="/brand/logo-mark.png"
            alt="Manti Pizzeria"
            className="h-20 w-auto object-contain"
            animate={{ scale: [1, 1.05, 1], opacity: [0.85, 1, 0.85] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          />
          <Loader2
            className="h-7 w-7 animate-spin text-gold"
            aria-label="Kraunama"
          />
        </div>
      )}

      <video
        className={cn(
          "absolute inset-0 h-full w-full object-cover scale-105 transition-opacity duration-700",
          ready ? "opacity-100" : "opacity-0"
        )}
        src="/brand/hero-video.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onCanPlay={() => setReady(true)}
        onLoadedData={() => setReady(true)}
        onError={() => setReady(true)}
        aria-hidden="true"
      />

      <div
        className={cn(
          "absolute inset-0 hero-overlay transition-opacity duration-700",
          ready ? "opacity-100" : "opacity-0"
        )}
      />

      <div
        className={cn(
          "relative z-10 text-center px-4 max-w-4xl mx-auto transition-opacity duration-700",
          ready ? "opacity-100" : "opacity-0"
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
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
        className={cn(
          "absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 hover:text-gold transition-all duration-700 z-10",
          ready ? "opacity-100" : "opacity-0"
        )}
        animate={ready ? { y: [0, 8, 0] } : undefined}
        transition={{ repeat: Infinity, duration: 2 }}
        aria-label="Slinkti žemyn"
      >
        <ChevronDown className="w-8 h-8" />
      </motion.a>
    </section>
  );
}
