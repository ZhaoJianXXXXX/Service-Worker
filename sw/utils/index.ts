import { cloneDeep } from 'lodash';
import { Strategy } from 'workbox-strategies';

import { REQUEST_STATUS } from '../constants';
import { IResponseStruct } from '../type';

export async function isRequestSuccess(response: Response, ignoreList: number[] = []): Promise<boolean> {
  try {
    const res = (await response.clone().json()) as unknown as IResponseStruct;
    let statusCode = REQUEST_STATUS.SERVER_ERROR;
    const { BaseResp, baseResp, status_code } = res;
    if (BaseResp) {
      statusCode = BaseResp.StatusCode;
    } else if (baseResp) {
      statusCode = baseResp.statusCode;
    } else if (typeof status_code === 'number') {
      statusCode = status_code;
    }
    return statusCode === REQUEST_STATUS.SUCCESS || ignoreList.includes(statusCode);
  } catch (e) {
    console.error('isRequestSuccess', e);
    return false;
  }
}

export async function getBizCode(response: Response): Promise<void | number> {
  let statusCode;
  try {
    const res = (await response.clone().json()) as unknown as IResponseStruct;
    const { BaseResp, baseResp, status_code } = res;
    if (BaseResp) {
      statusCode = BaseResp.StatusCode;
    } else if (baseResp) {
      statusCode = baseResp.statusCode;
    } else if (typeof status_code === 'number') {
      statusCode = status_code;
    }
  } catch (e) {
    console.error('getBizCode', e);
  }
  return statusCode;
}

// 切换域名/path，修改headers
export function rewriteRequest({
  request,
  config,
}: {
  request: Request;
  config: {
    hostReplace?: string;
    pathReplace?: string | { [k: string]: string };
    headers?: { [k: string]: string };
  };
}): Request {
  const { hostReplace, pathReplace, headers } = config;
  const originalUrl = new URL(request.url);
  if (hostReplace) {
    originalUrl.host = hostReplace;
  }
  if (pathReplace) {
    if (typeof pathReplace === 'string') {
      originalUrl.pathname = pathReplace;
    } else if (typeof pathReplace === 'object') {
      let originPathList = Object.keys(pathReplace);
      originPathList = originPathList.sort((a, b) => b.length - a.length);
      for (const originPath of originPathList) {
        const originPathReg = new RegExp(originPath);
        if (originPathReg.test(originalUrl.pathname)) {
          originalUrl.pathname = originalUrl.pathname.replace(originPathReg, pathReplace[originPath]);
          break;
        }
      }
    }
  }
  const newHeaders = new Headers(request.headers);
  if (headers) {
    Object.keys(headers).forEach((key) => {
      newHeaders.set(key, headers[key]);
    });
  }
  return new Request(originalUrl.toString(), {
    ...request,
    headers: newHeaders,
  });
}

// 请求重试
export async function retryRequest({
  request,
  event,
  config,
}: {
  request: Request;
  event: Event;
  config: {
    baseStrategy: Strategy;
    retryList: {
      hostReplace: string;
      pathReplace?: string | { [k: string]: string };
    }[];
  };
}): Promise<Response> {
  const { baseStrategy, retryList } = config;
  const originRequest = request;
  let retryResponse: Response;
  const tryFetch = async ({
    _request,
    _retryList,
  }: {
    _request: Request;
    _retryList: {
      hostReplace: string;
      pathReplace?: string | { [k: string]: string };
    }[];
  }): Promise<Response> => {
    const cloneRetryList = cloneDeep(_retryList);
    try {
      retryResponse = await baseStrategy.handle({ event, request: _request });
      if (retryResponse.status < 400) {
        return retryResponse;
      } else {
        throw Error(`request ${_request.url} failed: ${retryResponse.status}`);
      }
    } catch {
      if (cloneRetryList?.length) {
        const currentRetry = cloneRetryList.shift();
        const newRetryRequest = rewriteRequest({
          request: originRequest,
          config: {
            hostReplace: currentRetry?.hostReplace,
            pathReplace: currentRetry?.pathReplace,
          },
        });

        return await tryFetch({ _request: newRetryRequest, _retryList: cloneRetryList });
      } else {
        return retryResponse;
      }
    }
  };

  return await tryFetch({
    _request: originRequest,
    _retryList: retryList,
  });
}

export function directlyUseCodes(code: number): boolean {
  // 401 为未登陆，直接进行逻辑处理不走缓存
  return code < 400 || code === 401;
}
