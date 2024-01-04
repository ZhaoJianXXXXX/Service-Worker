class SWIndexedDB {
  private _db: IDBDatabase | null = null;
  private connectionCount: number = 0;
  private _openPromise: Promise<unknown> | undefined;

  private async open(): Promise<unknown> {
    this.connectionCount++;
    if (this._db) {
      return Promise.resolve(this._db);
    }
    if (this._openPromise) {
      return this._openPromise;
    }
    this._openPromise = new Promise((resolve, reject) => {
      const request = self.indexedDB.open('SW_DB_NAME', 2);
      request?.addEventListener('success', (event) => {
        this._db = event.target?.result;
        resolve(this._db);
      });
      request?.addEventListener('error', (event) => {
        reject(event.target?.error);
      });
      request?.addEventListener('upgradeneeded', (event) => {
        const _db = event.target?.result;
        if (!_db?.objectStoreNames?.contains?.('SW_STORE')) {
          _db?.createObjectStore('SW_STORE', { keyPath: 'dbKey' });
        }
      });
    }).finally(() => {
      this._openPromise = undefined;
    });
    return this._openPromise;
  }

  private close(): void {
    this.connectionCount--;
    if (this._db !== null && this.connectionCount === 0) {
      this._db.close();
      this._db = null;
    }
  }

  async get(dbKey: string): Promise<{ [k: string]: unknown } | undefined> {
    let getResult: { [k: string]: unknown } | undefined;

    try {
      await this.open();
      const store = this._db?.transaction(['SW_STORE']).objectStore('SW_STORE');
      const request = store?.get(dbKey);

      getResult = await new Promise<{ [k: string]: unknown }>((resolve, reject) => {
        request?.addEventListener('success', (event) => {
          resolve(event.target?.result);
        });
        request?.addEventListener('error', (event) => {
          reject(event.target?.error);
        });
      });
    } catch (e) {
      console.error('indexDB get error', e);
    } finally {
      this.close();
    }

    return getResult;
  }

  async put(dbKey: string, value: { [k: string]: unknown }): Promise<IDBValidKey> {
    let putResult: IDBValidKey;

    try {
      await this.open();
      const store = this._db?.transaction(['SW_STORE'], 'readwrite').objectStore('SW_STORE');
      const request = store?.put({ ...value, dbKey });

      putResult = await new Promise<IDBValidKey>((resolve, reject) => {
        request?.addEventListener('success', (event) => {
          resolve(event.target?.result as IDBValidKey);
        });
        request?.addEventListener('error', (event) => {
          reject(event.target?.error);
        });
      });
    } catch (e) {
      console.error('indexDB put error', e);
    } finally {
      this.close();
    }

    return putResult;
  }
}

const swIndexDB = new SWIndexedDB();

export { swIndexDB };
