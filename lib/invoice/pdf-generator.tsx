import { Document, Page, Text, View, StyleSheet, pdf, Font } from "@react-pdf/renderer";
import type { ShopSettings, Customer, Invoice } from "@/lib/db/schema";

// Register fonts from Google Fonts CDN (works in @react-pdf/renderer)
Font.register({
  family: "DM Sans",
  fonts: [
    { src: "https://cdn.jsdelivr.net/fontsource/fonts/dm-sans@latest/latin-400-normal.ttf" },
    { src: "https://cdn.jsdelivr.net/fontsource/fonts/dm-sans@latest/latin-600-normal.ttf", fontWeight: 600 },
    { src: "https://cdn.jsdelivr.net/fontsource/fonts/dm-sans@latest/latin-700-normal.ttf", fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 10,
    fontFamily: "DM Sans",
    color: "#1c1917",
    lineHeight: 1.5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  issuer: {
    width: "55%",
  },
  issuerName: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 4,
    color: "#1c1917",
  },
  issuerMuted: {
    fontSize: 9,
    color: "#78716c",
  },
  invoiceBlock: {
    width: "40%",
    textAlign: "right",
  },
  invoiceLabel: {
    fontSize: 24,
    fontWeight: 700,
    color: "#1c1917",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  invoiceMeta: {
    fontSize: 9,
    color: "#78716c",
    marginBottom: 2,
  },
  invoiceNum: {
    fontSize: 11,
    fontWeight: 600,
    color: "#1c1917",
  },
  clientBlock: {
    marginBottom: 32,
    padding: 16,
    backgroundColor: "#fafaf9",
    borderRadius: 4,
  },
  clientLabel: {
    fontSize: 8,
    color: "#a8a29e",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  clientName: {
    fontSize: 11,
    fontWeight: 600,
    marginBottom: 2,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1c1917",
    paddingVertical: 8,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e7e5e4",
    paddingVertical: 10,
  },
  colDesc: { width: "55%", paddingRight: 8 },
  colQty: { width: "10%", textAlign: "center" },
  colPrice: { width: "17%", textAlign: "right" },
  colTotal: { width: "18%", textAlign: "right" },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 600,
    color: "#1c1917",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  itemTitle: {
    fontSize: 10,
    fontWeight: 600,
    marginBottom: 2,
  },
  itemMeta: {
    fontSize: 8,
    color: "#78716c",
  },
  totals: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: "50%",
    paddingVertical: 3,
  },
  totalLabel: {
    width: "60%",
    textAlign: "right",
    color: "#78716c",
    paddingRight: 12,
  },
  totalValue: {
    width: "40%",
    textAlign: "right",
  },
  totalFinal: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: "50%",
    paddingVertical: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#1c1917",
  },
  totalFinalLabel: {
    width: "60%",
    textAlign: "right",
    paddingRight: 12,
    fontSize: 11,
    fontWeight: 700,
  },
  totalFinalValue: {
    width: "40%",
    textAlign: "right",
    fontSize: 13,
    fontWeight: 700,
  },
  mentions: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: "#e7e5e4",
  },
  mention: {
    fontSize: 8,
    color: "#78716c",
    marginBottom: 4,
    lineHeight: 1.4,
  },
  paymentBlock: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#fafaf9",
    borderRadius: 4,
  },
  paymentLabel: {
    fontSize: 8,
    color: "#a8a29e",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  paymentRow: {
    flexDirection: "row",
    fontSize: 9,
    marginBottom: 2,
  },
  paymentKey: {
    width: 80,
    color: "#78716c",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    fontSize: 7,
    color: "#a8a29e",
    textAlign: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#e7e5e4",
    paddingTop: 8,
  },
});

function formatEUR(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (n == null || isNaN(n)) return "0,00 €";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n);
}

