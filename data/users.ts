export type Role = 'User' | 'Writer' | 'Admin';

export interface TestUser {
  key: 'userA' | 'userB' | 'writerA' | 'writerB' | 'admin';
  username: string;
  email: string;
  password: string;
  role: Role;
  storageStatePath: string;
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  role: Role;
}
