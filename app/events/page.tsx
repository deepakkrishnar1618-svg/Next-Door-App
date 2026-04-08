'use client';
import EventsPage from "@/src/page-components/EventsPage";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense>
      <EventsPage />
    </Suspense>
  );
}
