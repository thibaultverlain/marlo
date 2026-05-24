"use client";

import { useState, useTransition } from "react";
import { Mail, CheckCircle2, AlertCircle, Loader2, Power, Trash2, RefreshCw, Eye, EyeOff } from "lucide-react";
import type { ShopEmailCredentials } from "@/lib/db/schema";
import {
  saveCredentialsAction,
  testCredentialsAction,
  toggleCredentialsAction,
  deleteCredentialsAction,
} from "@/lib/actions/email-credentials";
import { formatDate } from "@/lib/utils";

const PROVIDER_PRESETS: Record<string, { host: string; port: number; tls: boolean }> = {
  gmail:   { host: "imap.gmail.com",       port: 993, tls: true },
  outlook: { host: "outlook.office365.com", port: 993, tls: true },
  icloud:  { host: "imap.mail.me.com",     port: 993, tls: true },
  yahoo:   { host: "imap.mail.yahoo.com",  port: 993, tls: true },
};

export default function EmailPollingCard({
  initial,
}: {
  initial: ShopEmailCredentials | null;
}) {
  const [editing, setEditing] = useState(!initial);
  const [showPassword, setShowPassword] = useState(false);
  const [provider, setProvider] = useState<keyof typeof PROVIDER_PRESETS | "custom">("gmail");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const preset = provider === "custom" ? null : PROVIDER_PRESETS[provider];

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveCredentialsAction(formData);
      if (result.error) setError(result.error);
      else {
        setSuccess("Credentials sauvegardes. Le polling se declenchera au prochain tick.");
        setEditing(false);
      }
    });
  }

  function handleTest() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await testCredentialsAction();
      if (result.error) setError(result.error);
      else setSuccess(`Connexion OK — ${result.messageCount} email(s) dans la boite`);
    });
  }

  function handleToggle() {
    if (!initial) return;
    startTransition(async () => {
      const result = await toggleCredentialsAction(!initial.active);
      if (result.error) setError(result.error);
    });
  }

  function handleDelete() {
    if (!confirm("Supprimer la configuration ? Le polling s'arrete immediatement.")) return;
    startTransition(async () => {
      const result = await deleteCredentialsAction();
      if (result.error) setError(result.error);
      else {
        setEditing(true);
        setSuccess(null);
      }
    });
  }

  // Vue : credentials configures, pas en mode edition
  if (initial && !editing) {
    return (
      <div className="card-static p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${initial.active ? "bg-emerald-500/10" : "bg-zinc-500/10"}`}>
            <Mail size={18} className={initial.active ? "text-emerald-400" : "text-zinc-500"} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-white">Import automatique des ventes par email</p>
            <p className="text-[12px] text-zinc-500 mt-0.5 truncate">
              {initial.imapUsername} sur {initial.imapHost} · {initial.active ? "actif" : "desactive"}
            </p>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${initial.active ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-zinc-500"}`}>
            {initial.active ? "On" : "Off"}
          </span>
        </div>

        {initial.lastPollAt && (
          <div className="text-[11px] text-zinc-500 space-y-1 px-1">
            <p>Dernier poll : {formatDate(initial.lastPollAt)}</p>
            {initial.lastPollStatus && (
              <p className={initial.lastPollStatus === "ok" ? "text-emerald-400" : "text-amber-400"}>
                Statut : {initial.lastPollStatus}
              </p>
            )}
            {initial.lastError && (
              <p className="text-red-400 break-words">Erreur : {initial.lastError}</p>
            )}
          </div>
        )}

        {error && <ErrorBanner message={error} />}
        {success && <SuccessBanner message={success} />}

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleTest}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-[var(--color-bg-hover)] text-zinc-300 hover:text-white rounded-lg transition-all disabled:opacity-50"
          >
            {isPending ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            Tester la connexion
          </button>
          <button
            onClick={handleToggle}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-[var(--color-bg-hover)] text-zinc-300 hover:text-white rounded-lg transition-all disabled:opacity-50"
          >
            <Power size={11} />
            {initial.active ? "Desactiver" : "Activer"}
          </button>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-[var(--color-bg-hover)] text-zinc-300 hover:text-white rounded-lg transition-all"
          >
            Modifier
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
          >
            <Trash2 size={11} />
            Supprimer
          </button>
        </div>
      </div>
    );
  }

  // Vue : formulaire de configuration
  return (
    <div className="card-static p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
          <Mail size={18} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-white">Import automatique des ventes par email</p>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            Connecte une boite email IMAP. Marlo poll les emails non lus toutes les 10 min et cree les ventes.
          </p>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}
      {success && <SuccessBanner message={success} />}

      <form action={handleSubmit} className="space-y-4">
        {/* Provider preset */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 block">
            Provider
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(["gmail", "outlook", "icloud", "yahoo", "custom"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProvider(p)}
                className={`px-3 py-2 rounded-lg text-[12px] font-medium border transition-all ${
                  provider === p
                    ? "border-emerald-500/60 bg-emerald-500/8 text-white"
                    : "border-[var(--color-border)] text-zinc-400 hover:text-white"
                }`}
              >
                {p === "custom" ? "Autre" : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Email + password */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email" htmlFor="imapUsername">
            <input
              id="imapUsername"
              name="imapUsername"
              type="email"
              required
              defaultValue={initial?.imapUsername}
              placeholder="marlo.ventes@gmail.com"
              className="w-full px-3 py-2.5 text-[13px] bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-zinc-200 placeholder:text-zinc-500"
            />
          </Field>
          <Field label="Mot de passe (App Password)" htmlFor="password">
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder={initial ? "Laisser vide pour ne pas changer" : "xxxx xxxx xxxx xxxx"}
                className="w-full px-3 py-2.5 pr-10 text-[13px] bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-zinc-200 placeholder:text-zinc-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
        </div>

        {/* Host + port + TLS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Host IMAP" htmlFor="imapHost">
            <input
              id="imapHost"
              name="imapHost"
              type="text"
              required
              defaultValue={initial?.imapHost ?? preset?.host}
              key={preset?.host ?? "custom"}
              placeholder="imap.gmail.com"
              className="w-full px-3 py-2.5 text-[13px] bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-zinc-200 placeholder:text-zinc-500"
            />
          </Field>
          <Field label="Port" htmlFor="imapPort">
            <input
              id="imapPort"
              name="imapPort"
              type="number"
              required
              defaultValue={initial?.imapPort ?? preset?.port ?? 993}
              key={`port-${preset?.port ?? "custom"}`}
              className="w-full px-3 py-2.5 text-[13px] bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-zinc-200 placeholder:text-zinc-500"
            />
          </Field>
          <Field label="Dossier" htmlFor="imapFolder">
            <input
              id="imapFolder"
              name="imapFolder"
              type="text"
              defaultValue={initial?.imapFolder ?? "INBOX"}
              className="w-full px-3 py-2.5 text-[13px] bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-zinc-200 placeholder:text-zinc-500"
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-[12px] text-zinc-400">
          <input
            type="checkbox"
            name="imapUseTls"
            value="true"
            defaultChecked={initial?.imapUseTls ?? true}
            className="rounded border-[var(--color-border)] bg-[var(--color-bg)] text-emerald-500"
          />
          Utiliser TLS/SSL (recommande, garde activé)
        </label>

        <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/15 rounded-lg">
          <AlertCircle size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-[11px] text-amber-300/80 leading-relaxed">
            <p className="font-semibold mb-1">Pour Gmail : utilise un App Password, pas ton mot de passe normal.</p>
            <p>Active la 2FA, puis va sur myaccount.google.com/apppasswords pour generer une cle de 16 caracteres. Ne marche que si la 2FA est active.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-all disabled:opacity-50"
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            {isPending ? "Test + sauvegarde..." : "Tester et sauvegarder"}
          </button>
          {initial && (
            <button
              type="button"
              onClick={() => { setEditing(false); setError(null); setSuccess(null); }}
              className="px-4 py-2 text-[13px] font-medium text-zinc-400 hover:text-white rounded-lg transition-all"
            >
              Annuler
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[12px] text-red-400">
      <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[12px] text-emerald-400">
      <CheckCircle2 size={12} className="flex-shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}
