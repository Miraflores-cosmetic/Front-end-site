import { graphqlRequest, CHANNEL } from '../client';
import { normalizeMediaUrl } from '@/utils/mediaUrl';

/**
 * GraphQL запрос с токеном из .env (для доступа к моделям)
 */
async function graphqlRequestWithEnvToken<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const endpoint = String(import.meta.env.VITE_GRAPHQL_URL || '');
  if (!endpoint) throw new Error('VITE_GRAPHQL_URL is not defined');

  // Получаем токен из .env (для доступа к моделям нужен токен с правами staff)
  const envToken = import.meta.env.VITE_SALEOR_TOKEN || import.meta.env.VITE_STAFF_TOKEN || import.meta.env.VITE_ADMIN_TOKEN || null;

  // Пробуем получить токен из localStorage (токен пользователя)
  let rawToken = localStorage.getItem('token');
  let token = rawToken && rawToken !== 'null' && rawToken !== 'undefined' ? rawToken : null;

  // Приоритет: токен из .env (если есть), иначе токен пользователя
  const authToken = envToken || token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
    if (envToken) {
      const tokenSource = import.meta.env.VITE_SALEOR_TOKEN ? 'VITE_SALEOR_TOKEN' :
        import.meta.env.VITE_STAFF_TOKEN ? 'VITE_STAFF_TOKEN' :
          'VITE_ADMIN_TOKEN';
      console.log(`[getAllSteps] Using token from .env (${tokenSource}) for GraphQL request`);
    } else {
      console.log('[getAllSteps] Using user token from localStorage for GraphQL request');
    }
  } else {
    console.warn('[getAllSteps] ⚠️ No token available for GraphQL request (neither .env nor localStorage)');
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables })
  });

  const json = await res.json() as { data?: T; errors?: Array<{ message: string }> };

  if (json.errors && json.errors.length > 0) {
    console.error('[getAllSteps] GraphQL errors:', json.errors);
    throw new Error(json.errors[0].message);
  }

  if (!json.data) {
    throw new Error('GraphQL response did not contain data');
  }

  return json.data;
}

export interface PageNode {
  id: string;
  slug: string;
  title: string;
  content?: string | null;
  created: string;
  isPublished: boolean;
  pageType?: {
    id: string;
    name: string;
    slug: string;
  };
  metadata?: {
    key: string;
    value: string;
  }[];
  assignedAttributes?: Array<{
    attribute: {
      id: string;
      slug: string;
      name: string;
    };
    values?: Array<{
      name?: string;
      plainText?: string;
    }>;
    fileValue?: {
      url: string;
    };
    textValue?: string;
  }>;
}

export interface SinglePageResponse {
  page: PageNode | null;
}

/**
 * Получить страницу по slug (любого типа, кроме статей)
 */
export async function getPageBySlug(slug: string): Promise<PageNode | null> {
  // Пробуем сначала без channel
  let query = `
    query GetPageBySlug($slug: String!) {
      page(slug: $slug) {
        id
        slug
        title
        content
        created
        isPublished
        pageType {
          id
          name
          slug
        }
        metadata {
          key
          value
        }
        assignedAttributes {
          attribute {
            id
            slug
            name
          }
          ... on AssignedFileAttribute {
            fileValue: value {
              url
            }
          }
          ... on AssignedPlainTextAttribute {
            textValue: value
          }
        }
      }
    }
  `;

  let variables: any = { slug };
  let data = await graphqlRequest<SinglePageResponse>(query, variables);
  console.log('[getPageBySlug] Query result for slug "' + slug + '" (no channel):', data.page ? 'FOUND' : 'NOT FOUND');

  // Если не нашли, пробуем с channel
  if (!data.page) {
    console.log('[getPageBySlug] Trying with channel "default-channel"...');
    query = `
      query GetPageBySlug($slug: String!, $channel: String!) {
        page(slug: $slug, channel: $channel) {
          id
          slug
          title
          content
          created
          isPublished
          pageType {
            id
            name
            slug
          }
          metadata {
            key
            value
          }
          assignedAttributes {
            attribute {
              id
              slug
              name
            }
            ... on AssignedFileAttribute {
              fileValue: value {
                url
              }
            }
            ... on AssignedPlainTextAttribute {
              textValue: value
            }
          }
        }
      }
    `;

    variables = { slug, channel: 'default-channel' };
    data = await graphqlRequest<SinglePageResponse>(query, variables);
    console.log('[getPageBySlug] Query result for slug "' + slug + '" (with channel):', data.page ? 'FOUND' : 'NOT FOUND');
  }

  if (data.page) {
    console.log('[getPageBySlug] Page details:', {
      title: data.page.title,
      slug: data.page.slug,
      isPublished: data.page.isPublished,
      pageType: data.page.pageType?.name,
      attributesCount: data.page.assignedAttributes?.length || 0
    });
  }

  return data.page ?? null;
}

