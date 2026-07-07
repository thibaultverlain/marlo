/**
 * Definit les champs de mesures pertinents par categorie de produit.
 * Utilise par le formulaire (UI conditionnelle) et le generateur d'annonces
 * (pour passer les bonnes mesures au LLM).
 *
 * Toutes les mesures sont en cm sauf indication contraire.
 */

export type MeasurementField = {
  key: string;
  label: string;
  placeholder?: string;
  unit?: string;
};

export const MEASUREMENT_FIELDS_BY_CATEGORY: Record<string, MeasurementField[]> = {
  sacs: [
    { key: "longueur_cm", label: "Longueur", unit: "cm" },
    { key: "hauteur_cm", label: "Hauteur", unit: "cm" },
    { key: "profondeur_cm", label: "Profondeur", unit: "cm" },
    { key: "anse_cm", label: "Hauteur d'anse", unit: "cm" },
    { key: "bandouliere_cm", label: "Bandouliere", unit: "cm" },
  ],
  chaussures: [
    { key: "pointure_eu", label: "Pointure EU" },
    { key: "longueur_semelle_cm", label: "Longueur semelle", unit: "cm" },
    { key: "hauteur_talon_cm", label: "Hauteur talon", unit: "cm" },
  ],
  vetements: [
    { key: "taille_cm", label: "Tour de taille", unit: "cm" },
    { key: "longueur_cm", label: "Longueur totale", unit: "cm" },
    { key: "tour_hanches_cm", label: "Tour de hanches", unit: "cm" },
    { key: "tour_poitrine_cm", label: "Tour de poitrine", unit: "cm" },
    { key: "longueur_manche_cm", label: "Longueur manche", unit: "cm" },
    { key: "largeur_epaules_cm", label: "Largeur epaules", unit: "cm" },
  ],
  accessoires: [
    { key: "longueur_cm", label: "Longueur", unit: "cm" },
    { key: "largeur_cm", label: "Largeur", unit: "cm" },
    { key: "tour_cm", label: "Tour", unit: "cm" },
  ],
  montres: [
    { key: "diametre_mm", label: "Diametre boitier", unit: "mm" },
    { key: "epaisseur_mm", label: "Epaisseur", unit: "mm" },
    { key: "tour_poignet_cm", label: "Tour de poignet max", unit: "cm" },
  ],
  bijoux: [
    { key: "longueur_cm", label: "Longueur", unit: "cm" },
    { key: "diametre_mm", label: "Diametre", unit: "mm" },
    { key: "poids_g", label: "Poids", unit: "g" },
  ],
  autre: [
    { key: "longueur_cm", label: "Longueur", unit: "cm" },
    { key: "largeur_cm", label: "Largeur", unit: "cm" },
    { key: "hauteur_cm", label: "Hauteur", unit: "cm" },
  ],
};

export function getMeasurementFields(category: string): MeasurementField[] {
  return MEASUREMENT_FIELDS_BY_CATEGORY[category] ?? MEASUREMENT_FIELDS_BY_CATEGORY.autre;
}
