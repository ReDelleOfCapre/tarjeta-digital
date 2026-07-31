const parseYouTube = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  const videoId = (match && match[2].length === 11) ? match[2] : null;
  
  if (!videoId) return null;
  
  return `<iframe width="100%" style="aspect-ratio: 16/9;" src="https://www.youtube-nocookie.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
};

const parseSpotify = (url) => {
  const match = url.match(/spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/);
  if (!match) return null;
  
  const type = match[1];
  const id = match[2];
  
  return `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0" width="100%" height="${type === 'show' || type === 'episode' ? '152' : '152'}" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
};

const parseTikTok = (url) => {
  const match = url.match(/tiktok\.com\/.*\/video\/(\d+)/);
  if (!match) return null;
  const videoId = match[1];
  
  return `<blockquote class="tiktok-embed" cite="${url}" data-video-id="${videoId}" style="max-width: 605px;min-width: 325px;" > <section> <a target="_blank" title="TikTok" href="https://www.tiktok.com">@tiktok</a> </section> </blockquote> <script async src="https://www.tiktok.com/embed.js"></script>`;
};

const parseTweet = (url) => {
  const match = url.match(/(twitter|x)\.com\/.*\/status\/(\d+)/);
  if (!match) return null;
  
  return `<blockquote class="twitter-tweet"><a href="${url}"></a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>`;
};

const getEmbed = (url) => {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const html = parseYouTube(url);
    if (html) return { type: 'youtube', html, raw_url: url };
  }
  
  if (url.includes('spotify.com')) {
    const html = parseSpotify(url);
    if (html) return { type: 'spotify', html, raw_url: url };
  }
  
  if (url.includes('tiktok.com')) {
    const html = parseTikTok(url);
    if (html) return { type: 'tiktok', html, raw_url: url };
  }
  
  if (url.includes('twitter.com') || url.includes('x.com')) {
    const html = parseTweet(url);
    if (html) return { type: 'tweet', html, raw_url: url };
  }
  
  return { type: 'link', html: null, raw_url: url };
};

module.exports = {
  parseYouTube,
  parseSpotify,
  parseTikTok,
  parseTweet,
  getEmbed
};
