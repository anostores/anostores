/* ==========================================================================
   ANO Store - Product Details & Reviews Engine
   Hybrid Guaranteed Query Engine (ID & Slug Support)
   ========================================================================== */

   let currentProduct = null;
   let selectedQuantity = 1;
   
   document.addEventListener("DOMContentLoaded", async () => {
     const urlParams = new URLSearchParams(window.location.search);
     const pathSegments = window.location.pathname.split("/").filter(Boolean);
     
     // 1. القراءة المباشرة للـ ID أو الـ Slug من معلمات الـ URL أولاً (تضمن العمل على Live Server)
     let productIdentifier = urlParams.get("id") || urlParams.get("slug");
   
     // 2. إذا لم يجد معلمة في URL، يفحص المسارات النظيفة (على Vercel)
     if (!productIdentifier && pathSegments.length > 0) {
       const lastSegment = pathSegments[pathSegments.length - 1];
       if (lastSegment && !lastSegment.includes(".html")) {
         productIdentifier = decodeURIComponent(lastSegment);
       }
     }
   
     if (!productIdentifier) {
       showProductNotFound();
       return;
     }
   
     await loadProductDetails(productIdentifier);
   });
   
   /* 1. جلب بيانات المنتج من Supabase (دعم مضمون بـ ID أو Slug) */
   async function loadProductDetails(identifier) {
     const container = document.getElementById("product-details-container");
     const breadcrumbTitle = document.getElementById("product-breadcrumb-title");
   
     try {
       let product = null;
   
       // 1. المحاولة الأولى: الاستعلام بـ ID (الأنسب والأسرع على السيرفر المحلي)
       const { data: idData } = await _supabase
         .from("products")
         .select("*")
         .eq("id", identifier)
         .maybeSingle();
   
       if (idData) {
         product = idData;
       } else {
         // 2. المحاولة الثانية: الاستعلام بـ Slug إذا لم يكن المعرف عبارة عن ID
         const { data: slugData } = await _supabase
           .from("products")
           .select("*")
           .eq("slug", identifier)
           .maybeSingle();
   
         if (slugData) product = slugData;
       }
   
       if (!product) {
         showProductNotFound();
         return;
       }
   
       currentProduct = product;
       if (breadcrumbTitle) breadcrumbTitle.innerText = product.title;
   
       const images = product.images && product.images.length > 0 ? product.images : ["https://via.placeholder.com/500x500?text=ANO+Store"];
       const mainImg = images[0];
   
       const price = Number(product.price || 0);
       const oldPrice = product.original_price ? Number(product.original_price) : 0;
       const discountPercent = oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
   
       container.innerHTML = `
         <!-- المعرض والصورة الرئيسية -->
         <div class="col-lg-6">
           <div class="card border-0 shadow-sm rounded-4 p-3 bg-white text-center">
             <div class="position-relative">
               ${discountPercent > 0 ? `<span class="badge bg-danger position-absolute top-0 start-0 m-2 px-3 py-2 rounded-pill fs-9">خصم ${discountPercent}%</span>` : ''}
               <img id="main-product-img" src="${mainImg}" class="img-fluid rounded-3 object-fit-contain" style="max-height: 420px; width: 100%;">
             </div>
             ${images.length > 1 ? `
               <div class="d-flex justify-content-center gap-2 mt-3 overflow-auto">
                 ${images.map((img, idx) => `
                   <img src="${img}" class="img-thumbnail rounded-3 cursor-pointer ${idx === 0 ? 'border-danger' : ''}" style="width: 65px; height: 65px; object-fit: contain;" onclick="changeMainImage('${img}', this)">
                 `).join('')}
               </div>
             ` : ''}
           </div>
         </div>
   
         <!-- تفاصيل المنتج وأزرار الشراء -->
         <div class="col-lg-6">
           <div class="card border-0 shadow-sm rounded-4 p-4 bg-white h-100 d-flex flex-column justify-content-between">
             <div>
               <div class="d-flex align-items-center gap-2 mb-2">
                 <span class="badge bg-light text-dark border fs-9">${product.category_slug || 'المتجر'}</span>
                 <span class="badge ${product.stock_status === 'out_of_stock' ? 'bg-secondary' : 'bg-success'} fs-9">
                   ${product.stock_status === 'out_of_stock' ? 'غير متوفر حالياً' : 'متوفر بالمخزن'}
                 </span>
               </div>
   
               <h4 class="fw-bold text-dark mb-3">${product.title}</h4>
   
               <div class="d-flex align-items-baseline gap-3 mb-3">
                 <span class="fw-bold fs-3 text-danger">${price.toLocaleString()} ج.م</span>
                 ${oldPrice > price ? `<span class="text-muted text-decoration-line-through fs-6">${oldPrice.toLocaleString()} ج.م</span>` : ''}
               </div>
   
               <p class="text-secondary small leading-relaxed mb-4" style="line-height: 1.8;">
                 ${product.description || 'منتج عالي الجودة مضمون 100% من متجر ANO Store مع ضمان الاستبدال والتوصيل السريع.'}
               </p>
   
               <!-- اختيار الكمية -->
               <div class="mb-4">
                 <label class="form-label fw-bold small text-dark">الكمية المطلوبة:</label>
                 <div class="input-group input-group-sm" style="width: 130px;">
                   <button class="btn btn-outline-secondary fw-bold" type="button" onclick="updateQty(-1)">-</button>
                   <input type="text" id="qty-input" class="form-control text-center fw-bold bg-white" value="1" readonly>
                   <button class="btn btn-outline-secondary fw-bold" type="button" onclick="updateQty(1)">+</button>
                 </div>
               </div>
             </div>
   
             <!-- أزرار الإضافة للسلة والشراء المباشر -->
             <div class="d-flex flex-column flex-sm-row gap-2 mt-3">
               <button class="btn btn-danger btn-lg flex-grow-1 fw-bold rounded-pill shadow-sm py-2 fs-6" onclick="addToCartHandler(true)">
                 <i class="fa-solid fa-cart-plus me-1"></i> إضافة إلى السلة
               </button>
               <button class="btn btn-dark btn-lg flex-grow-1 fw-bold rounded-pill py-2 fs-6" onclick="buyNowHandler()">
                 <i class="fa-solid fa-bolt me-1"></i> شراء الآن
               </button>
             </div>
           </div>
         </div>
       `;
   
       // جلب التقييمات فور الانتهاء من عرض بيانات المنتج
       await loadProductReviews(product.id);
   
     } catch (err) {
       console.error("Load Product Error:", err);
       showProductNotFound();
     }
   }
   
   function changeMainImage(src, thumbEl) {
     document.getElementById("main-product-img").src = src;
     document.querySelectorAll(".img-thumbnail").forEach(el => el.classList.remove("border-danger"));
     if (thumbEl) thumbEl.classList.add("border-danger");
   }
   
   function updateQty(change) {
     selectedQuantity = Math.max(1, selectedQuantity + change);
     const input = document.getElementById("qty-input");
     if (input) input.value = selectedQuantity;
   }
   
   /* 2. إضافة المنتج للسلة */
   function addToCartHandler(showToast = true) {
     if (!currentProduct) return;
   
     const cart = JSON.parse(localStorage.getItem("ano_cart") || "[]");
     const existingIndex = cart.findIndex(item => item.id === currentProduct.id);
   
     if (existingIndex > -1) {
       cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + selectedQuantity;
     } else {
       cart.push({
         id: currentProduct.id,
         title: currentProduct.title,
         price: currentProduct.price,
         image: currentProduct.images && currentProduct.images[0] ? currentProduct.images[0] : '',
         quantity: selectedQuantity
       });
     }
   
     localStorage.setItem("ano_cart", JSON.stringify(cart));
     if (typeof updateCartCount === "function") updateCartCount();
   
     if (showToast) {
       Swal.fire({
         icon: 'success',
         title: 'تمت الإضافة للسلة بنجاح!',
         toast: true,
         position: 'top-end',
         showConfirmButton: false,
         timer: 1500
       });
     }
   }
   
   function buyNowHandler() {
     addToCartHandler(false);
     const isLocalOrGithub = window.location.protocol === 'file:' || 
                             window.location.pathname.endsWith('.html') || 
                             window.location.hostname.includes('github.io');
     window.location.href = isLocalOrGithub ? "cart.html" : "/cart";
   }
   
   /* 3. جلب التقييمات الخاصة بالمنتج */
   async function loadProductReviews(productId) {
     const reviewsContainer = document.getElementById("product-reviews-list");
     const reviewsCountBadge = document.getElementById("reviews-count-badge");
   
     try {
       const { data: reviews, error } = await _supabase
         .from("product_reviews")
         .select("*")
         .eq("product_id", productId.toString())
         .order("created_at", { ascending: false });
   
       if (error) throw error;
   
       if (!reviews || reviews.length === 0) {
         if (reviewsCountBadge) reviewsCountBadge.innerText = "0 تقييمات";
         if (reviewsContainer) {
           reviewsContainer.innerHTML = '<p class="text-muted small text-center py-3">لا توجد تقييمات لهذا المنتج بعد. كن أول من يقيّمه بعد الشراء!</p>';
         }
         return;
       }
   
       if (reviewsCountBadge) reviewsCountBadge.innerText = `${reviews.length} تقييمات`;
   
       reviewsContainer.innerHTML = reviews.map(r => `
         <div class="border-bottom py-3">
           <div class="d-flex justify-content-between align-items-center mb-1">
             <strong class="small text-dark"><i class="fa-regular fa-circle-user me-1 text-danger"></i>${r.user_name || 'عميل ANO Store'}</strong>
             <span class="text-warning fs-9">${'⭐'.repeat(r.rating || 5)}</span>
           </div>
           <p class="small text-secondary m-0 leading-relaxed">${r.comment || ''}</p>
           <span class="text-muted fs-9 d-block mt-1">${new Date(r.created_at).toLocaleDateString('ar-EG')}</span>
         </div>
       `).join("");
   
     } catch (err) {
       if (reviewsContainer) {
         reviewsContainer.innerHTML = '<p class="text-muted small text-center py-3">تعذر تحميل التقييمات.</p>';
       }
     }
   }
   
   function showProductNotFound() {
     const container = document.getElementById("product-details-container");
     if (container) {
       const isLocalOrGithub = window.location.protocol === 'file:' || 
                               window.location.pathname.endsWith('.html') || 
                               window.location.hostname.includes('github.io');
       const homePath = isLocalOrGithub ? "index.html" : "/";
       container.innerHTML = `
         <div class="col-12 text-center py-5">
           <i class="fa-solid fa-box-open fa-3x text-secondary mb-3 d-block opacity-50"></i>
           <h5 class="fw-bold">المنتج غير موجود أو تم حذفه</h5>
           <a href="${homePath}" class="btn btn-sm btn-danger rounded-pill mt-2">العودة للرئيسية</a>
         </div>
       `;
     }
   }