import { CacheableResponsePlugin } from 'workbox-cacheable-response';

import { isRequestSuccess } from '../utils';

interface IOptions {
  statuses: number[];
  headers?: {
    [key: string]: string;
  };
}

class ApiCacheableResponsePlugin extends CacheableResponsePlugin {
  constructor(config: IOptions) {
    super(config);
    const originalCacheWillUpdate = this.cacheWillUpdate ?? ((): Promise<null> => Promise.resolve(null));
    this.cacheWillUpdate = async (params): Promise<Response | null> => {
      const _response = await originalCacheWillUpdate(params);
      try {
        if (_response && (await isRequestSuccess(_response))) {
          return _response;
        }
      } catch (e) {
        console.error('[ApiCacheableResponsePlugin isRequestSuccess error]');
      }
      return null;
    };
  }
}
export { ApiCacheableResponsePlugin };
