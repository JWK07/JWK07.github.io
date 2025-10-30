document.addEventListener("DOMContentLoaded", () => {
  /* ────────────────
     Sidebar Setup
  ──────────────── */
  const tabs = document.querySelectorAll(".tab");
  const contents = document.querySelectorAll(".tab-content");

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      contents.forEach((c) => (c.style.display = "none"));
      contents[index].style.display = "block";
    });
  });

  /* ────────────────
     Country Data
  ──────────────── */
  const countryData = {
    ae: { name: "United Arab Emirates", description: "The <b>United Arab Emirates (UAE)</b> is a federation in West Asia.", image: "flags/flag_ae.png" },
    af: { name: "Islamic Emirate of Afghanistan", description: "<b>Afghanistan</b> is a landlocked country at the crossroads of Central and South Asia.", image: "flags/flag_af.png" },
    al: { name: "Republic of Albania", description: "<b>Albania</b> is a country in Southeast Europe.", image: "flags/flag_al.png" },
    am: { name: "Republic of Armenia", description: "<b>Armenia</b> is a landlocked country in the Armenian highlands.", image: "flags/flag_am.png" },
    ar: { name: "Argentine Republic", description: "<b>Argentina</b> is located in the southern half of South America.", image: "flags/flag_ar.png" },
    ao: { name: "Republic of Angola", description: "<b>Angola</b> is a country on the western coast of Southern Africa.", image: "flags/flag_ao.png" },
    at: { name: "Republic of Austria", description: "<b>Armenia</b> is a landlocked country in the Armenian highlands.", image: "flags/flag_at.png" },
    au: { name: "Commonwealth of Australia", description: "<b>Argentina</b> is located in the southern half of South America.", image: "flags/flag_au.png" },
    az: { name: "Republic of Azerbaijan", description: "<b>Angola</b> is a country on the western coast of Southern Africa.", image: "flags/flag_az.png" },
    us: { name: "United States", description: "<b>The USA</b> is a country primarily located in North America.", image: "flags/flag_us.png" },
    fr: { name: "France", description: "France is celebrated for its culture, cuisine, and history.", image: "flags/flag_fr.png" },
    jp: { name: "Japan", description: "Japan blends tradition with technology.", image: "flags/flag_jp.png" },
  };

  /* ────────────────
     Map Setup
  ──────────────── */
  const svg = document.getElementById("world-map");
  const mapGroup = document.getElementById("mapGroup");
  const countries = mapGroup.querySelectorAll("g[id], path[id]");
  const originalViewBox = svg.getAttribute("viewBox");

  let zoomed = false;
  let zoomedCountry = null;
  let activeCountryEl = null;
  let currentCountryInfo = { name: "", description: "", image: "" };
  const duration = 800;

  const easeInOutCubic = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const bboxCache = new Map();
  function computeBBoxes() {
    countries.forEach((el) => {
      try {
        bboxCache.set(el, el.getBBox());
      } catch {}
    });
  }

  function warmUpSvg() {
    svg.style.transform = "scale(1.001)";
    requestAnimationFrame(() => (svg.style.transform = "scale(1)"));
  }

  function parseViewBox(vb) {
    const [x, y, w, h] = vb.split(" ").map(Number);
    return { x, y, w, h };
  }

  let animId = null;
  function animateViewBox(from, to, ms = duration) {
    if (animId) cancelAnimationFrame(animId);
    svg.style.willChange = "transform";
    svg.style.transform = "translateZ(0)";
    const start = performance.now();

    function step(now) {
      const t = Math.min((now - start) / ms, 1);
      const e = easeInOutCubic(t);
      const x = from.x + (to.x - from.x) * e;
      const y = from.y + (to.y - from.y) * e;
      const w = from.w + (to.w - from.w) * e;
      const h = from.h + (to.h - from.h) * e;
      svg.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
      if (t < 1) animId = requestAnimationFrame(step);
      else {
        svg.style.willChange = "";
        svg.style.transform = "";
      }
    }
    animId = requestAnimationFrame(step);
  }

  /* ────────────────
     Country Clicks
  ──────────────── */
  const imageCache = new Map();
  const panel = document.getElementById("countryPanel");

  function renderHomeTabContent() {
    const content = document.getElementById("countryTabContent");
    const cachedImg = imageCache.get(currentCountryInfo.image);
    content.innerHTML = `
      <h2>${currentCountryInfo.name}</h2>
      ${cachedImg ? `<img src="${cachedImg.src}" alt="${currentCountryInfo.name}" />` : ""}
      <p>${currentCountryInfo.description}</p>
    `;
  }

  countries.forEach((countryEl) => {
    countryEl.addEventListener("click", (e) => {
      e.stopPropagation();

      if (!zoomed || zoomedCountry !== countryEl) {
        const bbox = bboxCache.get(countryEl) || countryEl.getBBox();
        const currentVB = parseViewBox(originalViewBox);

        const padding = 40;
        const targetAspect = currentVB.w / currentVB.h;
        const countryAspect = bbox.width / bbox.height;
        let zoomW, zoomH;

        if (countryAspect > targetAspect) {
          zoomW = bbox.width + padding * 2;
          zoomH = zoomW / targetAspect;
        } else {
          zoomH = bbox.height + padding * 2;
          zoomW = zoomH * targetAspect;
        }

        const minZoomRatio = 0.3;
        zoomW = Math.max(zoomW, currentVB.w * minZoomRatio);
        zoomH = Math.max(zoomH, currentVB.h * minZoomRatio);

        const shiftRatio = 0.25;
        const zoomBox = {
          x: bbox.x + bbox.width / 2 - zoomW * (0.5 - shiftRatio),
          y: bbox.y + bbox.height / 2 - zoomH / 2,
          w: zoomW,
          h: zoomH,
        };

        animateViewBox(parseViewBox(svg.getAttribute("viewBox")), zoomBox);
        zoomed = true;
        zoomedCountry = countryEl;

        if (activeCountryEl) activeCountryEl.classList.remove("active-country");
        countryEl.classList.add("active-country");
        activeCountryEl = countryEl;

        const countryId = countryEl.id?.toLowerCase();
        const data = countryData[countryId];
        currentCountryInfo = {
          name: data?.name || countryId?.toUpperCase() || "Unknown Country",
          description: data?.description || "No information available yet.",
          image: data?.image || "",
        };

        document.querySelectorAll(".country-tab").forEach((t) => t.classList.remove("active"));
        document.querySelector('.country-tab[data-section="home"]').classList.add("active");
        renderHomeTabContent();
        panel.classList.add("visible");
      } else {
        animateViewBox(parseViewBox(svg.getAttribute("viewBox")), parseViewBox(originalViewBox));
        zoomed = false;
        zoomedCountry = null;
        panel.classList.remove("visible");
        if (activeCountryEl) activeCountryEl.classList.remove("active-country");
        activeCountryEl = null;
      }
    });
  });

  svg.addEventListener("click", (e) => {
    if (e.target === svg && zoomed) {
      animateViewBox(parseViewBox(svg.getAttribute("viewBox")), parseViewBox(originalViewBox));
      zoomed = false;
      zoomedCountry = null;
      panel.classList.remove("visible");
      if (activeCountryEl) activeCountryEl.classList.remove("active-country");
      activeCountryEl = null;
    }
  });

  /* ────────────────
     Panel Tabs
  ──────────────── */
  const countryTabs = document.querySelectorAll(".country-tab");
  const content = document.getElementById("countryTabContent");

  countryTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      countryTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const section = tab.dataset.section;
      switch (section) {
        case "home": renderHomeTabContent(); break;
        case "economics": content.innerHTML = `<h2>Economics</h2><p>Placeholder economic data.</p>`; break;
        case "politics": content.innerHTML = `<h2>Politics</h2><p>Placeholder political data.</p>`; break;
        case "trade": content.innerHTML = `<h2>Trade</h2><p>Placeholder trade data.</p>`; break;
        case "other": content.innerHTML = `<h2>Other</h2><p>Miscellaneous info.</p>`; break;
      }
    });
  });

  /* ────────────────
     Preload + Loader
  ──────────────── */
  async function preloadImages(dataMap) {
    const entries = Object.values(dataMap).filter((d) => d.image);
    const tasks = entries.map((d) => {
      const img = new Image();
      img.src = d.image + "?v=" + Date.now();
      return new Promise((resolve) => {
        img.onload = async () => {
          try { if (img.decode) await img.decode(); } catch {}
          imageCache.set(d.image, img);
          resolve();
        };
        img.onerror = resolve;
      });
    });
    await Promise.all(tasks);
  }

  (async () => {
    await preloadImages(countryData);
    computeBBoxes();
    warmUpSvg();
    const loader = document.getElementById("siteLoader");
    loader.classList.add("hidden");
  })();
});
