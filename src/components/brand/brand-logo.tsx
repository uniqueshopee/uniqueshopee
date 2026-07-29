import Image from "next/image";
import { cn } from "@/lib/utils";

function slugifyBrandName(name: string) {
  return name
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function BrandLogo({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const src = `/brands/${slugifyBrandName(name)}.svg`;

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.15rem]",
        "border border-white/85 bg-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),transparent_62%)]" />
      <Image
        src={src}
        alt={`${name} logo`}
        width={320}
        height={120}
        className="relative z-10 h-full w-full object-contain px-2.5 py-1.5 drop-shadow-[0_2px_4px_rgba(16,33,58,0.08)]"
      />
    </div>
  );
}

export { BrandLogo, slugifyBrandName };
