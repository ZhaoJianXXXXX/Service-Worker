import path from 'path';
import ENV_CONFIG from './buildConfig/env';
import KANI_CONFIG_MAP from './buildConfig/kani';
import REGION_MAP from './buildConfig/region';
import TEA_CONFIG_MAP from './buildConfig/tea';
import STARLING_CONFIG_MAP from './buildConfig/starling';
import SLARDAR_CONFIG_MAP from './buildConfig/slardar';
import { createEdenConfig } from '@ies/eden-web-build';
import SemiPlugin from '@douyinfe/semi-webpack-plugin';
import process from 'process';
const SlardarWebpackPlugin = require('@slardar/webpack-plugin');
import { PerfseePlugin } from '@perfkit/webpack';
import { InjectManifest } from 'workbox-webpack-plugin';
const CUSTOM_CDN_URL = process.env.CUSTOM_CDN_URL || '';

const CDN_PREFIX_MAP = {
  VA: '/ife/arena_packages_client',
  TTP: '/ife/arena_packages_client/ttp',
};

const CDN_DOMAINS_MAP = {
  VA: [CUSTOM_CDN_URL, CUSTOM_CDN_URL], // 美东cdn域名
  TTP: ['//lf0-cdn-tos.tiktok-usts.net/obj/internal-static-tx', '//lf0-cdn-tos.tiktok-usts.net/obj/internal-static-tx'], // ttp域名
};

const isDev = process.env.NODE_ENV === 'development';

const IS_TTP = (process.env.BUILD_REGION || process.env.__RUNTIME_REGION__ || 'VA') === 'oci';
const REGION = IS_TTP ? 'TTP' : 'VA';
const BUILD_BRANCH = process.env.BUILD_REPO_BRANCH || process.env.BUILD_BRANCH;
const BUILD_VERSION = process.env.BUILD_VERSION || '0.0.0';
const PRO_ENV = process.env.PRO_ENV || 'prod';

const isProd = process.env.NODE_ENV === 'production';
const buildOnlineWithMaster = process.env.BUILD_TYPE === 'online' && BUILD_BRANCH === 'master';

const minimizeConfig = buildOnlineWithMaster
  ? {
      minimize: {
        js: {
          terserOptions: {
            compress: {
              drop_console: false,
              pure_funcs: ['console.info', 'console.log', 'console.warn'],
            },
          },
        },
      },
    }
  : {};

if (!REGION) {
  console.log("can't find no region");
}

console.log('process.env.PRO_ENV: ', process.env.PRO_ENV);

if (!['test', 'boe', 'prod'].includes(PRO_ENV)) {
  console.log('PRO_ENV ERROR');
}

const { WEB_DOMAIN } = ENV_CONFIG[REGION][PRO_ENV];
const CDN_DOMAINS = CDN_DOMAINS_MAP[REGION];
const CDN_PREFIX = CDN_PREFIX_MAP[REGION];

let _cdnIndex = 0;
const publicPath = () => (isProd ? `${CDN_DOMAINS[_cdnIndex++ % CDN_DOMAINS.length]}${CDN_PREFIX}/` : '/');
publicPath.toString = () => publicPath();

