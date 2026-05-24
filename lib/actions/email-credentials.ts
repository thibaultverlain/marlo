"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/require-role";
import { encrypt } from "@/lib/crypto/encryption";
import {
  upsertCredentials,
  deleteCredentials,
  setActive,
  getCredentialsByShop,
} from "@/lib/db/queries/email-credentials";
import { testImapConnection } from "@/lib/email/imap-poller";
import { decrypt } from "@/lib/crypto/encryption";

const credentialsSchema = z.object({
  imapHost: z.string().min(1, "Host requis"),
  imapPort: z.coerce.number().int().min(1).max(65535),
  imapUseTls: z.coerce.boolean().default(true),
  imapUsername: z.string().min(1, "Email requis").email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
  imapFolder: z.string().default("INBOX"),
});

export type CredentialsFormState = {
  error?: string;
  success?: boolean;
};

export async function saveCredentialsAction(formData: FormData): Promise<CredentialsFormState> {
  const ctx = await getAuthContext();
  if (ctx.role !== "owner") {
    return { error: "Seul l'owner peut configurer les credentials email" };
  }

  const parsed = credentialsSchema.safeParse({
    imapHost: formData.get("imapHost"),
    imapPort: formData.get("imapPort"),
    imapUseTls: formData.get("imapUseTls") !== "false",
    imapUsername: formData.get("imapUsername"),
    password: formData.get("password"),
    imapFolder: formData.get("imapFolder") || "INBOX",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Donnees invalides" };
  }

  // Verifier la connexion AVANT de sauvegarder
  const test = await testImapConnection({
    imapHost: parsed.data.imapHost,
    imapPort: parsed.data.imapPort,
    imapUseTls: parsed.data.imapUseTls,
    imapUsername: parsed.data.imapUsername,
    password: parsed.data.password,
    imapFolder: parsed.data.imapFolder,
  });

  if (!test.ok) {
    return { error: `Connexion IMAP echouee : ${test.error}` };
  }

  try {
    const encryptedPassword = encrypt(parsed.data.password);
    await upsertCredentials(ctx.shopId, {
      imapHost: parsed.data.imapHost,
      imapPort: parsed.data.imapPort,
      imapUseTls: parsed.data.imapUseTls,
      imapUsername: parsed.data.imapUsername,
      imapPasswordEncrypted: encryptedPassword,
      imapFolder: parsed.data.imapFolder,
      active: true,
    });
    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    return { error: err.message ?? "Erreur de sauvegarde" };
  }
}

export async function testCredentialsAction(): Promise<CredentialsFormState & { messageCount?: number }> {
  const ctx = await getAuthContext();
  if (ctx.role !== "owner") return { error: "Acces refuse" };

  const creds = await getCredentialsByShop(ctx.shopId);
  if (!creds) return { error: "Aucun credentials configures" };

  let password: string;
  try {
    password = decrypt(creds.imapPasswordEncrypted);
  } catch {
    return { error: "Decryption echouee. La cle EMAIL_CREDS_ENCRYPTION_KEY a-t-elle change ?" };
  }

  const test = await testImapConnection({
    imapHost: creds.imapHost,
    imapPort: creds.imapPort,
    imapUseTls: creds.imapUseTls,
    imapUsername: creds.imapUsername,
    password,
    imapFolder: creds.imapFolder,
  });

  if (!test.ok) return { error: `Connexion echouee : ${test.error}` };
  return { success: true, messageCount: test.messageCount };
}

export async function toggleCredentialsAction(active: boolean): Promise<CredentialsFormState> {
  const ctx = await getAuthContext();
  if (ctx.role !== "owner") return { error: "Acces refuse" };

  try {
    await setActive(ctx.shopId, active);
    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteCredentialsAction(): Promise<CredentialsFormState> {
  const ctx = await getAuthContext();
  if (ctx.role !== "owner") return { error: "Acces refuse" };

  try {
    await deleteCredentials(ctx.shopId);
    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
