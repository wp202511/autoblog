// generate-blogs.js (CommonJS)

"use strict";

const fetch = require("node-fetch");            // v2.x (CommonJS)
const Parser = require("rss-parser");           // CommonJS friendly

const parser = new Parser({
  timeout: 15000,
  customFields: {
    item: [
      ["content:encoded", "contentEncoded"],
      ["media:content", "mediaContent"]
    ]
  }
});

/* =========================
   Environment Variables
   ========================= */
const SHOPIFY_STORE = process.env.SHOPIFY_STORE;           // e.g. my-store.myshopify.com
const SHOPIFY_ADMIN_API = process.env.SHOPIFY_ADMIN_API;   // Admin API access token

if (!SHOPIFY_STORE || !SHOPIFY_ADMIN_API) {
  console.error("❌ Missing SHOPIFY_STORE or SHOPIFY_ADMIN_API env vars.");
  process.exit(1);
}

/* =========================
   RSS Feeds & Categories
   ========================= */
const rssFeeds = [
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml", category: "Technology" },
  { url: "http://rss.cnn.com/rss/edition.rss", category: "Technology" },
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "World News" },
  { url: "https://feeds.bbci.co.uk/news/rss.xml", category: "World News" },
  { url: "https://www.theguardian.com/world/rss", category: "World News" },
  { url: "https://www.theguardian.com/us-news/rss", category: "US News" },
  { url: "https://www.theguardian.com/lifeandstyle/home-and-garden/rss", category: "Guides" },
  { url: "https://www.theguardian.com/us/travel/rss", category: "Guides" },
  { url: "https://www.theguardian.com/tone/recipes/rss", category: "Recipes" },
  { url: "https://www.law360.com/legalindustry/rss", category: "Legal" },
  { url: "https://techcrunch.com/feed/", category: "Technology" },
  { url: "https://techcrunch.com/category/security/feed/", category: "Security" },
  { url: "https://arstechnica.com/security/feed/", category: "Security" },
  { url: "https://arstechnica.com/gadgets/feed/", category: "Case Study" },
  { url: "https://arstechnica.com/science/feed/", category: "Technology" },
  { url: "https://www.techradar.com/rss", category: "Technology" },
  { url: "https://www.techradar.com/feeds.xml", category: "US News" },
  { url: "https://www.techradar.com/feeds/tag/tech", category: "Technology" },
  { url: "https://www.techradar.com/feeds/tag/how-to-watch", category: "Guides" },
  { url: "https://www.cnet.com/rss/home/", category: "Case Study" },
  { url: "https://www.cnet.com/rss/news/", category: "World News" },
  { url: "https://www.cnet.com/rss/tech/", category: "Technology" },
  { url: "http://feeds.harvardbusiness.org/harvardbusiness/", category: "Case Study" },
  { url: "https://cyber.fsi.stanford.edu/rss.xml", category: "Case Study" },
  { url: "https://www.technologyreview.com/feed/", category: "Technology" },
  { url: "https://www.wired.com/feed/rss", category: "Guides" },
  { url: "https://www.wired.com/feed/category/ideas/latest/rss", category: "Case Study" },
  { url: "https://www.wired.com/feed/category/science/latest/rss", category: "Technology" },
  { url: "https://www.wired.com/feed/category/security/latest/rss", category: "Security" },
  { url: "https://feeds.bbc.co.uk/food/rss/xml", category: "Recipes" },
  { url: "https://feeds.bbci.co.uk/news/technology/rss.xml", category: "Technology" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/MediaandAdvertising.xml", category: "Guides" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Dealbook.xml", category: "Legal" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/us.xml", category: "US News" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/world.xml", category: "World News" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/RealEstate.xml", category: "Legal" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml", category: "Legal" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/YourMoney.xml", category: "Legal" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/PersonalTech.xml", category: "Technology" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/ArtandDesign.xml", category: "Guides" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Health.xml", category: "Case Study" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Science.xml", category: "Technology" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Space.xml", category: "Technology" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/SmallBusiness.xml", category: "Legal" },
  { url: "https://feeds.eff.org/howtofixtheinternet", category: "Security" },
  { url: "https://www.eff.org/rss/updates.xml", category: "Legal" },
  { url: "https://iapp.org/news/privacy-advisor/feed/", category: "Security" }
];

/* =========================
   Shopify Blog IDs
   (replace with your real IDs)
   ========================= */
const blogCategories = {
  "Security": 117750464828,    // Security blog ID
  "Guides": 117652881724,      // Guides blog ID
  "Case Study": 117652914492,  // Case Studies blog ID
  "Technology": 117652947260,  // Technology blog ID
  "US News": 117748662588,     // US News blog ID
  "World News": 117748629820,  // World News blog ID
  "Recipes": 117748728124,     // Recipes blog ID
  "Legal": 117652980028        // Legal blog ID
};

/* =========================
   Helpers
   ========================= */