function formatDateFR(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

export type InvoiceLine = {
  description: string;
  metadata?: string;
  quantity: number;
  unitPriceHT: number;
  totalHT: number;
};

export type InvoicePDFData = {
  settings: ShopSettings;
  customer: Customer;
  invoice: {
    invoiceNumber: string;
    createdAt: Date;
    dueDate?: Date;
    type: string;
  };
  lines: InvoiceLine[];
  amountHT: number;
  vatRate: number;
  vatAmount: number;
  amountTTC: number;
};

export const InvoiceDocument = ({ data }: { data: InvoicePDFData }) => {
  const { settings, customer, invoice, lines, amountHT, vatRate, vatAmount, amountTTC } = data;
  const isFrancoTVA = !settings.vatSubject;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header: Issuer (left) + Invoice info (right) */}
        <View style={styles.header}>
          <View style={styles.issuer}>
            <Text style={styles.issuerName}>
              {settings.commercialName || settings.legalName}
            </Text>
            {settings.commercialName && (
              <Text style={styles.issuerMuted}>{settings.legalName}</Text>
            )}
            {settings.legalStatus && (
              <Text style={styles.issuerMuted}>{settings.legalStatus}</Text>
            )}
            <Text style={styles.issuerMuted}>{settings.address}</Text>
            <Text style={styles.issuerMuted}>
              {settings.postalCode} {settings.city}
              {settings.country && settings.country !== "France" ? `, ${settings.country}` : ""}
            </Text>
            {settings.phone && <Text style={styles.issuerMuted}>Tél : {settings.phone}</Text>}
            {settings.email && <Text style={styles.issuerMuted}>{settings.email}</Text>}
            {settings.siret && (
              <Text style={[styles.issuerMuted, { marginTop: 4 }]}>SIRET : {settings.siret}</Text>
            )}
            {settings.vatNumber && <Text style={styles.issuerMuted}>N° TVA : {settings.vatNumber}</Text>}
            {settings.apeCode && <Text style={styles.issuerMuted}>Code APE : {settings.apeCode}</Text>}
          </View>

          <View style={styles.invoiceBlock}>
            <Text style={styles.invoiceLabel}>FACTURE</Text>
            <Text style={styles.invoiceMeta}>N°</Text>
            <Text style={styles.invoiceNum}>{invoice.invoiceNumber}</Text>
            <Text style={[styles.invoiceMeta, { marginTop: 8 }]}>
              Émise le {formatDateFR(invoice.createdAt)}
            </Text>
            {invoice.dueDate && (
              <Text style={styles.invoiceMeta}>Échéance : {formatDateFR(invoice.dueDate)}</Text>
            )}
          </View>
        </View>

        {/* Client */}
        <View style={styles.clientBlock}>
          <Text style={styles.clientLabel}>Facturé à</Text>
          <Text style={styles.clientName}>
            {customer.firstName} {customer.lastName}
          </Text>
          {customer.address && <Text style={styles.issuerMuted}>{customer.address}</Text>}
          {customer.city && <Text style={styles.issuerMuted}>{customer.city}</Text>}
          {customer.email && <Text style={styles.issuerMuted}>{customer.email}</Text>}
          {customer.phone && <Text style={styles.issuerMuted}>{customer.phone}</Text>}
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDesc]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>Qté</Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>Prix HT</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>Total HT</Text>
          </View>

          {lines.map((line, i) => (
            <View key={i} style={styles.tableRow}>
              <View style={styles.colDesc}>
                <Text style={styles.itemTitle}>{line.description}</Text>
                {line.metadata && <Text style={styles.itemMeta}>{line.metadata}</Text>}
              </View>
              <Text style={styles.colQty}>{line.quantity}</Text>
              <Text style={styles.colPrice}>{formatEUR(line.unitPriceHT)}</Text>
              <Text style={styles.colTotal}>{formatEUR(line.totalHT)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Sous-total HT</Text>
            <Text style={styles.totalValue}>{formatEUR(amountHT)}</Text>
          </View>

          {settings.vatSubject && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                TVA ({(vatRate * 100).toFixed(1)}%)
              </Text>
              <Text style={styles.totalValue}>{formatEUR(vatAmount)}</Text>
            </View>
          )}

          <View style={styles.totalFinal}>
            <Text style={styles.totalFinalLabel}>Total TTC</Text>
            <Text style={styles.totalFinalValue}>{formatEUR(amountTTC)}</Text>
          </View>
        </View>

        {/* Payment info */}
        {(settings.iban || settings.paymentTerms) && (
          <View style={styles.paymentBlock}>
            <Text style={styles.paymentLabel}>Modalités de paiement</Text>
            {settings.paymentTerms && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentKey}>Conditions :</Text>
                <Text>{settings.paymentTerms}</Text>
              </View>
            )}
            {settings.iban && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentKey}>IBAN :</Text>
                <Text>{settings.iban}</Text>
              </View>
            )}
            {settings.bic && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentKey}>BIC :</Text>
                <Text>{settings.bic}</Text>
              </View>
            )}
            {settings.bankName && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentKey}>Banque :</Text>
                <Text>{settings.bankName}</Text>
              </View>
            )}
          </View>
        )}

        {/* Legal mentions */}
        <View style={styles.mentions}>
          {isFrancoTVA && (
            <Text style={styles.mention}>
              TVA non applicable, art. 293 B du CGI
            </Text>
          )}
          {settings.legalStatus?.includes("individuel") || settings.legalStatus?.toLowerCase().includes("ei") || settings.legalStatus?.toLowerCase().includes("micro") ? (
            <Text style={styles.mention}>
              Entrepreneur individuel (EI)
            </Text>
          ) : null}
          <Text style={styles.mention}>
            En cas de retard de paiement, une indemnité forfaitaire de 40 € pour frais de recouvrement
            sera exigible (art. L441-10 du Code de commerce), ainsi que des pénalités de retard
            au taux de {settings.lateFeePct && Number(settings.lateFeePct) > 0 ? `${(Number(settings.lateFeePct) * 100).toFixed(2)}%` : "trois fois le taux d'intérêt légal"}.
          </Text>
          <Text style={styles.mention}>
            Pas d'escompte pour paiement anticipé.
          </Text>
          {settings.legalMention && (
            <Text style={styles.mention}>{settings.legalMention}</Text>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {settings.commercialName || settings.legalName}
          {settings.siret && ` · SIRET ${settings.siret}`}
          {` · ${settings.postalCode} ${settings.city}`}
        </Text>
      </Page>
    </Document>
  );
};

export async function generateInvoicePDF(data: InvoicePDFData): Promise<Blob> {
  return pdf(<InvoiceDocument data={data} />).toBlob();
}
