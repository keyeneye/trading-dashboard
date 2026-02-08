import PortfolioSummary from "@ui/components/PortfolioSummary";
import EquityChart from "@ui/components/EquityChart";
import FibonacciChart from "@ui/components/FibonacciChart";
import PositionsTable from "@ui/components/PositionsTable";
import RealtimeFeed from "@ui/components/RealtimeFeed";

export default function Dashboard() {
  return (
    <div class="dashboard">
      <PortfolioSummary />
      <EquityChart />
      <FibonacciChart />
      <div class="dashboard-grid">
        <PositionsTable />
        <RealtimeFeed />
      </div>
    </div>
  );
}
