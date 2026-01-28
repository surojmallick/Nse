export interface ScanResult {
    stock: string;
    direction: string;
    price: string;
    entryRange: string;
    stopLoss: string;
    target: string;
    confidenceScore: string;
    reason: string;
    timestamp: string;
}

export interface ApiResponse {
    status: string;
    results: ScanResult[];
    message?: string;
    timestamp: number;
}

export interface ChartDataPoint {
    time: number;
    price: number;
}

export interface StockDetails {
    symbol: string;
    ltp: number;
    change: string;
    changePercent: string;
    prevClose: number;
    source: string;
    chart: ChartDataPoint[];
}

export interface StockSearchResponse {
    status: string;
    data: StockDetails;
    message?: string;
}