// Originally from:
// https://medium.com/sparkles-blog/a-simple-lru-cache-in-typescript-cba0d9807c40

export class LruCache<T> {
  private values: Map<string, T> = new Map<string, T>();
  private maxEntries: number;

  constructor(maxEntries: number = 20) {
    this.maxEntries = maxEntries;
  }

  public get(key: string): T | undefined {
    let entry: T | undefined;
    entry = this.values.get(key);
    if (entry === undefined) { return undefined; }
    // peek the entry, re-insert for LRU strategy
    this.values.delete(key);
    this.values.set(key, entry);

    return entry;
  }

  public put(key: string, value: T) {
    if (this.values.size >= this.maxEntries) {
      // least-recently used cache eviction strategy
      const keyToDelete = this.values.keys().next().value;
      this.values.delete(keyToDelete);
    }

    this.values.set(key, value);
  }

  public delete(key: string) {
    this.values.delete(key);
  }
}

export class LockingLruCache<T>{
  private cache: LruCache<T>;
  private mutex: Mutex<T | undefined>;

  constructor(maxEntries?: number) {
    this.cache = new LruCache<T>(maxEntries);
    this.mutex = new Mutex<T | undefined>();
  }

  public async getYield(key: string, callback: () => Promise<void>): Promise<T | undefined> {
    return await this.mutex.sync(async () => {
      await callback();
      return this.cache.get(key);
    });
  }

  public get(key: string): T | undefined {
    return this.cache.get(key);
  }

  public put(key: string, value: T) {
    this.cache.put(key, value);
  }

  public delete(key: string) {
    this.cache.delete(key);
  }
}

type Callback<T> = () => T | PromiseLike<T>;
type Resolve<T> = (value: T | PromiseLike<T>) => void;

class Mutex<T> {
  private queue: {
    func: Callback<T>,
    resolve: Resolve<T>
    reject: Resolve<Error>
  }[];

  constructor() {
    this.queue = [];
  }

  public async sync(func: Callback<T>) {
    // Enqueue work.
    const promise = new Promise<T>(async (resolve, reject) => {
      this.queue.push({
        func,
        resolve,
        reject
      });

      if (this.queue.length === 1) {
        while (this.queue.length > 0) {
          const { func, resolve, reject } = this.queue[0];

          try {
            let res = await func();
            resolve(res)
          } catch (err) {
            reject(err as Error);
          }

          this.queue.shift();
        }
      }
    });
    return promise;
  }
}
