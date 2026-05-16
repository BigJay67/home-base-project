import { auth } from '../firebase';

export const getAuthToken = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  const token = await user.getIdToken();
  return `Bearer ${token}`;
};