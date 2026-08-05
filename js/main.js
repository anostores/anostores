/* ==========================================================================
   ANO Store - Main JavaScript Engine
   Handles Navbar, Animated Search Overlay, User Sessions, Real Analytics,
   Dynamic Hero Slider, Home Products & Dynamic Contacts.
   Guaranteed Hybrid Local & Production Routing Support.
   ========================================================================== */

   document.addEventListener("DOMContentLoaded", async () => {
    initAnimatedSearch();
    await checkUserSession();
    await recordAnalyticsVisit();
    await loadDynamicContacts();
    await loadDynamicHeroSlider();
    await loadHomePageProducts();
    updateCartCount();
  });
  
  /**
   * 0. تسجيل الزيارة حياً بجدول التحليلات المباشرة
   */
  async function recordAnalyticsVisit() {
    if (typeof _supabase === "undefined") return;
  
    try {
      const { data: { session } } = await _supabase.auth.getSession();
      const currentPath = window.location.pathname || "index.html";
  
      await _supabase.from("site_analytics").insert([{
        page_path: currentPath,
        user_id: session?.user?.id || null
      }]);
    } catch (err) {
      console.error("Analytics Recording Error:", err);
    }
  }
  
  /**
   * 0.1 جلب وتحديث أرقام الواتساب والدعم المباشر ديناميكياً
   */
  async function loadDynamicContacts() {
    if (typeof _supabase === "undefined") return;
  
    try {
      const { data: contacts } = await _supabase
        .from("store_contacts")
        .select("*")
        .order("created_at", { ascending: true });
  
      if (!contacts || contacts.length === 0) return;
  
      // تحديث أرقام الواتساب والدعم بالفوتر وقوائم التواصل
      const footerContactsBox = document.getElementById("footer-contacts-list");
      if (footerContactsBox) {
        footerContactsBox.innerHTML = contacts.map(c => `
          <a href="https://wa.me/2${c.phone_number.replace(/\D/g, '')}" target="_blank" class="p-3 bg-light rounded-3 text-dark fw-bold border d-flex align-items-center justify-content-between text-decoration-none">
            <span><i class="fa-brands fa-whatsapp text-success me-2"></i> ${c.label_name || 'الدعم والواتساب'}: ${c.phone_number}</span>
            <span class="badge bg-danger">مباشر</span>
          </a>
        `).join('');
      }
    } catch (err) {
      console.error("Load Contacts Error:", err);
    }
  }
  
  /**
   * 0.2 جلب وتحميل السلايدر الرئيسي الديناميكي من Supabase
   */
  async function loadDynamicHeroSlider() {
    const sliderInner = document.getElementById("hero-slider-dynamic-inner");
    if (!sliderInner || typeof _supabase === "undefined") return;
  
    try {
      const { data: slides, error } = await _supabase
        .from("hero_slides")
        .select("*")
        .order("display_order", { ascending: true });
  
      if (error || !slides || slides.length === 0) return;
  
      sliderInner.innerHTML = slides.map((slide, index) => {
        const activeClass = index === 0 ? "active" : "";
        const slideLink = slide.target_url || "products.html";
        const slideImg = slide.image_url || "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1600&auto=format&fit=crop";
  
        return `
          <div class="carousel-item ${activeClass}" data-bs-interval="4000">
            <a href="${slideLink}" class="hero-slide-item">
              <img src="${slideImg}" class="d-block w-100" alt="${slide.title || 'ANO Store Slide'}">
            </a>
          </div>
        `;
      }).join("");
    } catch (err) {
      console.error("Load Hero Slider Error:", err);
    }
  }
  
  /**
   * 0.3 جلب منتجات الصفحة الرئيسية وتوزيعها حسب الأقسام
   */
  async function loadHomePageProducts() {
    if (typeof _supabase === "undefined") return;
  
    const containers = {
      'used-phones-container': 'used-phones',
      'new-phones-container': 'new-phones',
      'perfumes-container': 'perfumes',
      'accessories-container': 'airpods'
    };
  
    try {
      const { data: products, error } = await _supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
  
      if (error || !products) return;
  
      Object.keys(containers).forEach(containerId => {
        const el = document.getElementById(containerId);
        if (!el) return;
  
        const category = containers[containerId];
        let filtered = products.filter(p => p.category_slug === category);
  
        // fallback في حال لم تكن المنتجات مصنفة بالـ slug تماماً
        if (filtered.length === 0 && category === 'airpods') {
          filtered = products.filter(p => p.category_slug === 'cases' || p.category_slug === 'chargers' || p.category_slug === 'headphones');
        }
  
        if (filtered.length > 0) {
          el.innerHTML = filtered.slice(0, 6).map(product => createProductCard(product)).join("");
        } else {
          el.innerHTML = `<div class="col-12 text-center text-muted py-3">لا توجد منتجات متوفرة حالياً في هذا القسم.</div>`;
        }
      });
    } catch (err) {
      console.error("Load Home Products Error:", err);
    }
  }
  
  /**
   * 1. التحكم بفتح وإغلاق مربع البحث المتحرك السلس (Animated Overlay Search Bar)
   */
  function initAnimatedSearch() {
    const triggerBtn = document.getElementById("trigger-search-btn");
    const overlay = document.getElementById("animated-search-overlay");
    const closeBtn = document.getElementById("btn-close-search");
    const searchInput = document.getElementById("animated-search-input");
    const submitBtn = document.getElementById("btn-search-submit");
  
    if (!overlay) return;
  
    // فتح البحث
    if (triggerBtn) {
      triggerBtn.addEventListener("click", () => {
        overlay.classList.add("active");
        if (searchInput) {
          setTimeout(() => searchInput.focus(), 200);
        }
      });
    }
  
    // إغلاق البحث
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        overlay.classList.remove("active");
      });
    }
  
    // تنفيذ البحث عند الضغط على Enter
    if (searchInput) {
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          executeSearch(searchInput.value.trim());
        }
      });
    }
  
    // تنفيذ البحث عند الضغط على زر البحث
    if (submitBtn) {
      submitBtn.addEventListener("click", () => {
        if (searchInput) {
          executeSearch(searchInput.value.trim());
        }
      });
    }
  }
  
  function executeSearch(query) {
    if (query) {
      const isLocalServer = window.location.hostname === '127.0.0.1' || 
                            window.location.hostname === 'localhost' || 
                            window.location.protocol === 'file:' ||
                            window.location.pathname.endsWith('.html');
      const targetUrl = isLocalServer 
        ? `products.html?search=${encodeURIComponent(query)}` 
        : `/products?search=${encodeURIComponent(query)}`;
      window.location.href = targetUrl;
    }
  }
  
  /**
   * 2. التحقق الدقيق من جلسة العميل وتحديث الاسم والعناصر الديناميكية
   */
  async function checkUserSession() {
    const userDisplayName = document.getElementById("user-display-name");
    const userActionLink = userDisplayName ? userDisplayName.closest("a") : null;
    const footerUserDisplay = document.getElementById("footer-user-display");
  
    const isLocalServer = window.location.hostname === '127.0.0.1' || 
                          window.location.hostname === 'localhost' || 
                          window.location.protocol === 'file:' ||
                          window.location.pathname.endsWith('.html');
  
    let loggedInUserName = null;
    let isSessionValid = false;
  
    // التحقق الفعلي من جلسة قاعدة البيانات المباشرة
    if (typeof _supabase !== "undefined") {
      try {
        const { data: { session } } = await _supabase.auth.getSession();
        if (session && session.user) {
          loggedInUserName = session.user.user_metadata?.full_name || session.user.email.split("@")[0];
          localStorage.setItem("ano_user_name", loggedInUserName);
          isSessionValid = true;
        } else {
          localStorage.removeItem("ano_user_name");
        }
      } catch (err) {
        console.error("Session Check Error:", err);
      }
    }
  
    // إذا كانت الجلسة نشطة وموثقة
    if (isSessionValid && loggedInUserName && userDisplayName) {
      userDisplayName.innerText = loggedInUserName;
  
      if (userActionLink) {
        userActionLink.href = isLocalServer ? "profile.html" : "/profile";
        userActionLink.title = "عرض الملف الشخصي وتتبع الطلبات";
      }
  
      let logoutBtn = document.getElementById("user-header-logout-btn");
      if (!logoutBtn && userActionLink && userActionLink.parentElement) {
        logoutBtn = document.createElement("button");
        logoutBtn.id = "user-header-logout-btn";
        logoutBtn.className = "btn btn-sm btn-outline-danger rounded-circle ms-1 p-0";
        logoutBtn.style.width = "28px";
        logoutBtn.style.height = "28px";
        logoutBtn.title = "تسجيل الخروج";
        logoutBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket fs-9"></i>';
  
        logoutBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
  
          if (typeof _supabase !== "undefined") {
            await _supabase.auth.signOut();
          }
          localStorage.removeItem("ano_user_name");
  
          Swal.fire({
            icon: 'info',
            title: 'تم تسجيل الخروج',
            timer: 1000,
            showConfirmButton: false
          }).then(() => {
            window.location.href = isLocalServer ? "index.html" : "/";
          });
        });
  
        userActionLink.parentElement.appendChild(logoutBtn);
      }
  
      if (footerUserDisplay) {
        const profilePath = isLocalServer ? "profile.html" : "/profile";
        footerUserDisplay.innerHTML = `<a href="${profilePath}" class="text-danger fw-bold"><i class="fa-regular fa-user me-1"></i>${loggedInUserName} (حسابي)</a>`;
      }
    } else {
      // حالة عدم وجود جلسة توثيق: إعادة زر الهيدر لـ تسجيل الدخول
      if (userDisplayName) {
        userDisplayName.innerText = "تسجيل الدخول";
      }
      if (userActionLink) {
        userActionLink.href = isLocalServer ? "login.html" : "/login";
        userActionLink.title = "تسجيل الدخول أو إنشاء حساب جديد";
      }
  
      const logoutBtn = document.getElementById("user-header-logout-btn");
      if (logoutBtn) {
        logoutBtn.remove();
      }
  
      if (footerUserDisplay) {
        const loginPath = isLocalServer ? "login.html" : "/login";
        const maintPath = isLocalServer ? "maintenance.html" : "/maintenance";
        footerUserDisplay.innerHTML = `
          <a href="${maintPath}">خدمة الصيانة</a>
          <a href="${loginPath}">تسجيل الدخول</a>
        `;
      }
    }
  }
  
  /**
   * 3. تحديث عدد منتجات السلة
   */
  function updateCartCount() {
    const cartBadge = document.getElementById("cart-count");
    const cartItems = JSON.parse(localStorage.getItem("ano_cart") || "[]");
    if (cartBadge) {
      cartBadge.innerText = cartItems.length;
    }
  }
  
  /**
   * 4. إنشاء كارت المنتج الديناميكي بموجه محلي محكم ومضمون
   */
  function createProductCard(product) {
    const price = Number(product.price || 0);
    const oldPrice = product.original_price ? Number(product.original_price) : 0;
    const image = (product.images && product.images[0]) ? product.images[0] : 'https://via.placeholder.com/300x300?text=ANO+Store';
    
    const isLocalServer = window.location.hostname === '127.0.0.1' || 
                          window.location.hostname === 'localhost' || 
                          window.location.protocol === 'file:' || 
                          window.location.pathname.endsWith('.html');
  
    const productLink = isLocalServer
      ? `product-details.html?id=${product.id}`
      : (product.slug ? `/products/${product.slug}` : `/product?id=${product.id}`);
  
    return `
      <div class="col-6 col-md-4 col-lg-3 mb-3">
        <div class="product-card-sm" onclick="window.location.href='${productLink}'" style="cursor: pointer;">
          <div class="img-box">
            <img src="${image}" alt="${product.title}">
          </div>
          
          <div>
            <span class="badge bg-light text-dark border fs-9 mb-1">${product.category_slug || 'المتجر'}</span>
            <div class="title text-truncate" title="${product.title}">${product.title}</div>
            
            <div class="d-flex align-items-center justify-content-between mt-2">
              <span class="price">${price.toLocaleString()} ج.م</span>
              ${oldPrice > price ? `<span class="text-muted text-decoration-line-through fs-9">${oldPrice.toLocaleString()} ج.م</span>` : ''}
            </div>
          </div>
  
          <button class="btn btn-ano-primary btn-sm w-100 mt-2" onclick="event.stopPropagation(); quickAddToCart('${product.id}', '${encodeURIComponent(product.title)}', ${price}, '${image}')">
            <i class="fa-solid fa-cart-plus me-1"></i> أضف للسلة
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * 5. الإضافة السريعة للسلة
   */
  function quickAddToCart(id, encodedTitle, price, image) {
    const title = decodeURIComponent(encodedTitle);
    const cart = JSON.parse(localStorage.getItem("ano_cart") || "[]");
    const existingIndex = cart.findIndex(item => item.id === id);
  
    if (existingIndex > -1) {
      cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + 1;
    } else {
      cart.push({
        id: id,
        title: title,
        price: price,
        image: image,
        quantity: 1
      });
    }
  
    localStorage.setItem("ano_cart", JSON.stringify(cart));
    updateCartCount();
  
    Swal.fire({
      icon: 'success',
      title: 'تمت الإضافة إلى عربة التسوق!',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 1500
    });
  }