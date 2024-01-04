import { cloneDeep, isEmpty } from 'lodash';
import { Strategy } from 'workbox-strategies';

import { FasterResRouter } from './FasterResRouter';

import { retryRequest, rewriteRequest } from '../utils';

type Config = {
  [k: string]: {
    rewriteParams?: { enabled: boolean; hostReplace: string; pathReplace?: string | { [k: string]: string } };
    retryParams?: {
      enabled: boolean;
      retryList: { hostReplace: string; pathReplace?: string | { [k: string]: string } }[];
    };
    offlineParams?: { enabled: boolean };
  };
};

class TrafficHandingStrategy {
  private readonly baseStrategy;
  getConfig: () => unknown;

  constructor({ baseStrategy, getConfig }: { baseStrategy: Strategy; getConfig: () => unknown }) {
    this.baseStrategy = baseStrategy;
    this.getConfig = getConfig;
  }

  async handle({ request, url, event }: { request: Request; url: URL; event: Event }): Promise<Response> {
    const config = this.getConfig() as Config;
    const currentConfig = config?.[url.host] || {};
    const { rewriteParams, retryParams, offlineParams } = cloneDeep(currentConfig);

    let response = new Response();
    const originRequest = request;
    let processedRequest = originRequest;
    let cacheName: Request | string = originRequest;

    try {
      // 是否请求改写
      if (rewriteParams?.enabled) {
        processedRequest = rewriteRequest({
          request: processedRequest,
          config: { ...rewriteParams },
        });
      } else {
        // 最优选路
        const fastRes = FasterResRouter.getInstance().findFasterRes(request);
        if (fastRes) {
          processedRequest = rewriteRequest({
            request: processedRequest,
            config: fastRes,
          });
        }
      }
      // 发起请求
      response = await this.baseStrategy.handle({ event, request: processedRequest });
      // 没有容灾配置直接返回结果
      if (isEmpty(currentConfig)) return response;

      if (response?.status >= 400) {
        throw Error(`response status isn't available`);
      }
    } catch (error) {
      console.error('==TrafficHandingStrategy==', error);
      // 是否重试
      if (retryParams?.enabled) {
        response = await retryRequest({
          request: originRequest,
          event,
          config: { baseStrategy: this.baseStrategy, ...retryParams },
        });
      }
    }
    if (response?.status === 200) {
      // 是否离线兜底，主要作用于networkOnly策略，状态码200需要手动缓存下资源，此处对页面导航的html做特殊处理（离线缓存到同一份）
      if (offlineParams?.enabled) {
        const cache = await caches.open('offline_caches');
        if (originRequest.destination === 'document' && originRequest.url.indexOf(location.host) > 0) {
          cacheName = '/offline.html';
        }
        await cache.put(cacheName, response.clone());
      }
      return response;
    } else {
      // 是否使用离线资源
      if (offlineParams?.enabled) {
        const cache = await caches.match(cacheName);
        if (cache) {
          return cache;
        }
      }

      return response;
    }
  }
}

export { TrafficHandingStrategy };
