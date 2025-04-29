export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const handleResponse = async (res: Response) => {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
};
