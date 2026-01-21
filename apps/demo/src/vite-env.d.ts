/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FLOE_CONTROLPLANE_BASE_URL?: string;
  readonly VITE_FLOE_ENDPOINT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

