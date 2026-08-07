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
        
        window.history.pushState({}, "", "products");
        filterAndRenderProductsPage();
      });
    }
  }
});

let globalLoadedProducts = [];

async function loadDynamicHeroSlider() {
  const sliderInner = document.getElementById("hero-slider-dynamic-inner");
  if (!sliderInner) return;

  try {
    const { data: slides, error } = await _supabase
      .from("hero_slides")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error || !slides || slides.length === 0) return;

    sliderInner.innerHTML = slides.map((slide, index) => {
      const activeClass = index === 0 ? "active" : "";
      const bgImg = slide.image_url || "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1600&auto=format&fit=crop";

      let targetLink = slide.link_url || "products";
      if (targetLink.endsWith(".html")) {
        targetLink = targetLink.replace(".html", "");
      }

      return `
        <div class="carousel-item ${activeClass} h-100" data-bs-interval="4000">
          <a href="${targetLink}" class="hero-slide-item d-block text-decoration-none h-100">
            <img src="${bgImg}" alt="${slide.title || 'عرض خاص'}" loading="lazy" class="d-block w-100 h-100 object-fit-cover no-open-tab" ondragstart="return false;">
          </a>
        </div>
      `;
    }).join("");

  } catch (err) {
    console.error("Error loading hero slider from Supabase:", err);
  }
}

async function loadHomePageSections() {
  try {
    const { data: products, error } = await _supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

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

  if (catSelect && catSelect.value !== "all") {
    filtered = filtered.filter(p => p.category_slug === catSelect.value);
  }

  if (searchQuery) {
    filtered = filtered.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }

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

function createProductCardHTML(product) {
  const imgSrc = (product.images && product.images.length > 0 && product.images[0]) 
    ? product.images[0] 
    : 'https://via.placeholder.com/150?text=ANO+STORE';
                        
  const productLink = product.slug 
    ? `product-details?slug=${encodeURIComponent(product.slug)}` 
    : `product-details?id=${product.id}`;

  let discountBadgeHTML = "";
  if (product.original_price && Number(product.original_price) > Number(product.price)) {
    const discountPercent = Math.round(((Number(product.original_price) - Number(product.price)) / Number(product.original_price)) * 100);
    if (discountPercent > 0) {
      discountBadgeHTML = `<div class="product-discount-badge">خصم ${discountPercent}% OFF</div>`;
    }
  }

  return `
    <div class="col">
      <div class="product-card-sm position-relative" style="cursor: pointer;" onclick="window.location.href='${productLink}'">
        ${discountBadgeHTML}
        <a href="${productLink}" class="text-decoration-none text-dark d-block">
          <div class="img-box">
            <img src="${imgSrc}" alt="${product.title}" class="no-open-tab" ondragstart="return false;">
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