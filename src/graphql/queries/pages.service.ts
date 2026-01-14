import { graphqlRequest } from '../client';
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

    // 2. Получить все страницы этого типа
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

        return {
          id: index + 1,
          title: node.title || '',
          description: description,
          image: image,
          hoverImage: hoverImage,
          slug: node.slug, // Сохраняем slug для сортировки
        };
      })
      .filter((step) => step.image) // Только шаги с изображениями
      .sort((a, b) => {
        // Сортируем по slug (извлекаем числа из slug для правильной сортировки)
        const getSortKey = (slug: string) => {
          const match = slug.match(/\d+/);
          return match ? parseInt(match[0], 10) : 999;
        };
        return getSortKey(a.slug || '') - getSortKey(b.slug || '');
      })
      .map((step, index) => {
        const { slug, ...stepWithoutSlug } = step;
        return {
          ...stepWithoutSlug,
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
      data = await graphqlRequestWithEnvToken<SetModelResponse>(query, { id: pageId });
    } catch (err) {
      data = await graphqlRequest<SetModelResponse>(query, { id: pageId });
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

    const pageTypesData = await graphqlRequestWithEnvToken<PageTypesConnection>(pageTypeQuery);
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

    const pagesData = await graphqlRequestWithEnvToken<SetsPagesConnection>(pagesQuery, {
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
      pageTypesData = await graphqlRequestWithEnvToken<PageTypesConnection>(pageTypeQuery);
    } catch (err) {
      pageTypesData = await graphqlRequest<PageTypesConnection>(pageTypeQuery);
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
      pagesData = await graphqlRequestWithEnvToken<PreHeaderPagesConnection>(pagesQuery, {
        first: 10,
        pageTypeId: preHeaderPageType.node.id,
      });
    } catch (err) {
      pagesData = await graphqlRequest<PreHeaderPagesConnection>(pagesQuery, {
        first: 10,
        pageTypeId: preHeaderPageType.node.id,
      });
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
