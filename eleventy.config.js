// Eleventy config — turns the files in /src into the finished site in /_site.
// You rarely need to touch this file. Content lives in src/blog, src/_data and src/assets/photos.

import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import Image from "@11ty/eleventy-img";
import path from "node:path";

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
