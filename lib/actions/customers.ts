"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createCustomer, updateCustomer, deleteCustomer } from "@/lib/db/queries/customers";

const customerSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide").optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  instagram: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  preferredBrands: z.array(z.string()).optional(),
  preferredSizes: z.string().optional().nullable(),
  budgetRange: z.string().optional().nullable(),
  vip: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export async function createCustomerAction(formData: FormData) {
  const raw = {
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string | null,
    instagram: formData.get("instagram") as string | null,
    address: formData.get("address") as string | null,
    city: formData.get("city") as string | null,
    preferredBrands: formData.getAll("preferredBrands") as string[],
    preferredSizes: formData.get("preferredSizes") as string | null,
    budgetRange: formData.get("budgetRange") as string | null,
    vip: formData.get("vip") === "on",
    notes: formData.get("notes") as string | null,
  };

  const parsed = customerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  try {
    await createCustomer({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email && parsed.data.email.length > 0 ? parsed.data.email : null,
      phone: parsed.data.phone ?? null,
      instagram: parsed.data.instagram ?? null,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      preferredBrands: parsed.data.preferredBrands ?? [],
      preferredSizes: parsed.data.preferredSizes ?? null,
      budgetRange: parsed.data.budgetRange ?? null,
      vip: parsed.data.vip ?? false,
      notes: parsed.data.notes ?? null,
    });
  } catch (err) {
    console.error("createCustomerAction error:", err);
    return { error: "Erreur lors de la création du client." };
  }

  revalidatePath("/customers");
  redirect("/customers");
}
