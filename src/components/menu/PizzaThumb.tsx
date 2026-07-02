interface PizzaThumbProps {
  name: string;
  imageUrl?: string;
  className?: string;
}

export function PizzaThumb({ name, imageUrl, className }: PizzaThumbProps) {
  const src = imageUrl || "/brand/pizza-simple.svg";

  return (
    <div
      className={`rounded-xl bg-red/10 overflow-hidden flex items-center justify-center shrink-0 ${className ?? ""}`}
      aria-label={name}
    >
      <img
        src={src}
        alt={name}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
