/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTRACT_ADDRESS_STUDIONET: string;
  readonly VITE_CONTRACT_ADDRESS_BRADBURY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
