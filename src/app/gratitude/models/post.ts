export interface Post {
  id?: string;
  name: string;
  message: string;
  photoUrl?: string | null;
  photoPath?: string | null;
  createdAt?: any;
}