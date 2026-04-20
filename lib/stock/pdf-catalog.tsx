import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZJhiJ-Ek-_EeA.woff2", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZJhiJ-Ek-_EeA.woff2", fontWeight: 600 },
  ],
});

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "Inter", fontSize: 9, color: "#18181b" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 25, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  title: { fontSize: 22, fontWeight: 600, letterSpacing: 4, color: "#09090b" },
  subtitle: { fontSize: 9, color: "#71717a", marginTop: 4 },
  dateText: { fontSize: 8, color: "#a1a1aa", textAlign: "right" as const },
  statsRow: { flexDirection: "row", marginBottom: 20, gap: 12 },
  statBox: { flex: 1, backgroundColor: "#f4f4f5", borderRadius: 6, padding: 10 },
  statLabel: { fontSize: 7, color: "#71717a", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 3 },
  statValue: { fontSize: 16, fontWeight: 600, color: "#09090b" },
  statSub: { fontSize: 7, color: "#a1a1aa", marginTop: 2 },
  table: { marginTop: 5 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f4f4f5", borderRadius: 4, paddingVertical: 6, paddingHorizontal: 8, marginBottom: 4 },
  tableRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: "#f4f4f5" },
  th: { fontSize: 7, fontWeight: 600, color: "#71717a", textTransform: "uppercase" as const, letterSpacing: 0.8 },
  td: { fontSize: 8.5, color: "#27272a" },
  tdMuted: { fontSize: 8, color: "#a1a1aa" },
  tdBold: { fontSize: 8.5, fontWeight: 600, color: "#09090b" },
  tdGreen: { fontSize: 8.5, fontWeight: 600, color: "#059669" },
  tdRed: { fontSize: 8.5, fontWeight: 600, color: "#dc2626" },
  colSku: { width: "12%" },
  colTitle: { width: "28%" },
  colBrand: { width: "14%" },
  colCategory: { width: "10%" },
  colPurchase: { width: "12%", textAlign: "right" as const },
  colTarget: { width: "12%", textAlign: "right" as const },
  colMargin: { width: "12%", textAlign: "right" as const },
  footer: { position: "absolute" as const, bottom: 25, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: "#e5e7eb", paddingTop: 8 },
  footerText: { fontSize: 7, color: "#a1a1aa" },
  badge: { fontSize: 7, color: "#6366f1", backgroundColor: "#eef2ff", borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1.5 },
});

type Product = {
  sku: string;
  title: string;
  brand: string;
  category: string;
  purchasePrice: number;
  targetPrice: number | null;
  status: string;
};

type StockPDFProps = {
  products: Product[];
  shopName: string;
  generatedAt: Date;
};

const CATEGORIES: Record<string, string> = {
  sacs: "Sacs", chaussures: "Chaussures", vetements: "Vêtements",
  accessoires: "Accessoires", montres: "Montres", bijoux: "Bijoux", autre: "Autre",
};

function formatEur(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export function StockCatalogPDF({ products, shopName, generatedAt }: StockPDFProps) {
  const totalValue = products.reduce((s, p) => s + p.purchasePrice, 0);
  const totalTarget = products.reduce((s, p) => s + (p.targetPrice ?? 0), 0);
  const potentialMargin = totalTarget - totalValue;
  const avgMarginPct = totalValue > 0 ? ((potentialMargin / totalValue) * 100) : 0;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>MARLO</Text>
            <Text style={s.subtitle}>{shopName || "Catalogue stock"}</Text>
          </View>
          <View>
            <Text style={s.dateText}>
              Généré le {generatedAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </Text>
            <Text style={s.dateText}>{products.length} article{products.length > 1 ? "s" : ""}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Articles en stock</Text>
            <Text style={s.statValue}>{products.length}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Valeur d'achat</Text>
            <Text style={s.statValue}>{formatEur(totalValue)}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Valeur visée</Text>
            <Text style={s.statValue}>{formatEur(totalTarget)}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Marge potentielle</Text>
            <Text style={[s.statValue, { color: potentialMargin >= 0 ? "#059669" : "#dc2626" }]}>
              {formatEur(potentialMargin)}
            </Text>
            <Text style={s.statSub}>{avgMarginPct.toFixed(0)}% moy.</Text>
          </View>
        </View>

        {/* Table */}
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.th, s.colSku]}>SKU</Text>
            <Text style={[s.th, s.colTitle]}>Article</Text>
            <Text style={[s.th, s.colBrand]}>Marque</Text>
            <Text style={[s.th, s.colCategory]}>Catégorie</Text>
            <Text style={[s.th, s.colPurchase]}>Achat</Text>
            <Text style={[s.th, s.colTarget]}>Visé</Text>
            <Text style={[s.th, s.colMargin]}>Marge</Text>
          </View>
          {products.map((p, i) => {
            const margin = p.targetPrice ? p.targetPrice - p.purchasePrice : null;
            const marginPct = margin !== null && p.purchasePrice > 0 ? (margin / p.purchasePrice) * 100 : null;
            return (
              <View key={i} style={[s.tableRow, i % 2 === 0 ? {} : { backgroundColor: "#fafafa" }]}>
                <Text style={[s.tdMuted, s.colSku]}>{p.sku}</Text>
                <Text style={[s.td, s.colTitle]}>{p.title}</Text>
                <Text style={[s.td, s.colBrand]}>{p.brand}</Text>
                <Text style={[s.tdMuted, s.colCategory]}>{CATEGORIES[p.category] ?? p.category}</Text>
                <Text style={[s.tdBold, s.colPurchase]}>{formatEur(p.purchasePrice)}</Text>
                <Text style={[s.td, s.colTarget]}>{formatEur(p.targetPrice)}</Text>
                <Text style={[margin !== null && margin >= 0 ? s.tdGreen : s.tdRed, s.colMargin]}>
                  {margin !== null ? `${formatEur(margin)} (${marginPct!.toFixed(0)}%)` : "—"}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Marlo — Luxury Resell Management</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
