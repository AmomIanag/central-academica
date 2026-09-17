"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ScreenLoading } from "@/components/ui/feedback";
import { getCurrentUser } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then(() => {
        if (!cancelled) {
          router.replace("/dashboard");
        }
      })
      .catch(() => {
        if (!cancelled) {
          router.replace("/login");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return <ScreenLoading />;
}
