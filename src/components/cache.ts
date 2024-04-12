interface CacheContent {
    urls: string[];
    data: any[];
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

    public getData(): any[] | null {
        return (this.cache) ? this.cache.data : null;
    }
    
    public push(url: string, data: {}): void {
        if (!this.cache) {
            this.cache = { urls: [], data: [] };
        }
        if (this.cache.urls.length >= this.cacheMaxSize) {
            this.cache.urls.shift();
            this.cache.data.shift();
        }
        this.cache.urls.push(url);
        this.cache.data.push(data);
    }

    public findData(url: string): {} | null {
        if (!this.cache) {
            return null;
        }
        for (let i = 0; i < this.cache.data.length; i++) {
            if (this.cache.urls[i] === url) {
                return this.cache.data[i];
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
        
        let data = this.cache.data.splice(idx, 1);
        this.cache.data.push(data);
    }
}

export default InMemoryCache