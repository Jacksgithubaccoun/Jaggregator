// generate-articles.js
import fs from 'fs';
import Parser from 'rss-parser';

const parser = new Parser();

const sourceBiasMap = {
  'cnn.com': 'left wing',
  'foxnews.com': 'right wing',
  'breitbart.com': 'right wing',
  'infowars.com': 'alternative',
  'nytimes.com': 'left wing',
  'npr.org': 'left wing',
  'bbc.co.uk': 'article',
  'thegatewaypundit.com': 'alternative',
  'theatlantic.com': 'left wing',
};

const sourceThumbnailMap = {
  'cnn.com': 'https://logo.clearbit.com/cnn.com',
  'foxnews.com': 'https://logo.clearbit.com/foxnews.com',
  'breitbart.com': 'https://logo.clearbit.com/breitbart.com',
  'infowars.com': 'https://logo.clearbit.com/infowars.com',
  'nytimes.com': 'https://logo.clearbit.com/nytimes.com',
  'npr.org': 'https://logo.clearbit.com/npr.org',
  'bbc.co.uk': 'https://logo.clearbit.com/bbc.co.uk',
  'thegatewaypundit.com': 'https://logo.clearbit.com/thegatewaypundit.com',
  'theatlantic.com': 'https://logo.clearbit.com/theatlantic.com',
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
  } catch {
    domain = article.source?.toLowerCase();
  }
  const bias = sourceBiasMap[domain];
  if (bias) tags.push(bias);
  return tags;
}

function getThumbnail(article) {
  let domain = '';
  try {
    const url = new URL(article.link);
    domain = url.hostname.replace('www.', '');
  } catch {
    domain = article.source?.toLowerCase();
  }
  return sourceThumbnailMap[domain] || 'https://via.placeholder.com/40?text=No+Logo';
}

async function generateArticles(feeds) {
  let allArticles = [];
  for (const feedUrl of feeds.slice(0, 5)) { // limit for safety
    try {
      const feed = await parser.parseURL(feedUrl);
      const articles = (feed.items || []).slice(0, 20).map(item => ({
        title: item.title || 'No title',
        link: item.link || '',
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        source: feed.title || 'RSS Feed',
        description: item.contentSnippet || item.content || '',
        tags: [],
        thumbnail: '',
      }));
      const taggedArticles = articles.map(article => ({
        ...article,
        tags: detectTags(article),
        thumbnail: getThumbnail(article),
      }));
      allArticles = allArticles.concat(taggedArticles);
    } catch (err) {
      console.error(`Error fetching feed ${feedUrl}:`, err.message);
    }
  }
  allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  return allArticles;
}

async function main() {
  // Your RSS feed URLs here
  const feeds = [
    'https://rss.cnn.com/rss/cnn_topstories.rss',
    'https://feeds.foxnews.com/foxnews/latest',
    // add more feeds...
  ];

  const articles = await generateArticles(feeds);

  fs.writeFileSync('./public/articles.json', JSON.stringify(articles, null, 2));
  console.log('articles.json generated with', articles.length, 'articles');
}

main();
