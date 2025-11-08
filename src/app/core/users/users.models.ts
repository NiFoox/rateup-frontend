export interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  active: boolean;
  createdAt: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
