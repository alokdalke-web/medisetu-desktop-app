/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WIDGET_SCRIPT_URL: string;
  readonly VITE_WIDGET_DATA_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
