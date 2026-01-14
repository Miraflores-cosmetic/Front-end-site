import { graphqlRequest } from '../client';

let cachedArticlePageTypeId: string | null = null;

// ===== Типы =====
export interface PageTypeNode {
  id: string;
  name: string;
  slug: string;
}

export interface PageTypesResponse {
  pageTypes: {
    edges: {
      node: PageTypeNode;
    }[];
  };
}
export interface ArticleAssignedAttribute {
  attribute: {
    id: string;
    slug: string;
    name: string;
  };
  fileValue?: {
    url: string;
  };
  textValue?: string;
}

export interface ArticleNode {
  id: string;
  slug: string;
  title: string;
  created: string;
  content?: string | null;
  assignedAttributes: ArticleAssignedAttribute[];
  metadata?: {
    key: string;
    value: string;
  }[];
}

export interface ArticlesConnection {
  pages: {
    edges: {
      node: ArticleNode;
    }[];
    totalCount: number;
  };
}

export interface SingleArticleConnection {
  page: ArticleNode | null;
}

// ============================================
// ================ Запросы ===================
// ============================================

async function getCachedArticlePageTypeId(): Promise<string | null> {
  if (cachedArticlePageTypeId) {
    return cachedArticlePageTypeId;
  }

  const id = await getArticlePageTypeId();
  cachedArticlePageTypeId = id;
  return id;
}

export async function getArticlePageTypeId(): Promise<string | null> {

  const query = `
     query GetPageTypes($first: Int!) {
      pageTypes(first: $first) {
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
  const variables = { first: 50 };
  const data = await graphqlRequest<PageTypesResponse>(query,variables);
  const articlesType = data.pageTypes.edges.find(e => e.node.name ==="Cтатьи");
  return articlesType?.node.id ?? null;
}
// 🔹 1. Получить все статьи (pages)
export async function getAllArticles(first: number): Promise<ArticleNode[]> {
  const pageTypeId = await getCachedArticlePageTypeId();

  if (!pageTypeId) {
    return [];
  }

  const query = `
   query GetAllArticles($first: Int!, $pageTypeIds: [ID!]) {
      pages(
      first: $first
      filter: { pageTypes: $pageTypeIds }
      ) {
        edges {
          node {
            id
            slug
            title
            created
            content
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
            metadata {
              key
              value
            }
          }
        }
      }
    }
  `;

  const variables = { first, pageTypeIds: [pageTypeId]};

  const data = await graphqlRequest<ArticlesConnection>(query, variables);
  return data.pages.edges.map(e => e.node);
}

// 🔹 2. Получить одну статью по slug
export async function getSingleArticle(slug: string): Promise<ArticleNode | null> {
  const query = `
    query GetSingleArticle($slug: String!) {
      page(slug: $slug) {
        id
        slug
        title
        created
        content
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
        metadata {
          key
          value
        }
      }
    }
  `;

  const variables = { slug };

  const data = await graphqlRequest<SingleArticleConnection>(query, variables);
  return data.page ?? null;
}
