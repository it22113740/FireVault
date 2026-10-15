import { getImageProps } from "next/image";

// Art direction: portrait banner on phones, landscape from md (768px) up. A
// <picture> means each device downloads only its own image. Two layers: a
// blurred copy fills any spare space, and the whole image sits on top
// (object-contain, never cropped).
const DESKTOP = { src: "/hero.jpg" };
const MOBILE = { src: "/hero_mobile.jpg" };

function HeroPicture({ className, priority }: { className: string; priority?: boolean }) {
  const common = {
    alt: "",
    fill: true,
    sizes: "100vw",
    loading: priority ? "eager" as const : "lazy" as const,
    fetchPriority: priority ? "high" as const : "auto" as const,
  };
  const { props: { srcSet: desktop } } = getImageProps({ ...common, ...DESKTOP });
  const { props: { srcSet: mobile, ...rest } } = getImageProps({ ...common, ...MOBILE });

  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={desktop} />
      <source srcSet={mobile} />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- decorative, alt="" comes from rest */}
      <img {...rest} className={className} />
    </picture>
  );
}

export function HeroBackground() {
  return (
    <>
      <HeroPicture className="-z-20 scale-110 object-cover opacity-30 blur-2xl" />
      <HeroPicture className="-z-10 object-contain opacity-60" priority />
    </>
  );
}
