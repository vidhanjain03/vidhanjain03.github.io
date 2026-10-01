// Small bits of interactivity. The site works without any of this.
(function () {
  const root = document.documentElement;
  const save = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  // ---- Dark / light toggle ----
  document.querySelectorAll(".theme-toggle").forEach((btn) =>
    btn.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      save("theme", next);
    })
  );

  // ---- Accent color dot: cycles through a few colors ----
  const ACCENTS = ["thermal", "magenta", "teal", "indigo", "green"];
  document.querySelectorAll(".accent-dot").forEach((btn) =>
    btn.addEventListener("click", () => {
      const current = root.dataset.accent || "thermal";
      const next = ACCENTS[(ACCENTS.indexOf(current) + 1) % ACCENTS.length];
      if (next === "thermal") delete root.dataset.accent;
      else root.dataset.accent = next;
      save("accent", next);
    })
  );
  if (root.dataset.accent === "thermal") delete root.dataset.accent;

  // ---- Mobile menu ----
  const sidebar = document.getElementById("sidebar");
  const menuBtn = document.querySelector(".menu-toggle");
  if (sidebar && menuBtn) {
    menuBtn.addEventListener("click", () => {
      const open = sidebar.classList.toggle("is-open");
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
  }

  // ---- Table of contents for blog posts ----
  const tocList = document.querySelector("[data-toc]");
  const body = document.querySelector(".post-body");
  if (tocList && body) {
    const slug = (s) => s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
    const headings = [...body.querySelectorAll("h2, h3")];
    headings.forEach((h) => {
      if (!h.id) h.id = slug(h.textContent);
      const li = document.createElement("li");
      li.className = "lvl-" + h.tagName[1];
      const a = document.createElement("a");
      a.href = "#" + h.id;
      a.textContent = h.textContent;
      li.appendChild(a);
      tocList.appendChild(li);
    });
    if ("IntersectionObserver" in window && headings.length) {
      const links = new Map([...tocList.querySelectorAll("a")].map((a) => [a.hash.slice(1), a]));
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              links.forEach((a) => a.classList.remove("is-active"));
              const a = links.get(e.target.id);
              if (a) a.classList.add("is-active");
            }
          });
        },
        { rootMargin: "0px 0px -70% 0px" }
      );
      headings.forEach((h) => obs.observe(h));
    }
  }

  // ---- Photo lightbox ----
  const box = document.querySelector(".lightbox");
  const photoLinks = [...document.querySelectorAll(".photo-link")];
  // photos whose image failed to load get hidden, so skip them when stepping through
  const visibleLinks = () => photoLinks.filter((a) => !a.closest("[hidden]"));
  if (box && photoLinks.length && typeof box.showModal === "function") {
    const img = box.querySelector("img");
    const cap = box.querySelector(".lightbox-caption");
    let list = photoLinks;
    let i = 0;
    let opener = null;
    let openedWithMouse = false;
    // Pinterest's full-size copy occasionally doesn't exist; fall back to the gallery size.
    img.addEventListener("error", () => {
      const fb = list[i] && list[i].dataset.fallback;
      if (fb && img.src !== fb) img.src = fb;
    });
    const show = (n) => {
      i = (n + list.length) % list.length;
      const link = list[i];
      const caption = link.parentElement.querySelector("figcaption");
      img.src = link.href;
      img.alt = link.querySelector("img").alt;
      cap.textContent = caption ? caption.textContent : "";
    };
    photoLinks.forEach((link) =>
      link.addEventListener("click", (e) => {
        e.preventDefault();
        opener = link;
        openedWithMouse = e.detail > 0; // 0 means Enter key, not a mouse click
        list = visibleLinks();
        show(list.indexOf(link));
        box.showModal();
      })
    );
    box.querySelector(".lightbox-close").addEventListener("click", () => box.close());
    // When the viewer closes, the browser puts focus back on the photo that opened it.
    // For mouse users that would leave its caption showing, so drop the focus.
    box.addEventListener("close", () => {
      if (openedWithMouse && opener) opener.blur();
      opener = null;
    });
    box.querySelector(".lightbox-prev").addEventListener("click", () => show(i - 1));
    box.querySelector(".lightbox-next").addEventListener("click", () => show(i + 1));
    box.addEventListener("click", (e) => { if (e.target === box) box.close(); });
    box.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") show(i - 1);
      if (e.key === "ArrowRight") show(i + 1);
    });
  }
})();
