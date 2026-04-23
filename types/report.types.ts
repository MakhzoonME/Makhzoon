export interface ReportsSummary {
  totalAssets: number;
  activeAssets: number;
  retiredAssets: number;
  totalValue: number;
  activeCheckouts: number;
  overdueCheckouts: number;
  warrantiesExpiringSoon: number;
  openRequests: number;
  maintenanceCost: number;
  maintenanceCount: number;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  value: number;
}

export interface LocationBreakdown {
  location: string;
  count: number;
}

export interface MonthlyMaintenancePoint {
  month: string;
  cost: number;
  count: number;
}

export interface ReportsResponse {
  summary: ReportsSummary;
  categories: CategoryBreakdown[];
  locations: LocationBreakdown[];
  maintenanceByMonth: MonthlyMaintenancePoint[];
}
