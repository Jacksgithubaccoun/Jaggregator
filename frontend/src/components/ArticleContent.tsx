import React from 'react';

interface ArticleContentProps {
  title: string;
  htmlContent: string; // article content as HTML string
  images?: string[];   // optional array of image URLs
}

export const ArticleContent: React.FC<ArticleContentProps> = ({
  title,
  htmlContent,
  images = [],
}) => {
  return (
    <article className="prose lg:prose-xl w-full max-w-full overflow-x-auto break-words">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>

      {/* Render HTML content safely */}
      <div
        className="article-body"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      {/* Render images if any */}
      {images.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-4">
          {images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`Article image ${i + 1}`}
              className="max-w-full rounded-lg object-contain"
              loading="lazy"
            />
          ))}
        </div>
      )}
    </article>
  );
};
