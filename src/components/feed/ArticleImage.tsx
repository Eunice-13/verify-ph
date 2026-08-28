import Image from "next/image";
import { Newspaper } from "lucide-react";

export default function ArticleImage({
  imageUrl,
  title,
}: {
  imageUrl?: string | null;
  title: string;
}) {
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={title}
        fill
        loading="lazy"
        unoptimized
        className="object-cover transition-transform duration-[400ms] ease-in-out group-hover:scale-105"
      />
    );
  }

  // Never substitute an unrelated stock photograph for a real story.
  // This stays visually intentional while making the missing publisher image
  // obvious to the reader.
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center bg-[#e7e1d5] text-emerald-900/45"
    >
      <Newspaper className="h-9 w-9" strokeWidth={1.5} />
    </div>
  );
}
