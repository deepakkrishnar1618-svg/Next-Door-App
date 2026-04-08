'use client';
import MarketPage from "@/src/page-components/MarketPage";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense>
      <MarketPage />
    </Suspense>
  );
}
