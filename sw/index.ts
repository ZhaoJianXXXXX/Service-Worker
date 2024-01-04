import { trafficConfigStore } from 'sw/configStore';
import { FasterResRouter } from 'sw/strategies/FasterResRouter';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { clientsClaim, RouteMatchCallbackOptions } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing/registerRoute';
import { CacheFirst, NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies';

import { ARENA_BOE_DOMAIN } from 'client/src/common/constants/config.boe';
import { CDN_TOS_CN_DOMAIN } from 'client/src/common/constants/config.cn';
import {
  ARENA_VA_DOMAIN,
  CDN_TOS_DOMAIN,
  CDN_TOS_SG_DOMAIN,
  CDN_TOS_VA_DOMAIN,
  LF16_GOOFY_CDN_DOMAIN,
  LF3_CDN_TOS_DOMAIN,
} from 'client/src/common/constants/config.va';

import {
  STALE_WHILE_REVALIDATE_REQUESTS,
  NET_FIRST_REQUESTS,
  MAINFEST,
  SUCCESS_RESPONSE_CODES,
  REQUEST_LOGIN_RELATED_STATUS,
  IS_ONLINE,
  NEW_ARCH_PATH_LIST,
} from './constants';
import { registerEventsFromClient } from './events/sw';
import { FetchErrorTrackPlugin, ApiCacheableResponsePlugin } from './plugins';
import { NetworkFirstKeepStatues, TrafficHandingStrategy } from './strategies';
import { directlyUseCodes } from './utils';

self.__WB_DISABLE_DEV_LOGS = IS_ONLINE;

function matchUrl(urlList: string[]) {
  return ({ url }: RouteMatchCallbackOptions): boolean =>
    urlList.some((u: string) => (url.origin + url.pathname).indexOf(u) >= 0);
}

// setting
function setting(): void {
  void self.skipWaiting();
  clientsClaim();
}

// 预缓存
function precache(): void {
  precacheAndRoute(
    MAINFEST.filter(({ url }: { url: string }) => url.endsWith('js') || url.endsWith('css') || url.endsWith('png')),
  );
}

// api 请求策略
function registerApiStrategy(): void {
  registerRoute(
    matchUrl(STALE_WHILE_REVALIDATE_REQUESTS.CONTENT),
    new StaleWhileRevalidate({
      cacheName: STALE_WHILE_REVALIDATE_REQUESTS.CACHE_NAME,
      plugins: [
        new ApiCacheableResponsePlugin({
          statuses: SUCCESS_RESPONSE_CODES,
        }),
        new FetchErrorTrackPlugin({
          includeApiBizError: true,
        }),
      ],
    }),
  );

  registerRoute(
    matchUrl(NET_FIRST_REQUESTS.CONTENT),
    new NetworkFirstKeepStatues({
      cacheName: NET_FIRST_REQUESTS.CACHE_NAME,
      statuses: directlyUseCodes,
      checkApiBizError: true,
      ignoreBizErrorCodes: REQUEST_LOGIN_RELATED_STATUS,
      plugins: [
        new ApiCacheableResponsePlugin({
          statuses: SUCCESS_RESPONSE_CODES,
        }),
        new FetchErrorTrackPlugin({
          includeApiBizError: true,
        }),
      ],
    }),
  );
}

// html
function registerHtmlStrategy(): void {
  // 匹配row环境主应用的html资源
  // 注意过滤新架构的path
  registerRoute(
    ({ url, request }) =>
      !NEW_ARCH_PATH_LIST.includes(url.pathname) &&
      url.host === (!IS_ONLINE ? ARENA_BOE_DOMAIN : ARENA_VA_DOMAIN) &&
      !/\/oauth2\//.test(url.pathname) &&
      request.destination === 'document',
    new TrafficHandingStrategy({
      baseStrategy: new NetworkOnly({
        plugins: [new FetchErrorTrackPlugin()],
      }),
      getConfig: () => trafficConfigStore.getConfig({ configKey: 'htmlConfig' }),
    }),
  );
}

// 除html外的静态资源js/css等
function registerResourceStrategy(): void {
  // 匹配row环境子应用scm上的静态资源
  // 注意子应用scm产物需要三级房部署（与线上保持一致）
  registerRoute(
    ({ url }) =>
      new RegExp(
        [
          CDN_TOS_DOMAIN,
          CDN_TOS_CN_DOMAIN,
          CDN_TOS_VA_DOMAIN,
          CDN_TOS_SG_DOMAIN,
          LF3_CDN_TOS_DOMAIN,
          LF16_GOOFY_CDN_DOMAIN,
        ].join('|'),
        'g',
      ).test(url.host) &&
      /\/ife\/arena_packages(\/|_)\w+\//.test(url.pathname) &&
      new RegExp(
        [
          'client/',
          'search/',
          'hostcenter/',
          'live/',
          'spenderCenter/',
          'cms/',
          'live_ecology/',
          'communication/',
          'cockpit/',
          'tools/',
        ].join('|'),
        'g',
      ).test(url.pathname),
    new TrafficHandingStrategy({
      baseStrategy: new CacheFirst({
        cacheName: 'resource_cache_first_cache_name',
        plugins: [
          new CacheableResponsePlugin({
            statuses: SUCCESS_RESPONSE_CODES,
          }),
          new ExpirationPlugin({
            maxAgeSeconds: 60 * 60 * 24 * 7,
          }),
          new FetchErrorTrackPlugin(),
        ],
      }),
      getConfig: () => trafficConfigStore.getConfig({ configKey: 'resourceConfig' }),
    }),
  );
}

function run(): void {
  // 开启寻路初始化
  const fasterResRouter = FasterResRouter.getInstance();
  fasterResRouter.setConfig(() => trafficConfigStore.getConfig({ configKey: 'fasterRouterOpen' }));

  setting();

  // event
  registerEventsFromClient();

  // 静态资源
  registerHtmlStrategy();
  registerResourceStrategy();

  // api请求策略注册
  registerApiStrategy();

  // precache
  precache();
}

// 运行
run();
