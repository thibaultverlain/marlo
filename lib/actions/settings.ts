"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { upsertShopSettings } from "@/lib/db/queries/settings";

const settingsSchema = z.object({
  legalName: z.string().min(1, "Raison sociale requise"),
  commercialName: z.string().optional().nullable(),
  legalStatus: z.string().optional().nullable(),
  siret: z.string().regex(/^\d{14}$/, "SIRET invalide (14 chiffres)").optional().or(z.literal("")),
  apeCode: z.string().optional().nullable(),
  rcs: z.string().optional().nullable(),
  address: z.string().min(1, "Adresse requise"),
  postalCode: z.string().min(1, "Code postal requis"),
  city: z.string().min(1, "Ville requise"),
  country: z.string().optional().nullable(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  phone: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  bic: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  vatSubject: z.boolean().optional(),
  vatNumber: z.string().optional().nullable(),
  vatRate: z.string().optional().nullable(),
  invoicePrefix: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  legalMention: z.string().optional().nullable(),
});

export async function saveShopSettingsAction(formData: FormData) {
  const raw = {
    legalName: formData.get("legalName") as string,
    commercialName: formData.get("commercialName") as string,
    legalStatus: formData.get("legalStatus") as string,
    siret: (formData.get("siret") as string || "").replace(/\s/g, ""),
    apeCode: formData.get("apeCode") as string,
    rcs: formData.get("rcs") as string,
    address: formData.get("address") as string,
    postalCode: formData.get("postalCode") as string,
    city: formData.get("city") as string,
    country: formData.get("country") as string || "France",
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    website: formData.get("website") as string,
    iban: formData.get("iban") as string,
    bic: formData.get("bic") as string,
    bankName: formData.get("bankName") as string,
    vatSubject: formData.get("vatSubject") === "on",
    vatNumber: formData.get("vatNumber") as string,
    vatRate: formData.get("vatRate") as string,
    invoicePrefix: formData.get("invoicePrefix") as string || "F",
    paymentTerms: formData.get("paymentTerms") as string,
    legalMention: formData.get("legalMention") as string,
  };

  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  try {
    await upsertShopSettings({
      legalName: parsed.data.legalName,
      commercialName: parsed.data.commercialName ?? null,
      legalStatus: parsed.data.legalStatus ?? null,
      siret: parsed.data.siret && parsed.data.siret.length > 0 ? parsed.data.siret : null,
      apeCode: parsed.data.apeCode ?? null,
      rcs: parsed.data.rcs ?? null,
      address: parsed.data.address,
      postalCode: parsed.data.postalCode,
      city: parsed.data.city,
      country: parsed.data.country ?? "France",
      email: parsed.data.email && parsed.data.email.length > 0 ? parsed.data.email : null,
      phone: parsed.data.phone ?? null,
      website: parsed.data.website ?? null,
      iban: parsed.data.iban ?? null,
      bic: parsed.data.bic ?? null,
      bankName: parsed.data.bankName ?? null,
      vatSubject: parsed.data.vatSubject ?? false,
      vatNumber: parsed.data.vatNumber ?? null,
      vatRate: parsed.data.vatRate ?? "0",
      invoicePrefix: parsed.data.invoicePrefix ?? "F",
      paymentTerms: parsed.data.paymentTerms ?? "Paiement comptant",
      legalMention: parsed.data.legalMention ?? null,
    });

    revalidatePath("/settings");
    revalidatePath("/invoices");
    return { success: true };
  } catch (err) {
    console.error("saveShopSettingsAction:", err);
    return { error: "Erreur lors de la sauvegarde." };
  }
}