export interface ProgressBarCartModel {
  contentText: string;
  threshold: number;
  /** Текст при достижении порога (атрибут uspeh-progress-bar-korziny) */
  successText: string;
}

const PROGRESS_BAR_SLUG = 'progress-bar-korziny';
const DEFAULT_THRESHOLD = 15780;
const DEFAULT_CONTENT = 'до бесплатной доставки';
const DEFAULT_SUCCESS_TEXT = 'Бесплатная доставка!';
const ATTR_SUCCESS_SLUG = 'uspeh-progress-bar-korziny';

const progressBarPageFields = `
  id
  content
  assignedAttributes {
    attribute { id slug name }
    ... on AssignedFileAttribute { fileValue: value { url } }
    ... on AssignedPlainTextAttribute { textValue: value }
    ... on AssignedNumericAttribute { value }
  }
`;

const progressBarQueryNoChannel = `
  query GetProgressBarCartPage($slug: String!) {
    page(slug: $slug) { ${progressBarPageFields} }
  }
`;

const progressBarQueryWithChannel = `
  query GetProgressBarCartPageChannel($slug: String!, $channel: String!) {
    page(slug: $slug, channel: $channel) { ${progressBarPageFields} }
  }
`;

type ProgressBarPage = { id: string; content?: string | null; assignedAttributes?: Array<Record<string, unknown>> } | null;

/**
 * Модель «Прогресс-бар корзины» (slug: progress-bar-korziny).
 * Заголовок, Содержимое (до бесплатной доставки), атрибут-число (порог в ₽).
 */
export async function getProgressBarCartModel(): Promise<ProgressBarCartModel> {
  type R = { page: ProgressBarPage };
  let data: R = await graphqlRequest<R>(progressBarQueryNoChannel, { slug: PROGRESS_BAR_SLUG });
  if (!data.page) {
    data = await graphqlRequest<R>(progressBarQueryWithChannel, { slug: PROGRESS_BAR_SLUG, channel: 'default-channel' });
  }
  if (!data.page) {
    data = await graphqlRequest<R>(progressBarQueryWithChannel, { slug: PROGRESS_BAR_SLUG, channel: CHANNEL });
  }

  const page = data.page;
  if (!page) {
    return { contentText: DEFAULT_CONTENT, threshold: DEFAULT_THRESHOLD, successText: DEFAULT_SUCCESS_TEXT };
  }

  let contentText = DEFAULT_CONTENT;
  if (page.content) {
    try {
      const parsed = typeof page.content === 'string' ? JSON.parse(page.content) : page.content;
      if (parsed?.blocks && Array.isArray(parsed.blocks)) {
        const t = parsed.blocks
          .map((b: { type?: string; data?: { text?: string } }) => (b.type === 'paragraph' && b.data?.text ? b.data.text : ''))
          .filter(Boolean)
          .join(' ');
        if (t) contentText = t;
      } else {
        contentText = typeof page.content === 'string' ? page.content : String(page.content);
      }
    } catch {
      contentText = typeof page.content === 'string' ? page.content : DEFAULT_CONTENT;
    }
  }

  let threshold = DEFAULT_THRESHOLD;
  let successText = DEFAULT_SUCCESS_TEXT;

  for (const a of page.assignedAttributes || []) {
    const attr = a as { attribute?: { slug?: string }; value?: unknown; textValue?: unknown };
    const slug = attr.attribute?.slug ?? '';

    if (slug === ATTR_SUCCESS_SLUG) {
      if (typeof attr.textValue === 'string' && attr.textValue) successText = attr.textValue;
      continue;
    }

    if (threshold !== DEFAULT_THRESHOLD) continue;

    const num = attr.value;
    if (typeof num === 'number' && !Number.isNaN(num) && num > 0) {
      threshold = Math.round(num);
    } else if (typeof attr.textValue === 'string') {
      const n = parseInt(attr.textValue, 10);
      if (!Number.isNaN(n) && n > 0) threshold = n;
    }
  }

  const cleanNbsp = (s: string) => s.replace(/&nbsp;?/gi, ' ').replace(/\s{2,}/g, ' ').trim();
  return { contentText: cleanNbsp(contentText), threshold, successText: cleanNbsp(successText) };
}

