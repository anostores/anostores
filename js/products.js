/* ==========================================================================
   ANO Store - Supabase Live Dynamic Products & Hero Slider Script
   Guaranteed Hybrid Routing Support for Live Server, GitHub Pages, and Vercel
   ========================================================================== */

   document.addEventListener("DOMContentLoaded", async () => {
    const isHomePage = document.getElementById("used-phones-container") !== null;
    const isProductsPage = document.getElementById("products-grid-container") !== null;
  
    if (isHomePage) {
      await loadDynamicHeroSlider();
      await loadHomePageSections();
    }
  
    if (isProductsPage) {
      const urlParams = new URLSearchParams(window.location.search);
      const selectedCat = urlParams.get("cat") || "all";
      const searchQuery = urlParams.get("search") || "";
  
      const filterCategorySelect = document.getElementById("filter-category");
      if (filterCategorySelect && selectedCat !== "all") {
        filterCategorySelect.value = selectedCat;
      }
  
      await loadProductsPage(selectedCat, searchQuery);
  
      // ربط الأحداث للفلاتر
      if (filterCategorySelect) {
        filterCategorySelect.addEventListener("change", () => filterAndRenderProductsPage());
      }
  
      const filterSortSelect = document.getElementById("filter-sort");
      if (filterSortSelect) {
        filterSortSelect.addEventListener("change", () => filterAndRenderProductsPage());
      }
  
      const resetBtn = document.getElementById("btn-reset-filters");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          if (filterCategorySelect) filterCategorySelect.value = "all";
          if (filterSortSelect) filterSortSelect.value = "default";
          
          const isLocalServer = window.location.hostname === '127.0.0.1' || 
                                window.location.hostname === 'localhost' || 
                                window.location.protocol === 'file:' || 
                                window.location.hostname.includes('github.io');
  
          const resetPath = isLocalServer ? "products.html" : "/products";
          window.history.pushState({}, "", resetPath);
          filterAndRenderProductsPage();
        });
      }
    }
  });
  
  let globalLoadedProducts = [];
  
  /* ================= 0. جلب وبناء السلايدر الديناميكي من قاعدة البيانات ================= */
  async function loadDynamicHeroSlider() {
    const sliderInner = document.getElementById("hero-slider-dynamic-inner");
    if (!sliderInner) return;
  
    try {
      const { data: slides, error } = await _supabase
        .from("hero_slides")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
  
      if (error || !slides || slides.length === 0) return; // الحفاظ على السلايدر الافتراضي إذا لم تتواجد داتا
  
      sliderInner.innerHTML = slides.map((slide, index) => {
        const activeClass = index === 0 ? "active" : "";
        const bgImg = slide.image_url || "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1600&auto=format&fit=crop";
        
        const isLocalServer = window.location.hostname === '127.0.0.1' || 
                              window.location.hostname === 'localhost' || 
                              window.location.protocol === 'file:' || 
                              window.location.hostname.includes('github.io');
  
        const targetLink = slide.link_url ? (isLocalServer && !slide.link_url.includes('.html') ? 'products.html' : slide.link_url) : (isLocalServer ? "products.html" : "/products");
  
        return `
          <div class="carousel-item ${activeClass}" data-bs-interval="4000">
            <div class="hero-slide-item" style="background-image: url('${bgImg}');">
              <div class="hero-overlay text-white">
                ${slide.subtitle ? `<span class="badge bg-danger w-auto mb-2 align-self-start fs-7">${slide.subtitle}</span>` : ''}
                <h2 class="fw-bold display-6">${slide.title || 'أفضل العروض والموبايلات'}</h2>
                <a href="${targetLink}" class="btn btn-ano-primary w-auto align-self-start mt-3">اكتشف التفاصيل الآن &larr;</a>
              </div>
            </div>
          </div>
        `;
      }).join("");
  
    } catch (err) {
      console.error("Error loading hero slider from Supabase:", err);
    }
  }
  
  /* ================= 1. جلب وتوزيع المنتجات في الصفحة الرئيسية ================= */
  async function loadHomePageSections() {
    try {
      const { data: products, error } = await _supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
  
      if (error) throw error;
  
      // توزيع المنتجات حسب القسم في السكاشن الـ 4
      renderSection("used-phones-container", products.filter(p => p.category_slug === "used-phones").slice(0, 6));
      renderSection("new-phones-container", products.filter(p => p.category_slug === "new-phones").slice(0, 6));
      renderSection("perfumes-container", products.filter(p => p.category_slug === "perfumes" || p.category_slug === "body-splash" || p.category_slug === "sprays").slice(0, 6));
      renderSection("accessories-container", products.filter(p => p.category_slug !== "used-phones" && p.category_slug !== "new-phones" && p.category_slug !== "perfumes" && p.category_slug !== "body-splash" && p.category_slug !== "sprays").slice(0, 6));
  
    } catch (err) {
      console.error("Error loading home products from Supabase:", err);
    }
  }
  
  function renderSection(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;
  
    if (!items || items.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center py-3 text-muted">
          <small>لا توجد منتجات مضافة في هذا القسم حالياً.</small>
        </div>
      `;
      return;
    }
  
    container.innerHTML = items.map(product => createProductCardHTML(product)).join("");
  }
  
  /* ================= 2. جلب وتصفية المنتجات في صفحة products ================= */
  async function loadProductsPage(selectedCat, searchQuery) {
    const container = document.getElementById("products-grid-container");
  
    try {
      const { data, error } = await _supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
  
      if (error) throw error;
  
      globalLoadedProducts = data || [];
      filterAndRenderProductsPage(searchQuery);
  
    } catch (err) {
      console.error("Error loading products page:", err);
      if (container) {
        container.innerHTML = `<div class="col-12 text-center py-4 text-danger">حدث خطأ أثناء جلب المنتجات من قاعدة البيانات.</div>`;
      }
    }
  }
  
  function filterAndRenderProductsPage(searchQuery = "") {
    const container = document.getElementById("products-grid-container");
    const countLabel = document.getElementById("products-count-label");
    const catSelect = document.getElementById("filter-category");
    const sortSelect = document.getElementById("filter-sort");
  
    if (!container) return;
  
    let filtered = [...globalLoadedProducts];
  
    // تصفية حسب القسم
    if (catSelect && catSelect.value !== "all") {
      filtered = filtered.filter(p => p.category_slug === catSelect.value);
    }
  
    // تصفية بالبحث
    if (searchQuery) {
      filtered = filtered.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
  
    // فرز حسب السعر
    if (sortSelect) {
      if (sortSelect.value === "price-low") {
        filtered.sort((a, b) => a.price - b.price);
      } else if (sortSelect.value === "price-high") {
        filtered.sort((a, b) => b.price - a.price);
      }
    }
  
    if (countLabel) {
      countLabel.innerText = `عدد المنتجات: ${filtered.length}`;
    }
  
    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center py-5 w-100">
          <i class="fa-solid fa-box-open fa-3x text-muted mb-3"></i>
          <h5>عفواً، لا توجد منتجات مضافة في هذا القسم حتى الآن!</h5>
        </div>
      `;
      return;
    }
  
    container.innerHTML = filtered.map(product => createProductCardHTML(product)).join("");
  }
  
  /* ================= 3. إنشاء كارت المنتج القابل للضغط بـ Hybrid Routing Support ================= */
  function createProductCardHTML(product) {
    const imgSrc = (product.images && product.images.length > 0 && product.images[0]) 
      ? product.images[0] 
      : 'https://via.placeholder.com/150?text=ANO+STORE';
  
    // فحص حاسم وشامل لبيئة Live Server والتشغيل المحلي
    const isLocalServer = window.location.hostname === '127.0.0.1' || 
                          window.location.hostname === 'localhost' || 
                          window.location.protocol === 'file:' || 
                          window.location.pathname.endsWith('.html') || 
                          window.location.hostname.includes('github.io');
                            
    const productLink = isLocalServer
      ? `product-details.html?id=${product.id}`
      : (product.slug ? `/products/${product.slug}` : `/product?id=${product.id}`);
  
    return `
      <div class="col">
        <div class="product-card-sm position-relative" style="cursor: pointer;" onclick="window.location.href='${productLink}'">
          <a href="${productLink}" class="text-decoration-none text-dark d-block">
            <div class="img-box">
              <img src="${imgSrc}" alt="${product.title}">
            </div>
            <div class="title mt-2 text-truncate" title="${product.title}">${product.title}</div>
            <div class="price mt-2">${Number(product.price).toLocaleString()} ج.م</div>
          </a>
          <button class="btn btn-ano-primary w-100 btn-sm mt-2" onclick="event.stopPropagation(); addToCart('${product.id}', '${escapeQuotes(product.title)}', ${product.price}, '${imgSrc}')">
            <i class="fa-solid fa-cart-plus me-1"></i> إضافة
          </button>
        </div>
      </div>
    `;
  }
  
  function escapeQuotes(str) {
    return str ? str.replace(/'/g, "\\'").replace(/"/g, "&quot;") : "";
  }
  
  /* ================= 4. دالة الإضافة للسلة ================= */
  function addToCart(id, title, price, image) {
    let cart = JSON.parse(localStorage.getItem("ano_cart") || "[]");
    
    const existingItem = cart.find(item => item.id == id);
    if (existingItem) {
      existingItem.qty = (existingItem.qty || 1) + 1;
    } else {
      cart.push({ id, title, price, image, qty: 1 });
    }
  
    localStorage.setItem("ano_cart", JSON.stringify(cart));
    
    if (typeof updateCartCount === "function") {
      updateCartCount();
    }
  
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "تمت الإضافة للسلة بنجاح!",
      showConfirmButton: false,
      timer: 1500
    });
  }