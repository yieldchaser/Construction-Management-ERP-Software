/**
 * Aurora: a pure-CSS, slow-drifting gradient wash for the light
 * Alexandria marketing surfaces. Three heavily blurred, low-opacity orbs
 * (blue/blue/gold) each animate on their own drift keyframe (see
 * `.alx-aurora*` rules in globals.css), so the composition never feels
 * synchronized or mechanical. No JS, no images, SSR-safe.
 *
 * The container does not carry its own `position` so callers can place it
 * with plain Tailwind utilities via `className` (e.g. `absolute inset-0`
 * inside a hero section, or `fixed inset-0 z-0` for a whole-page ambient
 * layer), mirroring how `.alx-grain` is positioned throughout the shell.
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
