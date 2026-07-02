"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function Hero() {
  const [videoReady, setVideoReady] = useState(false);
  const [logoSrc, setLogoSrc] = useState("/brand/logo-mark.png");

  useEffect(() => {
    const timeout = window.setTimeout(() => setVideoReady(true), 8000);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden bg-olive">
      {!videoReady && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-olive">
          <Image
            src={logoSrc}
            alt="Manti Pizzeria"
            width={88}
            height={88}
            className="mb-6 rounded-2xl"
            priority
            onError={() => setLogoSrc("/brand/logo-mark.svg")}
          />
          <Loader2
            className="h-10 w-10 animate-spin text-gold"
            aria-label="Kraunama"
          />
        </div>
      )}

      <video
        className={cn(
          "absolute inset-0 h-full w-full object-cover scale-105 transition-opacity duration-700",
          videoReady ? "opacity-100" : "opacity-0"
        )}
        src="/brand/hero-video.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onCanPlay={() => setVideoReady(true)}
        onLoadedData={() => setVideoReady(true)}
        onError={() => setVideoReady(true)}
        aria-hidden="true"
      />

      <div
        className={cn(
          "absolute inset-0 hero-overlay transition-opacity duration-700",
          videoReady ? "opacity-100" : "opacity-0"
        )}
      />

      <div
        className={cn(
          "relative z-10 text-center px-4 max-w-4xl mx-auto transition-opacity duration-700",
          videoReady ? "opacity-100" : "opacity-0"
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={videoReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
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
          videoReady ? "opacity-100" : "opacity-0"
        )}
        animate={videoReady ? { y: [0, 8, 0] } : undefined}
        transition={{ repeat: Infinity, duration: 2 }}
        aria-label="Slinkti žemyn"
      >
        <ChevronDown className="w-8 h-8" />
      </motion.a>
    </section>
  );
}