export interface StepsPagesConnection {
  pages: {
    edges: {
      node: PageNode;
    }[];
  };
}

export interface StepData {
  id: number;
  title: string;
  description: string;
  image: string;
  hoverImage?: string;
  slug?: string;
}

/**
 * Получить все страницы типа "Шаги" через GraphQL (как FAQ)
 */
export async function getAllSteps(): Promise<StepData[]> {
  try {
    // 1. Найти тип страницы "Шаги"
    const pageTypeQuery = `
      query GetStepsPageType {
        pageTypes(first: 100) {
          edges {
            node {
              id
              name
              slug
            }
          }
        }
      }
    `;

    interface PageTypesConnection {
      pageTypes: {
        edges: {
          node: {
            id: string;
            name: string;
            slug: string;
          };
        }[];
      };
    }

    const pageTypesData = await graphqlRequest<PageTypesConnection>(pageTypeQuery);
    const stepsPageType = pageTypesData.pageTypes.edges.find(
      (e) =>
        e.node.name.toLowerCase() === 'шаги' ||
        e.node.slug.toLowerCase() === 'shagi' ||
        e.node.name.toLowerCase().includes('шаг')
    );

    if (!stepsPageType) {
      console.warn('[getAllSteps] ⚠️ Page type "Шаги" not found');
      return [];
    }

    // 2. Получить все страницы этого типа (в т.ч. metadata для sortOrder)
    const pagesQuery = `
      query GetAllSteps($first: Int!, $pageTypeId: ID!) {
        pages(first: $first, where: { pageType: { eq: $pageTypeId } }) {
          edges {
            node {
              id
              slug
              title
              content
              isPublished
              metadata {
                key
                value
              }
              assignedAttributes {
                attribute {
                  id
                  slug
                  name
                }
                ... on AssignedFileAttribute {
                  fileValue: value {
                    url
                  }
                }
              }
            }
          }
        }
      }
    `;

    const pagesData = await graphqlRequest<StepsPagesConnection>(pagesQuery, {
      first: 100,
      pageTypeId: stepsPageType.node.id,
    });

    // 3. Преобразовать данные в формат StepData
    const steps = pagesData.pages.edges
      .filter((e) => e.node.isPublished === true)
      .map((e, index) => {
        const node = e.node;

        // Ищем изображения в атрибутах
        let image = '';
        let hoverImage: string | undefined = undefined;

        for (const attr of node.assignedAttributes || []) {
          if (attr.fileValue?.url) {
            const attrName = attr.attribute.name?.toLowerCase() || '';
            const attrSlug = attr.attribute.slug?.toLowerCase() || '';
            const isHover =
              attrName.includes('hover') ||
              attrSlug.includes('hover') ||
              attrName.includes('при наведении') ||
              attrSlug.includes('pri-navedenii');

            if (isHover) {
              hoverImage = normalizeMediaUrl(attr.fileValue.url);
            } else if (!image) {
              image = normalizeMediaUrl(attr.fileValue.url);
            }
          }
        }

        // Парсим описание из content (EditorJS)
        let description = '';
        if (node.content) {
          try {
            const parsed = typeof node.content === 'string' ? JSON.parse(node.content) : node.content;
            if (parsed && parsed.blocks && Array.isArray(parsed.blocks)) {
              description = parsed.blocks
                .map((block: any) => {
                  if (block.type === 'paragraph' && block.data?.text) {
                    return block.data.text;
                  }
                  return '';
                })
                .filter((text: string) => text)
                .join(' ');
            } else {
              description = typeof node.content === 'string' ? node.content : '';
            }
          } catch {
            description = typeof node.content === 'string' ? node.content : '';
          }
        }

        // Порядок из metadata: ключ "sortOrder" или "order" (число). Для сортировки.
        const metaSort = node.metadata?.find(
          (m) => m.key === 'sortOrder' || m.key === 'order'
        )?.value;
        const metadataSortOrder =
          metaSort != null && metaSort !== ''
            ? parseInt(metaSort, 10)
            : NaN;

        return {
          id: index + 1,
          title: node.title || '',
          description: description,
          image: image,
          hoverImage: hoverImage,
          slug: node.slug,
          metadataSortOrder: Number.isNaN(metadataSortOrder) ? undefined : metadataSortOrder,
        };
      })
      .filter((step) => step.image) // Только шаги с изображениями
      .sort((a, b) => {
        // 1) Сортировка по metadata (sortOrder / order), если задано
        const orderA = a.metadataSortOrder ?? null;
        const orderB = b.metadataSortOrder ?? null;
        if (orderA != null && orderB != null) return orderA - orderB;
        if (orderA != null) return -1;
        if (orderB != null) return 1;
        // 2) Fallback: по числу в slug
        const getSortKey = (slug: string) => {
          const match = slug.match(/\d+/);
          return match ? parseInt(match[0], 10) : 999;
        };
        return getSortKey(a.slug || '') - getSortKey(b.slug || '');
      })
      .map((step, index) => {
        const { slug, metadataSortOrder, ...stepWithoutExtra } = step;
        return {
          ...stepWithoutExtra,
          id: index + 1, // Перенумеровываем после сортировки
        };
      });

    console.log('[getAllSteps] ✅ Successfully got', steps.length, 'steps from GraphQL');
    return steps;
  } catch (error) {
    console.error('[getAllSteps] ❌ GraphQL error:', error);
    return [];
  }
}

