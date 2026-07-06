import ListingGeneratorForm from "@/components/listing/listing-generator-form";

export const dynamic = "force-dynamic";

export default function ListingPage() {
  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Generateur d'annonces</h1>
        <p className="text-zinc-500 mt-1 text-sm">Vinted ou Vestiaire — sortie sobre, sans invention, style Nayren.</p>
      </div>
      <ListingGeneratorForm />
    </div>
  );
}
