interface CacheContent {
    urls: string[];
    results: any[];
}

class InMemoryCache {
    private cache: CacheContent | null = null;
    private cacheMaxSize: number = -1;

    constructor(cacheMaxSize: number) {
        this.cacheMaxSize = cacheMaxSize;
    }

    public size(): number {
        return (this.cache) ? this.cache.urls.length : 0;
    }

    public getUrls(): string[] | null {
        return (this.cache) ? this.cache.urls : null;
    }

    public getResults(): any[] | null {
        return (this.cache) ? this.cache.results : null;
    }
    
    public push(url: string, result: {}): void {
        if (!this.cache) {
            this.cache = { urls: [], results: [] };
        }
        if (this.cache.urls.length >= this.cacheMaxSize) {
            this.cache.urls.shift();
            this.cache.results.shift();
        }
        this.cache.urls.push(url);
        this.cache.results.push(result);
    }

    public findResult(url: string): {} | null {
        if (!this.cache) {
            return null;
        }
        for (let i = 0; i < this.cache.results.length; i++) {
            if (this.cache.urls[i] === url) {
                return this.cache.results[i];
            }
        }
        return null;
    }

    public pivot(url: string): void {
        if (!this.cache) {
            return;
        }
        let idx = this.cache.urls.indexOf(url);
        if (idx === -1 || idx === this.cache.urls.length - 1) {
            return;
        }
        
        this.cache.urls.splice(idx, 1);
        this.cache.urls.push(url);
        
        let result = this.cache.results.splice(idx, 1);
        this.cache.results.push(result);
    }
}

export default InMemoryCache