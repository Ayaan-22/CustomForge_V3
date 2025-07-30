export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const handleResponse = async (res: Response) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
};
