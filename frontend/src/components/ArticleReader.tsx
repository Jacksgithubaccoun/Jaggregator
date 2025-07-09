import { useState } from 'react';

export default function ArticleReader({ articleUrl }: { articleUrl: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchFullArticle = async () => {
    setLoading(true);
   const res = await fetch(`/api/fetch-article?url=${encodeURIComponent(articleUrl)}`);
    const data = await res.json();
    setContent(data.content);
    setLoading(false);
  };

  return (
    <div>
      <button onClick={fetchFullArticle}>Read Here</button>
      {loading && <p>Loading full article...</p>}
      {content && (
        <article dangerouslySetInnerHTML={{ __html: content }} />
      )}
    </div>
  );
}
