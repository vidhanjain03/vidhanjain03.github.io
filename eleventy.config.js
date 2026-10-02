// Eleventy config — turns the files in /src into the finished site in /_site.
// You rarely need to touch this file. Content lives in src/blog, src/_data and src/assets/photos.

import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import Image from "@11ty/eleventy-img";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";

const NOT_TOPICS = new Set(["all", "posts"]);

export default function (eleventyConfig) {
  // ---- Plugins ----------------------------------------------------------
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(feedPlugin, {
    type: "rss",
    outputPath: "/feed.xml",
    collection: { name: "posts", limit: 20 },
    metadata: {
      language: "en",
      title: "Vidhan Jain",
      subtitle: "Notes on machine learning, computer vision and whatever else I'm learning.",
      base: "https://www.vidhanjain.com/",
      author: { name: "Vidhan Jain" },
    },
  });

  // ---- Files copied as-is ----------------------------------------------
  eleventyConfig.addPassthroughCopy("src/assets/css");
  eleventyConfig.addPassthroughCopy("src/assets/js");
  eleventyConfig.addPassthroughCopy("src/assets/img");
  eleventyConfig.addPassthroughCopy("src/assets/fonts");
  eleventyConfig.addPassthroughCopy("src/assets/*.pdf");
  eleventyConfig.addPassthroughCopy({ "src/assets/img/favicon.svg": "favicon.svg" });

  // ---- Collections -----------------------------------------------------
  // All blog posts, newest first. Posts with `draft: true` are skipped.
  eleventyConfig.addCollection("posts", (api) =>
    api
      .getFilteredByGlob("src/blog/*.md")
      .filter((p) => !p.data.draft)
      .sort((a, b) => b.date - a.date)
  );

  // Every tag used on a post, with its posts — powers /topics/.
  eleventyConfig.addCollection("topics", (api) => {
    const map = new Map();
    api
      .getFilteredByGlob("src/blog/*.md")
      .filter((p) => !p.data.draft)
      .forEach((post) => {
        (post.data.tags || [])
          .filter((t) => !NOT_TOPICS.has(t))
          .forEach((t) => {
            if (!map.has(t)) map.set(t, []);
            map.get(t).push(post);
          });
      });
    return [...map.entries()]
      .map(([name, posts]) => ({ name, posts: posts.sort((a, b) => b.date - a.date) }))
      .sort((a, b) => b.posts.length - a.posts.length || a.name.localeCompare(b.name));
  });

  // ---- Filters ---------------------------------------------------------
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  eleventyConfig.addFilter("longDate", (d) => `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`);
  eleventyConfig.addFilter("monthDay", (d) => `${months[d.getUTCMonth()]} ${d.getUTCDate()}`);
  eleventyConfig.addFilter("year", (d) => d.getUTCFullYear());
  eleventyConfig.addFilter("isoDate", (d) => d.toISOString().slice(0, 10));
  eleventyConfig.addFilter("topics", (tags) => (tags || []).filter((t) => !NOT_TOPICS.has(t)));
  eleventyConfig.addFilter("readingTime", (content) => {
    const words = String(content || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    return `${Math.max(1, Math.round(words / 220))} min read`;
  });
  // Adds a fingerprint of the file's contents to its URL, e.g. /assets/css/style.css?v=3f2a9c1b7d.
  // Whenever the file changes, the URL changes, so every browser fetches the new version on a
  // normal refresh instead of reusing an old cached copy.
  eleventyConfig.addFilter("bust", (url) => {
    try {
      const hash = crypto.createHash("md5").update(fs.readFileSync(path.join("src", url))).digest("hex").slice(0, 10);
      return `${url}?v=${hash}`;
    } catch {
      return url;
    }
  });
  eleventyConfig.addFilter("currentYear", () => new Date().getFullYear());
  eleventyConfig.addFilter("limit", (arr, n) => (arr || []).slice(0, n));
  // Group posts by year → [{ year, posts }]
  eleventyConfig.addFilter("byYear", (posts) => {
    const groups = [];
    (posts || []).forEach((p) => {
      const y = p.date.getUTCFullYear();
      let g = groups.find((x) => x.year === y);
      if (!g) groups.push((g = { year: y, posts: [] }));
      g.posts.push(p);
    });
    return groups;
  });
  eleventyConfig.addFilter("where", (arr, key, value) => (arr || []).filter((x) => x[key] === value));
  eleventyConfig.addFilter("count", (arr) => (arr || []).length);


  // ---- SEO: structured data (JSON-LD) ----------------------------------
  // Tells search engines who the site is about and what each page is.
  // Output is built from src/_data/site.json, publications.json and each page's front matter.
  eleventyConfig.addShortcode("structuredData", function () {
    const d = this.ctx || {};
    const site = d.site || {};
    const page = d.page || this.page || {};
    const base = site.url;
    const abs = (u) => (u && u.startsWith("http") ? u : base + u);
    const person = {
      "@type": "Person",
      "@id": base + "/#person",
      name: site.name,
      url: base + "/",
      image: abs("/assets/img/vidhan.jpg"),
      jobTitle: site.person?.jobTitle,
      description: site.person?.description || site.description,
      worksFor: site.person?.worksFor ? { "@type": "Organization", name: site.person.worksFor } : undefined,
      homeLocation: site.person?.location ? { "@type": "Place", name: site.person.location } : undefined,
      alumniOf: (site.person?.alumniOf || []).map((n) => ({ "@type": "CollegeOrUniversity", name: n })),
      knowsAbout: site.person?.knowsAbout,
      sameAs: [site.github, site.linkedin, site.pinterest].filter(Boolean),
    };
    const website = { "@type": "WebSite", "@id": base + "/#website", name: site.name, url: base + "/", inLanguage: "en", publisher: { "@id": base + "/#person" } };
    const url = base + page.url;
    const graph = [];

    if (page.url === "/") {
      graph.push(website, person);
    } else if (page.url === "/me/") {
      graph.push(person, { "@type": "ProfilePage", "@id": url, url, name: d.title, mainEntity: { "@id": base + "/#person" }, isPartOf: { "@id": base + "/#website" } });
    } else if ((page.inputPath || "").includes("/blog/") && page.url !== "/blog/") {
      const date = page.date instanceof Date ? page.date.toISOString() : undefined;
      graph.push({
        "@type": "BlogPosting",
        "@id": url + "#post",
        headline: d.title,
        description: d.description,
        datePublished: date,
        dateModified: d.updated ? new Date(d.updated).toISOString() : date,
        author: { "@type": "Person", "@id": base + "/#person", name: site.name, url: base + "/" },
        publisher: { "@id": base + "/#person" },
        image: abs(site.ogImage),
        keywords: (d.tags || []).filter((t) => t !== "posts").join(", ") || undefined,
        mainEntityOfPage: url,
        isPartOf: { "@id": base + "/#website" },
      });
    } else if (page.url === "/research/") {
      graph.push({
        "@type": "CollectionPage",
        "@id": url,
        url,
        name: d.title,
        description: d.description,
        about: { "@id": base + "/#person" },
        hasPart: (d.publications || []).map((p) => ({
          "@type": "ScholarlyArticle",
          headline: p.title,
          name: p.title,
          author: p.authors.split(",").map((n) => n.trim()).map((n) =>
            n === site.name ? { "@id": base + "/#person" } : { "@type": "Person", name: n }),
          datePublished: String(p.year),
          isPartOf: { "@type": "PublicationEvent", name: p.venue },
          creativeWorkStatus: p.status,
          abstract: p.summary,
          award: p.award || undefined,
          url: (p.links && p.links[0] && p.links[0].url) || url + "#" + p.id,
        })),
      });
    } else {
      graph.push({ "@type": "WebPage", "@id": url, url, name: d.title, description: d.description || site.description, isPartOf: { "@id": base + "/#website" }, about: { "@id": base + "/#person" } });
    }

    const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 0).replace(/</g, "\\u003c");
    return `<script type="application/ld+json">${json}</script>`;
  });

  // Pages for the sitemap: everything except the 404 page and pages marked noindex.
  eleventyConfig.addCollection("sitemap", (api) =>
    api.getAll().filter((p) => p.url && !p.data.noindex && !p.url.endsWith(".xml") && !p.url.endsWith(".txt") && p.url !== "/404.html")
  );

  // ---- Photos ----------------------------------------------------------
  // {% photo "src/assets/photos/rourkela.jpg", "Alt text" %}
  // Makes small, fast WebP + JPEG copies of big phone photos so the gallery loads quickly.
  eleventyConfig.addAsyncShortcode("photo", async (src, alt = "", sizes = "(min-width: 900px) 33vw, 100vw") => {
    const full = src.startsWith("src/") ? src : path.join("src/assets/photos", src);
    const meta = await Image(full, {
      widths: [480, 960, 1800],
      formats: ["webp", "jpeg"],
      outputDir: "./_site/img/photos/",
      urlPath: "/img/photos/",
    });
    const largest = meta.jpeg[meta.jpeg.length - 1];
    const img = Image.generateHTML(meta, { alt, sizes, loading: "lazy", decoding: "async" });
    return `<a class="photo-link" href="${largest.url}" data-width="${largest.width}" data-height="${largest.height}">${img}</a>`;
  });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["md", "njk", "html"],
  };
}
