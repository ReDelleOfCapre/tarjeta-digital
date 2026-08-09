const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Universal Open Graph & Metadata Scraper Service
 * Safely extracts og:title, og:description, og:image, and Favicon with 4s timeout & fallbacks.
 */
async function fetchUrlMetadata(targetUrl) {
  if (!targetUrl || typeof targetUrl !== 'string') {
    return getFallback(targetUrl);
  }

  let normalizedUrl = targetUrl.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    const domain = parsedUrl.hostname.replace(/^www\./, '');
    const defaultFavicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;

    const html = await fetchHtmlWithTimeout(normalizedUrl, 4000);
    if (!html) {
      return {
        title: domain,
        description: '',
        image: '',
        favicon: defaultFavicon,
        domain: domain,
        success: false
      };
    }

    // Extract Metadata using RegEx
    const ogTitle = matchMetaContent(html, ['og:title', 'twitter:title', 'title']) || matchTitleTag(html) || domain;
    const ogDescription = matchMetaContent(html, ['og:description', 'twitter:description', 'description']) || '';
    let ogImage = matchMetaContent(html, ['og:image', 'twitter:image', 'thumbnail']) || '';
    let favicon = matchFaviconTag(html) || defaultFavicon;

    // Resolve relative URLs
    if (ogImage && !ogImage.startsWith('http://') && !ogImage.startsWith('https://')) {
      try {
        ogImage = new URL(ogImage, normalizedUrl).href;
      } catch(e) {}
    }

    if (favicon && !favicon.startsWith('http://') && !favicon.startsWith('https://')) {
      try {
        favicon = new URL(favicon, normalizedUrl).href;
      } catch(e) {
        favicon = defaultFavicon;
      }
    }

    return {
      title: cleanText(ogTitle),
      description: cleanText(ogDescription),
      image: ogImage,
      favicon: favicon || defaultFavicon,
      domain: domain,
      success: true
    };

  } catch (err) {
    console.error('⚠️ [metadataService] Non-blocking scraper error:', err.message);
    return getFallback(targetUrl);
  }
}

function getFallback(targetUrl) {
  let domain = 'enlace';
  try {
    const p = new URL(targetUrl.startsWith('http') ? targetUrl : 'https://' + targetUrl);
    domain = p.hostname.replace(/^www\./, '');
  } catch(e) {}

  return {
    title: domain,
    description: '',
    image: '',
    favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
    domain: domain,
    success: false
  };
}

function fetchHtmlWithTimeout(urlStr, timeoutMs = 4000) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(urlStr);
      const client = parsed.protocol === 'https:' ? https : http;

      const req = client.get(urlStr, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
        }
      }, (res) => {
        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          try {
            const redirectUrl = new URL(res.headers.location, urlStr).href;
            fetchHtmlWithTimeout(redirectUrl, timeoutMs - 500).then(resolve);
            return;
          } catch(e) {
            resolve(null);
            return;
          }
        }

        if (res.statusCode !== 200) {
          resolve(null);
          return;
        }

        let body = '';
        res.setEncoding('utf-8');
        res.on('data', chunk => {
          body += chunk;
          if (body.length > 500000) { // Limit 500KB HTML read
            req.destroy();
            resolve(body);
          }
        });
        res.on('end', () => resolve(body));
      });

      req.on('error', () => resolve(null));
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        resolve(null);
      });
    } catch(e) {
      resolve(null);
    }
  });
}

function matchMetaContent(html, properties) {
  for (const prop of properties) {
    // Matches property="..." content="..." OR name="..." content="..."
    const regex1 = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
    const regex2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i');
    const match1 = html.match(regex1);
    if (match1 && match1[1]) return match1[1];
    const match2 = html.match(regex2);
    if (match2 && match2[1]) return match2[1];
  }
  return null;
}

function matchTitleTag(html) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match && match[1] ? match[1] : null;
}

function matchFaviconTag(html) {
  const match = html.match(/<link[^>]+rel=["'](?:shortcut icon|icon)["'][^>]+href=["']([^"']+)["']/i);
  return match && match[1] ? match[1] : null;
}

function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
}

module.exports = {
  fetchUrlMetadata
};
