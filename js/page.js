document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get("slug") || "about";
    await loadDynamicPageData(slug);
  });
  
  async function loadDynamicPageData(slug) {
    const titleEl = document.getElementById("dynamic-page-title");
    const contentEl = document.getElementById("dynamic-page-content");
    const windowTitleEl = document.getElementById("page-window-title");
  
    try {
      if (typeof _supabase === "undefined") return;
  
      const { data: page, error } = await _supabase
        .from("site_pages")
        .select("*")
        .eq("page_key", slug)
        .maybeSingle();
  
      if (error || !page) {
        if (titleEl) titleEl.innerText = "الصفحة غير موجودة";
        if (contentEl) contentEl.innerHTML = "<p class='text-muted'>عفواً، تعذر العثور على محتوى هذه الصفحة حالياً.</p>";
        return;
      }
  
      if (titleEl) titleEl.innerText = page.title;
      if (windowTitleEl) windowTitleEl.innerText = `${page.title} | ANO Store`;
      if (contentEl) contentEl.innerHTML = `<div class="lh-lg">${page.content || 'لا يوجد محتوى مضاف بعد.'}</div>`;
  
    } catch (err) {
      console.error("Load Dynamic Page Error:", err);
    }
  }