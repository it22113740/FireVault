import { getImageProps } from "next/image";

export function LoginBackground() {
  const common = {
    alt: "",
    fill: true,
    sizes: "100vw",
    loading: "eager" as const,
    fetchPriority: "high" as const,
  };
  const { props: { srcSet: desktop } } = getImageProps({ ...common, src: "/login_deskop.png" });
  const { props: mobile } = getImageProps({ ...common, src: "/login_mobile.png" });

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      <picture>
        <source media="(min-width: 768px)" srcSet={desktop} sizes="100vw" />
        <img {...mobile} alt="" className="object-cover object-center" />
      </picture>
    </div>
  );
}
