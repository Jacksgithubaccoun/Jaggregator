export const BASE_URL = process.env.REACT_APP_BACKEND_URL;
export const fetchArticles = async (feedUrl: string) => {
  const res = await fetch(`${BASE_URL}/api/fetch-articles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedUrl }),
  });
  return res.json();
};
