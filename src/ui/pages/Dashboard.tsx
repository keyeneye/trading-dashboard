import PortfolioSummary from "@ui/components/PortfolioSummary";
import PerformanceChart from "@ui/components/PerformanceChart";
import PositionAllocationChart from "@ui/components/PositionAllocationChart";
import PositionsTable from "@ui/components/PositionsTable";
import RealtimeFeed from "@ui/components/RealtimeFeed";

export default function Dashboard() {
  return (
    <div class="dashboard">
      <PortfolioSummary />
      <div class="dashboard-charts-grid">
        <PerformanceChart />
        <PositionAllocationChart />
      </div>
      <div class="dashboard-grid">
        <PositionsTable />
        <RealtimeFeed />
      </div>
    </div>
  );
}
