import { EmptyState } from "@/components/ui/empty-state";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="page-enter">
      <EmptyState
        icon={Compass}
        title="Page introuvable"
        description="La page que tu cherches n'existe pas ou a ete deplacee."
        action={{ href: "/dashboard", label: "Retour au dashboard" }}
        variant="page"
      />
    </div>
  );
}