function stripHtml(html = "") {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstImageFromItem(item) {
  // Prefer enclosure
  if (item.enclosure && item.enclosure.url) return item.enclosure.url;

  // media:content (some feeds)
  if (item.mediaContent && item.mediaContent.$ && item.mediaContent.$.url) {
    return item.mediaContent.$.url;
  }

  // Try content:encoded HTML
  const html = item.contentEncoded || item["content:encoded"] || item.content || "";
  const m = html && html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (m && m[1]) return m[1];

  return null;
}

function rewriteContent({ title, cleanText, category, source, link }) {
  const productPivots = {
    "Security": "Stay ahead with trusted tech. See our store for scanners, detectors, and privacy-first accessories.",
    "Guides": "Looking for reliable tools to protect your privacy? Browse our security gear and start building your personal toolkit.",
    "Case Study": "Want similar protection in your daily life? Explore our anti-surveillance devices designed to detect and deter threats.",
    "Technology": "Stay ahead with trusted tech. See our store for scanners, detectors, and privacy-first accessories.",
    "World News": "Stay ahead with trusted tech. See our store for scanners, detectors, and privacy-first accessories.",
    "US News": "Stay ahead with trusted tech. See our store for scanners, detectors, and privacy-first accessories.",
    "Recipes": "Stay ahead with trusted tech. See our store for scanners, detectors, and privacy-first accessories.",
    "Legal": "Keep your day-to-day compliant and secure—find privacy-forward devices that help you stay protected."
  };

  const intro = `<p><em>Curated from ${source}</em> — Here’s what matters right now:</p>`;
  const body = `<p>${cleanText}</p>`;
  const cta = `<p><strong>Next step:</strong> ${productPivots[category] || ""}</p>`;
  const citation = link ? `<p><small>Original reporting: <a href="${link}" rel="nofollow noopener" target="_blank">${source}</a></small></p>` : "";

  return `${intro}${body}${cta}${citation}`;
}

/* =========================
   Shopify API Calls
   ========================= */
async function fetchShopifyArticles(blogId) {
  const url = `https://${SHOPIFY_STORE}/admin/api/2023-07/blogs/${blogId}/articles.json?limit=250&fields=title`;
  const res = await fetch(url, {
    headers: { "X-Shopify-Access-Token": SHOPIFY_ADMIN_API }
  });
  if (!res.ok) {
    console.error(`Shopify list error (${blogId}):`, await res.text());
    return [];
  }
  const data = await res.json();
  return (data.articles || []).map(a => a.title);
}

async function postToShopify(blogId, { title, body_html, image }) {
  const url = `https://${SHOPIFY_STORE}/admin/api/2023-07/blogs/${blogId}/articles.json`;

  const articlePayload = { title, body_html };
  if (image) {
    // Shopify accepts { src: "https://..." }
    articlePayload.image = { src: image };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": SHOPIFY_ADMIN_API,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ article: articlePayload })
  });

  if (!res.ok) {
    console.error("Shopify create error:", await res.text());
    return false;
  }
  const created = await res.json();
  console.log(`✅ Posted: ${created.article?.title || title}`);
  return true;
}

/* =========================
   RSS Fetch
   ========================= */
async function fetchRSSArticles() {
  const out = [];
  for (const feedInfo of rssFeeds) {
    try {
      const feed = await parser.parseURL(feedInfo.url);
      const source = (feed.title || "").trim() || new URL(feedInfo.url).hostname;

      feed.items.slice(0, 5).forEach(item => {
        out.push({
          category: feedInfo.category,
          title: (item.title || "").trim(),
          link: item.link || item.guid || "",
          source,
          rawContent: item.contentEncoded || item["content:encoded"] || item.contentSnippet || item.content || item.summary || "",
          image: firstImageFromItem(item)
        });
      });
    } catch (err) {
      console.error(`❌ RSS error for ${feedInfo.url}:`, err.message);
    }
  }
  return out;
}

/* =========================
   Main
   ========================= */
(async () => {
  try {
    console.log("🔄 Fetching RSS feeds…");
    const rssArticles = await fetchRSSArticles();

    // Group by category to keep things tidy
    const byCategory = rssArticles.reduce((acc, a) => {
      (acc[a.category] ||= []).push(a);
      return acc;
    }, {});

    for (const [category, items] of Object.entries(byCategory)) {
      const blogId = blogCategories[category];
      if (!blogId) {
        console.warn(`⚠️ No Shopify blog ID for category: ${category}`);
        continue;
      }

      const existingTitles = await fetchShopifyArticles(blogId);

      for (const item of items) {
        if (!item.title) continue;

        // Deduplicate by exact title match
        if (existingTitles.includes(item.title)) {
          console.log(`⏭ Skipping duplicate: ${item.title}`);
          continue;
        }

        // Build clean body
        const cleanText = stripHtml(item.rawContent).slice(0, 3000); // Keep it reasonable
        if (!cleanText) {
          console.log(`⏭ No usable content for: ${item.title}`);
          continue;
        }

        const body_html = rewriteContent({
          title: item.title,
          cleanText,
          category,
          source: item.source || "source",
          link: item.link
        });

        await postToShopify(blogId, {
          title: item.title,
          body_html,
          image: item.image || null
        });
      }
    }

    console.log("🎉 Blog generation complete!");
  } catch (e) {
    console.error("💥 Fatal error:", e);
    process.exit(1);
  }
})();