/**
 * Получить картинку набора из конкретной модели по ID
 */
export async function getSetImageFromModel(pageId: string): Promise<string | null> {
  try {
    const query = `
      query GetSetModel($id: ID!) {
        page(id: $id) {
          id
          slug
          title
          assignedAttributes {
            attribute {
              id
              slug
              name
            }
            ... on AssignedFileAttribute {
              fileValue: value {
                url
              }
            }
          }
        }
      }
    `;

    interface SetModelResponse {
      page: PageNode | null;
    }

    let data: SetModelResponse;
    try {
      data = await graphqlRequest<SetModelResponse>(query, { id: pageId });
    } catch (err) {
      console.error('[getSetImageFromModel] Error:', err);
      return null;
    }

    if (!data.page || !data.page.assignedAttributes) {
      return null;
    }

    // Ищем картинку набора в атрибутах
    for (const attr of data.page.assignedAttributes) {
      if (attr.fileValue?.url) {
        const attrName = attr.attribute.name?.toLowerCase() || '';
        const attrSlug = attr.attribute.slug?.toLowerCase() || '';

        if (
          attrName.includes('картинка набора') ||
          attrSlug.includes('kartinka-nabora') ||
          (attrName.includes('картинка') && attrName.includes('набор'))
        ) {
          return normalizeMediaUrl(attr.fileValue.url);
        }
      }
    }

    return null;
  } catch (error) {
    console.error('[getSetImageFromModel] ❌ GraphQL error:', error);
    return null;
  }
}

/**
 * Получить все страницы типа "Наборы" и их картинки
 */
export async function getAllSets(): Promise<{ bySlug: Map<string, string>; byName: Map<string, string> }> {
  try {
    // 1. Найти тип страницы "Наборы"
    const pageTypeQuery = `
      query GetSetsPageType {
        pageTypes(first: 100) {
          edges {
            node {
              id
              name
              slug
            }
          }
        }
      }
    `;

    interface PageTypesConnection {
      pageTypes: {
        edges: {
          node: {
            id: string;
            name: string;
            slug: string;
          };
        }[];
      };
    }

    const pageTypesData = await graphqlRequest<PageTypesConnection>(pageTypeQuery);
    const setsPageType = pageTypesData.pageTypes.edges.find(
      (e) =>
        e.node.name.toLowerCase() === 'наборы' ||
        e.node.slug.toLowerCase() === 'nabory' ||
        e.node.name.toLowerCase().includes('набор')
    );

    if (!setsPageType) {
      console.warn('[getAllSets] ⚠️ Page type "Наборы" not found');
      return { bySlug: new Map(), byName: new Map() };
    }

    // 2. Получить все страницы этого типа
    const pagesQuery = `
      query GetAllSets($first: Int!, $pageTypeId: ID!) {
        pages(first: $first, where: { pageType: { eq: $pageTypeId } }) {
          edges {
            node {
              id
              slug
              title
              assignedAttributes {
                attribute {
                  id
                  slug
                  name
                }
                ... on AssignedFileAttribute {
                  fileValue: value {
                    url
                  }
                }
              }
            }
          }
        }
      }
    `;

    interface SetsPagesConnection {
      pages: {
        edges: {
          node: PageNode;
        }[];
      };
    }

    const pagesData = await graphqlRequest<SetsPagesConnection>(pagesQuery, {
      first: 100,
      pageTypeId: setsPageType.node.id,
    });

    // 3. Создаем Map: slug товара -> картинка набора
    // Также создаем Map по названию для резервного сопоставления
    const setsMap = new Map<string, string>();
    const setsMapByName = new Map<string, string>();

    pagesData.pages.edges
      .filter((e) => e.node.isPublished === true)
      .forEach((e) => {
        const node = e.node;

        // Ищем картинку набора в атрибутах
        let setImage = '';
        for (const attr of node.assignedAttributes || []) {
          if (attr.fileValue?.url) {
            const attrName = attr.attribute.name?.toLowerCase() || '';
            const attrSlug = attr.attribute.slug?.toLowerCase() || '';

            if (
              attrName.includes('картинка набора') ||
              attrSlug.includes('kartinka-nabora') ||
              attrSlug.includes('kartinka-nabora') ||
              (attrName.includes('картинка') && attrName.includes('набор'))
            ) {
              setImage = normalizeMediaUrl(attr.fileValue.url);
              break;
            }
          }
        }

        // Используем slug страницы как ключ (slug должен совпадать со slug товара)
        if (setImage && node.slug) {
          setsMap.set(node.slug, setImage);
        }

        // Также сохраняем по названию для резервного сопоставления
        if (setImage && node.title) {
          setsMapByName.set(node.title.toLowerCase().trim(), setImage);
        }
      });

    // Возвращаем оба Map в объекте
    return { bySlug: setsMap, byName: setsMapByName };

    console.log('[getAllSets] ✅ Successfully got', setsMap.size, 'sets from GraphQL');
    return { bySlug: setsMap, byName: setsMapByName };
  } catch (error) {
    console.error('[getAllSets] ❌ GraphQL error:', error);
    return { bySlug: new Map(), byName: new Map() };
  }
}

