import React from 'react';

interface ArticleContentProps {
  title: string;
  text: string;
}

export const ArticleContent = ({ title, htmlContent }) => (
  <article>
    <h1>{title}</h1>
    <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
  </article>
);

  // Return JSX
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
