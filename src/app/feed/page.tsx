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
  const category: Category = isCategory(categoryParam) ? categoryParam : CATEGORIES[0];

  return (
    <ViewTransition transitionKey={category}>
      <CategoryView category={category} />
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
