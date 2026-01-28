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