export const STALE_WHILE_REVALIDATE_REQUESTS = {
  CACHE_NAME: 'api_stale_while_revalidate',
  CONTENT: [
    '/arena-new/node-live/api/v2/no_auth/user/init/',
    `${location.origin}/api/arena/base/platform/getAllAuth`,
    `${location.origin}/arena-new/node-live/api/v2/no_auth/auth/`,
    '/api/arena/no_auth/tool/region',
  ],
};

export const NET_FIRST_REQUESTS = {
  CACHE_NAME: 'api_netfirst',
  CONTENT: ['/api/arena/no_auth/tool/merge/getAllMergeConfig'],
};

export const MAINFEST = self.__WB_MANIFEST;
export const SUCCESS_RESPONSE_CODES = [200];

export enum REQUEST_STATUS {
  NETWORK_ERROR = -1,
  SUCCESS = 0,
  SUB_APP_NEED_LOGIN = 98,
  AUTH = 401,
  NEW_AUTH = 402,
  LOGIN_ERROR = 403,
  SERVER_ERROR = 500,
}

export enum SW_EVENTS {
  LOGOUT = 'LOGOUT',
  TO_LOGIN = 'TO_LOGIN',
  SLARDAR_EVENT = 'SLARDAR_EVENT',
  SW_TCC = 'SW_TCC',
  PAGE_LOAD = 'PAGE_LOAD',
}

export const REQUEST_LOGIN_RELATED_STATUS = [
  REQUEST_STATUS.AUTH,
  REQUEST_STATUS.NEW_AUTH,
  REQUEST_STATUS.SUB_APP_NEED_LOGIN,
  REQUEST_STATUS.LOGIN_ERROR,
];

export const IS_ONLINE = process.env.NODE_ENV === 'production';

export const NEW_ARCH_PATH_LIST = ['/tools/groupManagement'];