/**
 * Получить страницу с текстом для корзины (slug: tekst-v-korzine)
 */
export async function getCartTextPage(): Promise<PageNode | null> {
  // Пробуем основной slug
  const slug = 'tekst-v-korzine';
  return await getPageBySlug(slug);
}

/**
 * Получить PreHeader (страницу типа PreHeader)
 */
export async function getPreHeader(): Promise<PageNode | null> {
  try {
    // 1. Найти тип страницы "PreHeader"
    const pageTypeQuery = `
      query GetPreHeaderPageType {
        pageTypes(first: 100) {
          edges {
            node {
              id
              name
              slug
            }
          }
        }
      }
    `;

    interface PageTypesConnection {
      pageTypes: {
        edges: {
          node: {
            id: string;
            name: string;
            slug: string;
          };
        }[];
      };
    }

    // Пробуем сначала с токеном из .env, потом обычный запрос
    let pageTypesData: PageTypesConnection;
    try {
      pageTypesData = await graphqlRequest<PageTypesConnection>(pageTypeQuery);
    } catch (err) {
      console.error('[getPreHeader] Error fetching page types:', err);
      return null;
    }

    const preHeaderPageType = pageTypesData.pageTypes.edges.find(
      (e) =>
        e.node.name.toLowerCase() === 'preheader' ||
        e.node.slug.toLowerCase() === 'preheader' ||
        e.node.name.toLowerCase().includes('preheader') ||
        e.node.name.toLowerCase() === 'pre header' ||
        e.node.slug.toLowerCase() === 'pre-header'
    );

    if (!preHeaderPageType) {
      return null;
    }

    // 2. Получить первую опубликованную страницу этого типа
    const pagesQuery = `
      query GetPreHeader($first: Int!, $pageTypeId: ID!) {
        pages(first: $first, where: { pageType: { eq: $pageTypeId } }) {
          edges {
            node {
              id
              slug
              title
              content
              isPublished
              assignedAttributes {
                attribute {
                  id
                  slug
                  name
                }
                ... on AssignedPlainTextAttribute {
                  textValue: value
                }
              }
            }
          }
        }
      }
    `;

    interface PreHeaderPagesConnection {
      pages: {
        edges: {
          node: PageNode;
        }[];
      };
    }

    let pagesData: PreHeaderPagesConnection;
    try {
      pagesData = await graphqlRequest<PreHeaderPagesConnection>(pagesQuery, {
        first: 10,
        pageTypeId: preHeaderPageType.node.id,
      });
    } catch (err) {
      console.error('[getPreHeader] Error fetching pages:', err);
      return null;
    }

    const preHeaderPage = pagesData.pages.edges
      .filter((e) => e.node.isPublished === true)
      .map((e) => e.node)[0];

    return preHeaderPage || null;
  } catch (error) {
    console.error('[getPreHeader] ❌ GraphQL error:', error);
    return null;
  }
}
