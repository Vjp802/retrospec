export interface TimePoint {
  label: string;
  date: string;
  score: number;
  summary: string;
}

export interface ReviewSource {
  title: string;
  uri: string;
}

export interface ReviewData {
  deviceName: string;
  launchDate: string;
  currentVerdict: string; // e.g., "Buy", "Wait", "Skip"
  aggregateScore: number;
  reviewCount: number;
  confidenceScore: number;
  dataSourcesFound: string[];
  timePoints: TimePoint[];
  pros: string[];
  cons: string[];
  sources: ReviewSource[];
}

export interface SearchState {
  isLoading: boolean;
  error: string | null;
  data: ReviewData | null;
}