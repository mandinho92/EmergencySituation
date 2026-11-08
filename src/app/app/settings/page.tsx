import { Download, Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { ENABLED_LOCALES } from "@/i18n/config";
import { ROLE_LABEL } from "@/i18n/messages";
import { requireFamily } from "@/lib/session";
import { DeleteAccountForm, ProfileForm, SignOutEverywhere } from "@/modules/settings/settings-forms";

export const metadata: Metadata = { title: "Definições" };

export default async function SettingsPage() {
  const ctx = await requireFamily();
  return (
    <>
      <PageHeader icon={Settings} title="Definições" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><div><CardTitle>Perfil</CardTitle><CardDescription>{ctx.user.email} · {ROLE_LABEL[ctx.role]} em {ctx.family.name}</CardDescription></div></CardHeader>
          <CardContent><ProfileForm name={ctx.profile.full_name} /></CardContent>
        </Card>
        <Card>
          <CardHeader><div><CardTitle>Idioma e região</CardTitle><CardDescription>Português (Portugal) · EUR · Portugal</CardDescription></div></CardHeader>
          <CardContent className="text-sm text-slate-500">{ENABLED_LOCALES.length === 1 ? "Outros idiomas (EN, ES, FR) estão previstos." : null}</CardContent>
        </Card>
        <Card>
          <CardHeader><div><CardTitle>Sessões</CardTitle><CardDescription>Entrou com link seguro por email. Não existe palavra-passe.</CardDescription></div></CardHeader>
          <CardContent><SignOutEverywhere /></CardContent>
        </Card>
        <Card>
          <CardHeader><div><CardTitle>Os seus dados</CardTitle><CardDescription>Exportação completa em JSON (RGPD, portabilidade).</CardDescription></div></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="secondary"><a href="/api/account/export" download><Download aria-hidden /> Exportar os meus dados</a></Button>
            <Button asChild size="sm" variant="ghost"><Link href="/privacy">Política de privacidade</Link></Button>
          </CardContent>
        </Card>
        <Card className="border-red-200 lg:col-span-2">
          <CardHeader><div><CardTitle className="text-red-700">Eliminar conta</CardTitle><CardDescription>Apaga a sua conta e dados pessoais. As famílias em que é a única conta são apagadas com todos os dados. Se for o único administrador de uma família com outros membros, promova primeiro outra pessoa.</CardDescription></div></CardHeader>
          <CardContent><DeleteAccountForm /></CardContent>
        </Card>
      </div>
    </>
  );
}
