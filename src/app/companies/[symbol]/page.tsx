import { notFound } from "next/navigation";
import { CompanyDetailView } from "@/components/company-detail-view";
import { getCompanyBundle } from "@/lib/fundamentals/provider";

export default async function CompanyPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const bundle = await getCompanyBundle(decodeURIComponent(symbol));
  if (!bundle) notFound();

  return (
    <CompanyDetailView
      company={bundle.company}
      financials={bundle.financials}
      metrics={bundle.metrics}
      peers={bundle.peers}
      sourceLabel={bundle.sourceLabel}
    />
  );
}