export default createEdenConfig({
  projectType: 'Web',
  runtimeTarget: 'Modern',
  input: path.resolve(__dirname, './src/pages/portal/index.js'),
  output: {
    library: 'arena_base',
    publicPath,
    crossOriginLoading: IS_TTP ? 'use-credentials' : 'anonymous',
    filename: '[name].[chunkhash:8].js',
    ...(process.env.BUILD_TYPE === 'online'
      ? {
          hashSalt: 'online',
        }
      : {}),
  },
  dest: `build_${REGION.toLowerCase()}`,
  abilities: {
    html: {
      crossorigin: IS_TTP ? 'use-credentials' : true,
    },
    react: {
      hot: false,
    },
    sass: {
      cssLoaderOptions: {
        modules: {
          auto: (resourcePath: string) => !/node_modules/.test(resourcePath),
          localIdentName: '[local]--[hash:base64:5]',
        },
      },
    },
    less: {
      lessLoaderOptions: {
        lessOptions: {
          javascriptEnabled: true,
        },
      },
    },
    js: isDev
      ? {
          babelOptions: {
            plugins: ['react-hot-loader/babel'],
          },
        }
      : true,
    semi: {
      version: 1,
      theme: '@semi-bot/semi-theme-arena',
      srcSvgPaths: [/src\/common\/icons/],
      extract: true,
    },
    ts: {
      useBabelPresetTypeScript: true,
      babel: {
        babelOptions: {
          sourceType: 'unambiguous',
        },
      },
      tsconfigPaths: {
        configFile: path.resolve(__dirname, `tsconfig.json`),
        baseUrl: __dirname,
      },
    },
    maiev: false,
    define: {
      'process.env.BUILD_REGION': JSON.stringify(process.env.BUILD_REGION),
      'process.env.__RUNTIME_REGION__': JSON.stringify(process.env.__RUNTIME_REGION__),
      'process.env.REGION_ENV': JSON.stringify(REGION),
      WEBCAST_CONFIG_KANI_APP: JSON.stringify(KANI_CONFIG_MAP[REGION]),
      WEBCAST_CONFIG_REGION_MAP: JSON.stringify(REGION === 'IN' ? {} : REGION_MAP),
      WEBCAST_CONFIG_TEA: JSON.stringify(TEA_CONFIG_MAP[REGION]),
      WEBCAST_CONFIG_STARLING: JSON.stringify(STARLING_CONFIG_MAP[REGION]),
      WEBCAST_CONFIG_STARLING_URL: JSON.stringify(STARLING_CONFIG_MAP[REGION]?.zoneHost),
      WEBCAST_CONFIG_SLADAR: JSON.stringify(SLARDAR_CONFIG_MAP[REGION]),
      _PRODUCTION_: JSON.stringify(isProd),
      _VERSION_: JSON.stringify(BUILD_VERSION),
      __REGION__: JSON.stringify(REGION),
      __IS_NEW_ARCH__: JSON.stringify(false),
      __IS_DEV__: JSON.stringify(isDev),
      __IS_PRODUCTION__: JSON.stringify(isProd),
      __IS_TTP__: JSON.stringify(IS_TTP),
      __BUILD_BRANCH__: JSON.stringify(BUILD_BRANCH),
      __BUILD_VERSION__: JSON.stringify(BUILD_VERSION),
    },
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      alias: {
        client: path.resolve(__dirname),
        common: path.resolve(__dirname, './src/common'),
        'byted-tea-sdk': TEA_CONFIG_MAP[REGION].NPM,
        '@ies/semi-ui-react': path.resolve(__dirname, './node_modules/@ies/semi-ui-react'),
        '@babel/runtime-corejs3': path.resolve(__dirname, './node_modules/@babel/runtime-corejs3'),
        react: path.resolve(__dirname, './node_modules/react'),
        'react-dom': isDev
          ? path.resolve(__dirname, './node_modules/@hot-loader/react-dom')
          : path.resolve(__dirname, './node_modules/react-dom'),
        'react-redux': path.resolve(__dirname, './node_modules/react-redux'),
        '@ies/audit-semi-copy-id': path.resolve(__dirname, './node_modules/@ies/audit-semi-copy-id'),
        '@byted-tiktok/arena-business-components': path.resolve(
          __dirname,
          './node_modules/@byted-tiktok/arena-business-components/src',
        ),
        Slardar: path.resolve(__dirname, './src/common/utils/slardar'),
        iclipboard: path.resolve(__dirname, './node_modules/iclipboard'),
        dictionary: path.resolve(__dirname, './src/common/dictionary'),
        '@byted-tiktok/live-platform-common': path.resolve(
          __dirname,
          './node_modules/@byted-tiktok/live-platform-common',
        ),
        '@semi-bot/semi-theme-arena2023': path.resolve(__dirname, './node_modules/@semi-bot/semi-theme-arena2023'),
        '@ad/feelgood-sdk': path.resolve(__dirname, './node_modules/@ad/feelgood-sdk'),
        '@byted/oncall': path.resolve(__dirname, './node_modules/@byted/oncall'),
        '@douyinfe/semi-ui': path.resolve(__dirname, './node_modules/@douyinfe/semi-ui'),
        '@douyinfe/semi-illustrations': path.resolve(__dirname, './node_modules/@douyinfe/semi-illustrations'),
        eventemitter2: path.resolve(__dirname, './node_modules/eventemitter2'),
        redux: path.resolve(__dirname, './node_modules/redux'),
        lodash: path.resolve(__dirname, './node_modules/lodash'),
        'redux-thunk': path.resolve(__dirname, './node_modules/redux-thunk'),
      },
      fallback: {
        events: require.resolve('events/'),
      },
      symlinks: true,
    },
    svg: {
      loader: '@svgr/webpack',
    },
    performance: {
      chunkSplit: {
        strategy: 'split-by-experience',
        forceSplitting: [
          /@byted/,
          /@douyinfe/,
          /@ies/,
          /xgplayer/,
          /xlsx|date-fns/,
          /echarts/,
          /slardar/,
          /@ad\/feelgood-sdk/,
          /rc-/,
          /antd/,
        ],
      },
    },
    ...minimizeConfig,
  },
  raw: (options) => {
    if (isProd) {
      options.plugins.push(
        new SlardarWebpackPlugin({
          bid: 'webcast_operation_platform_va',
          include: [`./build_${REGION.toLowerCase()}`],
          release: BUILD_VERSION,
          region: REGION === 'TTP' ? 'ttp' : 'us',
        }),
      );
    }
    options.plugins.push(
      new SemiPlugin({
        prefixCls: 'new-semi',
        theme: '@semi-bot/semi-theme-arena2023',
      }),
    );
    options.plugins.push(new PerfseePlugin({ project: process.env.BUILD_REPO_NAME, artifactName: 'client' }));
    options.plugins.push(
      new InjectManifest({
        swSrc: path.resolve(__dirname, './src/sw/index.ts'),
        swDest: 'sw.js',
        maximumFileSizeToCacheInBytes: 1000000000,
        mode: isProd ? 'production' : 'development',
      }),
    );
    return options;
  },
  dev: {
    startUrl: `https://${WEB_DOMAIN}/`,
    port: 4000,
    hmr: true,
    devServer: {
      historyApiFallback: true,
    },
  },
});
