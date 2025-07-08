const Parser = require('rss-parser');
const fs = require('fs');

const parser = new Parser();

const feeds = [
  'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
  'https://www.npr.org/rss/rss.php?id=1001',
  'https://www.foxnews.com/about/rss/',
  'https://feeds.bbci.co.uk/news/rss.xml',
];

const sourceBiasMap = {
  'cnn.com': 'left wing',
  'foxnews.com': 'right wing',
  'nytimes.com': 'left wing',
  'npr.org': 'left wing',
  'bbc.co.uk': 'article',
};

function detectTags(article) {
  const tags = [];

  if (
    article.title?.toLowerCase().includes('podcast') ||
    article.description?.toLowerCase().includes('audio') ||
    article.link?.endsWith('.mp3')
  ) {
    tags.push('audio');
  } else {
    tags.push('article');
  }

  let domain = '';
  try {
    const url = new URL(article.link);
    domain = url.hostname.replace('www.', '');
  } catch {}

  const bias = sourceBiasMap[domain];
  if (bias) tags.push(bias);

  return tags;
}

async function fetchArticles() {
  let allArticles = [];

  for (const feedUrl of feeds) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const articles = feed.items.slice(0, 10).map((item) => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate || item.isoDate,
        source: feed.title || 'RSS Feed',
        description: item.contentSnippet || item.content || '',
        tags: detectTags(item),
      }));
      allArticles.push(...articles);
    } catch (e) {
      console.error(`Error parsing ${feedUrl}: ${e.message}`);
    }
  }

  allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  fs.writeFileSync('public/articles.json', JSON.stringify(allArticles, null, 2));
  console.log(`✅ Saved ${allArticles.length} articles to public/articles.json`);
}

fetchArticles();
