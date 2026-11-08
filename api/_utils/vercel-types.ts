/**
 * 本地的 Vercel Function 請求／回應型別。
 *
 * 取代過去只為了拿型別而安裝的 devDependency `@vercel/node`（全 repo 的 import 都是
 * `import type`，執行期零用途；它帶進 104 個只因它存在的套件、16 個 dev 弱點）。
 *
 * 形狀照 `@vercel/node` 的 index.d.ts：
 * - VercelRequest  = Node IncomingMessage ＋ query／cookies／body
 * - VercelResponse = Node ServerResponse  ＋ send／json／status／redirect
 *
 * 這些 helper 由 Build Output API 的 .vc-config.json `shouldAddHelpers: true`
 * 在執行期注入（見 scripts/vercel-build.mjs），型別只是描述它。
 * 底線開頭的檔案不會被 vercel-build 當成 API entry。
 */
import type { IncomingMessage, ServerResponse } from 'http';

export type VercelRequestCookies = { [key: string]: string };
export type VercelRequestQuery = { [key: string]: string | string[] };
export type VercelRequestBody = any;

export type VercelRequest = IncomingMessage & {
  query: VercelRequestQuery;
  cookies: VercelRequestCookies;
  body: VercelRequestBody;
};

export type VercelResponse = ServerResponse & {
  send: (body: any) => VercelResponse;
  json: (jsonBody: any) => VercelResponse;
  status: (statusCode: number) => VercelResponse;
  redirect: (statusOrUrl: string | number, url?: string) => VercelResponse;
};
