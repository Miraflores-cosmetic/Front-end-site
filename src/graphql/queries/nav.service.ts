import { graphqlRequest } from '@/graphql/client';
import { NavMenuResponse } from '@/types/nav';

export async function getNavMenuItems(): Promise<NavMenuResponse> {
  const query = `
        query getNavMenuItems {
            menus(first: 1){
                edges{
                    node{
                        id
                        name
                        slug
                        items{
                            id
                            name
                            category{
                                id
                                slug
                                backgroundImage{
                                    url
                                }
                            }
                        }
                    }
                }
            }
        }
  `;
  return graphqlRequest<NavMenuResponse>(query);
}
