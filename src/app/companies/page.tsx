import { CompanySearchView } from "@/components/company-search-view";
import { getFundamentalDataset } from "@/lib/fundamentals/provider";

export default async function CompaniesPage() {
  const dataset = await getFundamentalDataset();

  return (
    <CompanySearchView
      companies={dataset.companies}
      industries={dataset.industries}
      sourceLabel={dataset.sourceLabel}
    />
  );
}
