export interface Post {
  id?: string;
  name: string;
  country: string;
  message: string;
  photoUrl?: string | null;
  photoPath?: string | null;
  createdAt?: any;
}