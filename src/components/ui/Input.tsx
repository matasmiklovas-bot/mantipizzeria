import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-black/70">
          {label}
        </label>
      )}
      <input
        className={cn(
          "w-full px-4 py-3 rounded-xl border border-black/10 bg-white",
          "focus:border-olive focus:ring-2 focus:ring-olive/20 transition-all",
          error && "border-red focus:border-red focus:ring-red/20",
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-red">{error}</p>}
    </div>
  );
}
