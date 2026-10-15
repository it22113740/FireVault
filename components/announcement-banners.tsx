import { getPublishedAnnouncements } from "@/lib/announcements";
import { publicImageUrl } from "@/lib/storage";

export async function AnnouncementBanners() {
  const announcements = await getPublishedAnnouncements();
  if (!announcements.length) return null;
  return (
    <section aria-label="Announcements" className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-12">
      {announcements.map((announcement) => (
        // Images are already resized and converted to WebP; preserve each banner's natural ratio.
        // eslint-disable-next-line @next/next/no-img-element
        <img key={announcement.id} src={publicImageUrl(announcement.image_path)}
          alt={announcement.title} loading="lazy" decoding="async"
          className="h-auto w-full rounded-2xl border" />
      ))}
    </section>
  );
}
