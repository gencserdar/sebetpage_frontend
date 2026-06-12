export interface UserDTO {
  id: number;
  name: string;
  surname: string;
  nickname: string;
  email: string;
  profileImageUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  activated: boolean;
  frozen?: boolean;
  role: string;
}
