import React from 'react';

interface ArticleContentProps {
  title: string;
  text: string;
}

export const ArticleContent: React.FC<ArticleContentProps> = ({ title, text }) => (
  <div style={{ padding: '1rem', backgroundColor: '#111', borderRadius: '8px', color: '#ccc' }}>
    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{title}</h2>
    <div style={{ whiteSpace: 'pre-wrap', fontSize: '1rem' }}>{text}</div>
  </div>
);
  const paragraphs = text.split(/\n\s*\n/);

  return (
    <article className="prose lg:prose-xl max-w-none">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      {paragraphs.map((para, index) => (
        <p key={index} className="mb-4">
          {para}
        </p>
      ))}
    </article>
  );
};
