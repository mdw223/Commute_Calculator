import type { Metadata } from "next";
import SalaryCalculator from "@/components/SalaryCalculator";
import SalaryHero from "@/components/SalaryHero";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import Ticker from "@/components/Ticker";

export const metadata: Metadata = {
  title: "Salary Calculator — Gas In This Economy",
  description:
    "Convert hourly pay to weekly, monthly, and yearly salary — and back again. Optional take-home estimate included.",
};

export default function CalculatorPage() {
  return (
    <>
      <Ticker />
      <SiteNav />
      <SalaryHero />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <SalaryCalculator />
      </main>
      <SiteFooter />
    </>
  );
}
