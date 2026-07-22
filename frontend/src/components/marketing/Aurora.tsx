/**
 * Aurora: a pure-CSS slow-drifting gradient wash and Nordic ribbon curtain layer.
 * Inspired by AC: Valhalla's ethereal sky visuals. Includes zero-blur radial orbs
 * and swaying vertical light ribbons (`alx-aurora-curtain`).
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
      {/* Zero-blur ambient wash orbs */}
      <div className="alx-aurora-orb alx-aurora-orb-a" />
      <div className="alx-aurora-orb alx-aurora-orb-b" />
      <div className="alx-aurora-orb alx-aurora-orb-c" />
      
      {/* AC Valhalla Nordic Swaying Curtain Ribbons */}
      <div className="alx-aurora-curtain alx-aurora-curtain-a" />
      <div className="alx-aurora-curtain alx-aurora-curtain-b" />
    </div>
  );
}
