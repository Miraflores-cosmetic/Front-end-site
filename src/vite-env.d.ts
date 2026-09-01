/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_UPLOADS_ORIGIN?: string;
  readonly VITE_GRAPHQL_URL?: string;
  readonly VITE_PUBLIC_YANDEX_MAP_API_KEY?: string;
  readonly VITE_YANDEX_MAP_API_KEY?: string;
  readonly VITE_GIFT_CERTIFICATE_PRODUCT_SLUG?: string;
  readonly VITE_HIDE_HEADER_CATEGORY_SLUG?: string;
  readonly VITE_QUIZ_PAGE_SLUG?: string;
  readonly VITE_MAX_LINE_QUANTITY?: string;
  readonly VITE_CDEK_SHIP_FROM_CITY_CODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
