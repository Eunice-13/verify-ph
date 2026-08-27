"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ViewTransition from "@/components/layout/ViewTransition";
import CategoryView from "@/components/feed/CategoryView";
import { CATEGORIES, Category } from "@/types";

function isCategory(value: string | null): value is Category {
  return !!value && (CATEGORIES as readonly string[]).includes(value);
}

function FeedContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const searchParam = searchParams.get("search");
  const category: Category | undefined = isCategory(categoryParam)
    ? categoryParam
    : searchParam
      ? undefined
      : CATEGORIES[0];

  return (
    <ViewTransition transitionKey={`${category ?? "all"}-${searchParam ?? ""}`}>
      <CategoryView category={category} search={searchParam ?? undefined} />
    </ViewTransition>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={null}>
      <FeedContent />
    </Suspense>
  );
}
