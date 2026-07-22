/**
 * Aurora: a pure-CSS slow-drifting radial gradient wash for Alexandria marketing surfaces.
 * Three zero-blur radial gradient orbs (baby-blue/cyan/gold) each animate on their own drift keyframe.
 * No JS, no images, 100% GPU compositor accelerated, SSR-safe.
 */
type AuroraVariant = "ambient" | "hero";

export default function Aurora({
  variant = "ambient",
  className = "absolute inset-0",
}: {
  variant?: AuroraVariant;
  className?: string;
}) {
  return (
    <div className={`alx-aurora alx-aurora-${variant} ${className}`} aria-hidden="true">
      <div className="alx-aurora-orb alx-aurora-orb-a" />
      <div className="alx-aurora-orb alx-aurora-orb-b" />
      <div className="alx-aurora-orb alx-aurora-orb-c" />
    </div>
  );
}
