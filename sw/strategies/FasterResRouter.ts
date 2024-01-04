import { cloneDeep } from 'lodash';

import { LF16_GOOFY_CDN_DOMAIN, LF3_CDN_TOS_DOMAIN } from 'client/src/common/constants/config.va';

import { swIndexDB } from '../indexDB';

enum REGION {
  CN,
  VA,
  SG,
  BOE,
}

enum GROUP_TYPE {
  INTERIOR = 'INTERIOR',
  EXTERNAL = 'EXTERNAL',
}

interface IReplaceConfig {
  region: REGION;
  group: GROUP_TYPE;
  detectUrl?: string;
}

const RES_REPLACE_CONFIG: { [url: string]: { [path: string]: IReplaceConfig } } = {
  [LF3_CDN_TOS_DOMAIN]: {
    '/obj/goofy/ife/arena_packages_': {
      region: REGION.CN,
      group: GROUP_TYPE.EXTERNAL,
      detectUrl: `https://${LF3_CDN_TOS_DOMAIN}/obj/goofy/ife/arena_packages_cms/async/107.662a73cd.js`,
    },
  },
  [LF16_GOOFY_CDN_DOMAIN]: {
    '/obj/goofy-sg/ife/arena_packages_': {
      region: REGION.SG,
      group: GROUP_TYPE.EXTERNAL,
      detectUrl: `https://${LF16_GOOFY_CDN_DOMAIN}/obj/goofy-sg/ife/arena_packages_cms/async/107.662a73cd.js`,
    },
    '/obj/goofy-va/ife/arena_packages_': {
      region: REGION.VA,
      group: GROUP_TYPE.EXTERNAL,
      detectUrl: `https://${LF16_GOOFY_CDN_DOMAIN}/obj/goofy-va/ife/arena_packages_cms/async/107.662a73cd.js`,
    },
  },
};

const HEART_BEAT_MIN = 5;
const FIRST_DELAY_TIME = 5000;
const DATA_KEY = 'FASTER_RES_INFO';

export class FasterResRouter {
  private static instance: FasterResRouter;
  private fasterMatchMap: { [key: string]: IReplaceConfig & { host: string; path: string; time: number } } = {};
  private getConfig: (() => unknown) | undefined;

  private constructor() {
    void this.getPersistenceData();
    this.startHeartBeat();
  }

  static getInstance(): FasterResRouter {
    if (!this.instance) {
      this.instance = new FasterResRouter();
    }
    return this.instance;
  }

  setConfig(fn: () => unknown): void {
    if (fn) {
      this.getConfig = fn;
    }
  }

  private async getPersistenceData() {
    const persistenceData = await swIndexDB.get(DATA_KEY);
    if (persistenceData) {
      this.fasterMatchMap = persistenceData as {
        [key: string]: IReplaceConfig & { host: string; path: string; time: number };
      };
    }
  }

  private async setPersistenceData(info: {
    [key: string]: IReplaceConfig & { host: string; path: string; time: number };
  }) {
    await swIndexDB.put(DATA_KEY, info);
  }

  private startHeartBeat() {
    setTimeout(() => {
      void this.checkFasterHost();
    }, FIRST_DELAY_TIME);
    setInterval(() => {
      void this.checkFasterHost();
    }, HEART_BEAT_MIN * 60 * 1000);
  }

  private async retryTargetReq(url: string, time: number) {
    for (let i = 0; i < time; i++) {
      await fetch(url);
    }
  }

  private async checkFasterHost() {
    const fastMap: { [key: string]: IReplaceConfig & { host: string; path: string; time: number } } = {};
    const configList = Object.keys(RES_REPLACE_CONFIG);

    for (let hostIndex = 0; hostIndex < configList.length; hostIndex++) {
      const host = configList[hostIndex];
      const pathConfig = RES_REPLACE_CONFIG[host];
      const pathList = Object.keys(pathConfig);
      for (const path of pathList) {
        const item = pathConfig[path];
        const startTime = Date.now();
        let time = Infinity;
        try {
          if (item.detectUrl) {
            await this.retryTargetReq(`${item.detectUrl}?timestamp=${Date.now()}`, 3);
            time = Date.now() - startTime;
          }
        } catch (e) {
          console.error('checkFasterHost error', item);
        }
        if (time < Infinity) {
          if (!fastMap?.[item.group]) {
            fastMap[item.group] = { ...item, time, host, path };
          } else {
            if (time < fastMap?.[item.group]?.time) {
              fastMap[item.group] = { ...item, time, host, path };
            }
          }
        }
      }
    }
    const _fastMap = cloneDeep(fastMap);
    this.fasterMatchMap = _fastMap;
    void this.setPersistenceData(_fastMap);
  }

  findFasterRes(request: Request): { hostReplace?: string; pathReplace?: string } | null {
    const fasterRouterOpen = this.getConfig?.() as boolean;
    if (!fasterRouterOpen) {
      return null;
    }
    const host = request?.url?.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i)?.[1];
    const reqPath = request?.url?.match(/^https?:\/\/[^\/]+(\/[^?]+)/)?.[1];
    if (host && reqPath && RES_REPLACE_CONFIG[host]) {
      const pathList = Object.keys(RES_REPLACE_CONFIG[host]);
      for (const path of pathList) {
        if (request.url.includes(path)) {
          const group = RES_REPLACE_CONFIG[host]?.[path]?.group;
          const replaceInfo = this.fasterMatchMap[group];
          if (replaceInfo) {
            return { hostReplace: replaceInfo.host, pathReplace: reqPath.replace(path, replaceInfo.path) };
          }
        }
      }
    }
    return null;
  }
}
