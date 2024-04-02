interface CacheContent {
    url: string;
    results: {};
}

class InMemoryCache {
    private cache: CacheContent | null = null;

    public setCache(url: string, results: {}): void {
        this.cache = { url, results };
    }

    public getCache(): CacheContent | null {
        return (this.cache) ? this.cache : null;
    }

    public clearCache(): void {
        this.cache = null;
    }
}

export default InMemoryCache