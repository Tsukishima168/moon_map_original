interface Window {
  gtag?: (...args: any[]) => void;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SANITY_PROJECT_ID?: string;
  readonly VITE_SANITY_DATASET?: string;
  readonly VITE_SANITY_API_VERSION?: string;
  readonly VITE_DISCORD_NOTIFY_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '@vercel/node' {
  export type VercelRequest = any;
  export type VercelResponse = any;
}

declare module 'sanity' {
  export function defineConfig(config: any): any;
  export function defineField(field: any): any;
  export function defineType(type: any): any;
}

declare module 'sanity/cli' {
  export function defineCliConfig(config: any): any;
}

declare module 'sanity/structure' {
  export function structureTool(config?: any): any;
}

declare module '@sanity/vision' {
  export function visionTool(config?: any): any;
}
