import Image from "next/image";

type Props = {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
};

const sizes = { sm: 72, md: 120, lg: 160 };

export function BrandLogo({ size = "md", showTagline = true, className = "" }: Props) {
  const px = sizes[size];
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <Image
        src="/logo.png"
        alt="Спутник — Шаги"
        width={px}
        height={px}
        className="h-auto w-auto"
        priority
      />
      {showTagline && (
        <p className="mt-2 text-xs font-medium tracking-wide text-brand-muted">
          шагай больше — получай бонусы
        </p>
      )}
    </div>
  );
}

export function BrandTitle({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <h1 className="text-xl font-bold">
        <span className="text-primary">Спутник</span>
        <span className="text-accent"> — Шаги</span>
      </h1>
    );
  }
  return (
    <h1 className="text-2xl font-bold leading-tight">
      <span className="text-primary">Спутник</span>
      <span className="text-accent"> — Шаги</span>
    </h1>
  );
}
