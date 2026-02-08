import PortfolioSummary from "@ui/components/PortfolioSummary";
import FibonacciChart from "@ui/components/FibonacciChart";
import PositionsTable from "@ui/components/PositionsTable";
import RealtimeFeed from "@ui/components/RealtimeFeed";

export default function Dashboard() {
  return (
    <div class="dashboard">
      <PortfolioSummary />
      <FibonacciChart />
      <div class="dashboard-grid">
        <PositionsTable />
        <RealtimeFeed />
      </div>
    </div>
  );
}
