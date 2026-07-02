import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-black text-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <img
              src="/brand/logo-mark.png"
              alt="Manti Pizzeria"
              className="h-14 w-auto object-contain brightness-0 invert mb-5"
            />
            <p className="text-white/60 text-sm leading-relaxed">
              Vaivorykštės g. 53, Palanga
              <br />
              Picos vietoje ir užsakymui nuo staliuko.
            </p>
          </div>

          <div>
            <h4 className="font-display text-lg text-white mb-4">Nuorodos</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/t/1" className="text-white/60 hover:text-gold transition-colors text-sm">
                Užsisakyti
              </Link>
            </nav>
          </div>

          <div>
            <h4 className="font-display text-lg text-white mb-4">Sekite mus</h4>
            <a
              href="https://www.instagram.com/manti_pizzeria/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 rounded-full bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] px-5 py-3 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              aria-label="Instagram"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="5"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="4"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
              </svg>
              <span className="text-sm font-semibold">@manti_pizzeria</span>
            </a>
          </div>
        </div>

        <div className="gold-line my-8 opacity-30" />

        <p className="text-center text-white/40 text-sm">
          © {new Date().getFullYear()} Manti Pizzeria. Visos teisės saugomos.
        </p>
      </div>
    </footer>
  );
}
