"use client";

import Image from "next/image";
import { useState } from "react";
import { Newspaper } from "lucide-react";

export default function ArticleImage({
  imageUrl,
  title,
  providerName,
}: {
  imageUrl?: string | null;
  title: string;
  providerName?: string;
}) {
  return (
    <ArticleImageContent
      key={imageUrl ?? "no-publisher-image"}
      imageUrl={imageUrl}
      title={title}
      providerName={providerName}
    />
  );
}

function ArticleImageContent({
  imageUrl,
  title,
  providerName,
}: {
  imageUrl?: string | null;
  title: string;
  providerName?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (imageUrl && !imageFailed) {
    return (
      <Image
        src={imageUrl}
        alt={title}
        fill
        loading="lazy"
        unoptimized
        onError={() => setImageFailed(true)}
        className="object-cover transition-transform duration-[400ms] ease-in-out group-hover:scale-105"
      />
    );
  }

  if (providerName === "Inquirer") {
    return (
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center bg-white p-4"
      >
        <Image
          src="/inquirer-logo.png"
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain p-4"
        />
      </div>
    );
  }

  // Never substitute an unrelated stock photograph for a real story.
  // Inquirer is handled above with its supplied publisher logo because it is
  // currently the only feed whose server-side image access is blocked.
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center bg-[#e7e1d5] text-emerald-900/45"
    >
      <Newspaper className="h-9 w-9" strokeWidth={1.5} />
    </div>
  );
}
