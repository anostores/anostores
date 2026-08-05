/* ==========================================================================
   ANO Store - Main JavaScript Engine
   Handles Navbar, Animated Search Overlay, User Sessions, and Cart Counters
   ========================================================================== */

   document.addEventListener("DOMContentLoaded", async () => {
    initAnimatedSearch();
    await checkUserSession();
    updateCartCount();
  });
  
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
      window.location.href = `/products?search=${encodeURIComponent(query)}`;
    }
  }
  
  /**
   * 2. التحقق من جلسة العميل وتحديث الاسم والعناصر الديناميكية
   */
  async function checkUserSession() {
    const userDisplayName = document.getElementById("user-display-name");
    const userActionLink = userDisplayName ? userDisplayName.closest("a") : null;
    const footerUserDisplay = document.getElementById("footer-user-display");
  
    let loggedInUserName = localStorage.getItem("ano_user_name");
  
    // التحقق من جلسة Supabase Auth
    if (typeof _supabase !== "undefined") {
      try {
        const { data: { session } } = await _supabase.auth.getSession();
        if (session && session.user) {
          loggedInUserName = session.user.user_metadata?.full_name || session.user.email.split("@")[0];
          localStorage.setItem("ano_user_name", loggedInUserName);
        }
      } catch (err) {
        console.error("Session Check Error:", err);
      }
    }
  
    // تحديث بيانات المستخدم المظهرية إذا كان مسجلاً
    if (loggedInUserName && userDisplayName) {
      userDisplayName.innerText = loggedInUserName;
  
      if (userActionLink) {
        userActionLink.href = "/profile";
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
            window.location.href = "/";
          });
        });
  
        userActionLink.parentElement.appendChild(logoutBtn);
      }
  
      if (footerUserDisplay) {
        footerUserDisplay.innerHTML = `<a href="/profile" class="text-danger fw-bold"><i class="fa-regular fa-user me-1"></i>${loggedInUserName} (حسابي)</a>`;
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
   * 4. إنشاء كارت المنتج الديناميكي بدعم الـ Slugs الشفافة
   */
  function createProductCard(product) {
    const price = Number(product.price || 0);
    const oldPrice = product.original_price ? Number(product.original_price) : 0;
    const image = (product.images && product.images[0]) ? product.images[0] : 'https://via.placeholder.com/300x300?text=ANO+Store';
    const productLink = product.slug ? `/products/${product.slug}` : `/product?id=${product.id}`;
  
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