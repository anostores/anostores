/* ================= ==========================
   ANO Store - Main JavaScript File
   Handles Search, User Session, Cart, and Global Product Cards
   ========================================== */

   document.addEventListener("DOMContentLoaded", async () => {
    initSearchExpansion();
    await checkUserSession();
    updateCartCount();
  });
  
  /**
   * 1. التحكم بفاعلية السيرش بار والتفتيش
   */
  function initSearchExpansion() {
    const searchInput = document.getElementById("main-search-input");
    const searchBtn = document.getElementById("main-search-btn");
  
    if (!searchInput) return;
  
    // عند الضغط على Enter في خانة البحث
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        executeSearch();
      }
    });
  
    // عند الضغط على أيقونة البحث
    if (searchBtn) {
      searchBtn.addEventListener("click", () => {
        executeSearch();
      });
    }
  }
  
  function executeSearch() {
    const searchInput = document.getElementById("main-search-input");
    const query = searchInput ? searchInput.value.trim() : "";
    if (query) {
      window.location.href = `products?search=${encodeURIComponent(query)}`;
    }
  }
  
  /**
   * 2. التحقق من حالة العميل والعرض الديناميكي لاسم صاحب الحساب والبروفايل
   */
  async function checkUserSession() {
    const userDisplayName = document.getElementById("user-display-name");
    const userActionLink = userDisplayName ? userDisplayName.closest("a") : null;
    const footerUserDisplay = document.getElementById("footer-user-display");
  
    let loggedInUserName = localStorage.getItem("ano_user_name");
    let currentUser = null;
  
    // التحقق من جلسة Supabase إذا كانت المكتبة معرفة
    if (typeof _supabase !== "undefined") {
      const { data: { session } } = await _supabase.auth.getSession();
      if (session && session.user) {
        currentUser = session.user;
        loggedInUserName = currentUser.user_metadata?.full_name || currentUser.email.split("@")[0];
        localStorage.setItem("ano_user_name", loggedInUserName);
      }
    }
  
    // إذا كان العميل مسجل دخول بالفعل
    if (loggedInUserName && userDisplayName) {
      userDisplayName.innerText = loggedInUserName;
  
      // توجيه الزرار عند الضغط على الاسم إلى صفحة البروفايل
      if (userActionLink) {
        userActionLink.href = "profile";
        userActionLink.title = "عرض الملف الشخصي وتتبع الطلبات";
      }
  
      // إضافة زر تسجيل الخروج بجانب الاسم إذا لم يكن موجوداً
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
  
      // تحديث الاسم في الفوتر السفلي وتوجيهه للبروفايل
      if (footerUserDisplay) {
        footerUserDisplay.innerHTML = `<a href="profile" class="text-danger fw-bold"><i class="fa-regular fa-user me-1"></i>${loggedInUserName} (حسابي)</a>`;
      }
    }
  }
  
  /**
   * 3. تحديث عدد المنتجات في عربة التسوق
   */
  function updateCartCount() {
    const cartBadge = document.getElementById("cart-count");
    const cartItems = JSON.parse(localStorage.getItem("ano_cart") || "[]");
    if (cartBadge) {
      cartBadge.innerText = cartItems.length;
    }
  }
  
  /**
   * 4. إنشاء وتنسيق كارت المنتج الديناميكي المحوّل لصفحة التفاصيل
   */
  function createProductCard(product) {
    const price = Number(product.price || 0);
    const oldPrice = product.original_price ? Number(product.original_price) : 0;
    const image = (product.images && product.images[0]) ? product.images[0] : 'https://via.placeholder.com/300x300?text=ANO+Store';
  
    return `
      <div class="col-6 col-md-4 col-lg-3 mb-3">
        <div class="card product-card h-100 border-0 shadow-sm rounded-3 overflow-hidden position-relative bg-white" style="cursor: pointer;" onclick="window.location.href='product?id=${product.id}'">
          
          <div class="product-img-wrapper text-center p-3">
            <img src="${image}" class="img-fluid rounded-2 object-fit-contain" alt="${product.title}" style="height: 180px; width: 100%;">
          </div>
          
          <div class="card-body p-2 p-md-3 text-start">
            <span class="badge bg-light text-dark border fs-9 mb-1">${product.category_slug || 'المتجر'}</span>
            <h6 class="fw-bold fs-7 text-truncate mb-2 text-dark" title="${product.title}">${product.title}</h6>
            
            <div class="d-flex align-items-center justify-content-between">
              <span class="fw-bold text-danger fs-6">${price.toLocaleString()} ج.م</span>
              ${oldPrice > price ? `<span class="text-muted text-decoration-line-through fs-9">${oldPrice.toLocaleString()} ج.م</span>` : ''}
            </div>
          </div>
  
          <div class="card-footer bg-white border-0 p-2">
            <button class="btn btn-sm btn-outline-danger w-100 fw-bold rounded-pill" onclick="event.stopPropagation(); quickAddToCart('${product.id}', '${encodeURIComponent(product.title)}', ${price}, '${image}')">
              <i class="fa-solid fa-cart-plus me-1"></i> أضف للسلة
            </button>
          </div>
  
        </div>
      </div>
    `;
  }
  
  /**
   * 5. الإضافة السريعة للسلة من الكارت المباشر
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