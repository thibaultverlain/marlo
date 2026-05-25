"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

/**
 * Error boundary applique a toutes les routes /app.
 * Quand un Server Component throw, on affiche cet ecran avec reset.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log cote console pour qu'on voie dans Vercel Logs
    console.error("[App Error Boundary]", error);
  }, [error]);

  return (
    <div className="page-enter">
      <ErrorState
        title="Quelque chose s'est mal passe"
        description="Une erreur est survenue lors du chargement de cette page. Tu peux reessayer."
        details={error.message + (error.digest ? `\n\nDigest: ${error.digest}` : "")}
        onRetry={reset}
        backHref="/dashboard"
      />
    </div>
  );
}
