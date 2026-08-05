/* ==========================================================================
   ANO Store - Product Details, Advanced Specs, Hover Zoom & Lightbox Engine
   Hybrid Guaranteed Query Engine (ID & Slug Support)
   ========================================================================== */

   let currentProduct = null;
   let selectedQuantity = 1;
   
   document.addEventListener("DOMContentLoaded", async () => {
     const urlParams = new URLSearchParams(window.location.search);
     const pathSegments = window.location.pathname.split("/").filter(Boolean);
     
     let productIdentifier = urlParams.get("id") || urlParams.get("slug");
   
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
   
   /* 1. جلب بيانات المنتج والمواصفات المتقدمة من قاعدة البيانات */
   async function loadProductDetails(identifier) {
     const container = document.getElementById("product-details-container");
     const breadcrumbTitle = document.getElementById("product-breadcrumb-title");
     const specsWrapper = document.getElementById("product-advanced-specs-wrapper");
     const specsTbody = document.getElementById("product-advanced-specs-tbody");
   
     try {
       let product = null;
   
       const { data: idData } = await _supabase
         .from("products")
         .select("*")
         .eq("id", identifier)
         .maybeSingle();
   
       if (idData) {
         product = idData;
       } else {
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
   
       // 1.1 بناء وعرض المواصفات الفنية المتقدمة بالحاوية المستقلة تحت المعرض
       const specs = product.advanced_specs || product.specs || {};
       let specsKeys = [];
       if (typeof specs === 'object' && specs !== null) {
         specsKeys = Object.keys(specs);
       }
   
       if (specsWrapper && specsTbody) {
         if (specsKeys.length > 0) {
           specsTbody.innerHTML = specsKeys.map(k => `
             <tr>
               <td class="fw-bold text-dark bg-light" style="width: 35%;">${k}</td>
               <td class="text-secondary fw-bold">${specs[k]}</td>
             </tr>
           `).join("");
           specsWrapper.classList.remove("d-none");
         } else {
           specsWrapper.classList.add("d-none");
         }
       }
   
       // 1.2 بناء واجهة كارت تفاصيل المنتج
       container.innerHTML = `
         <!-- المعرض والصورة الرئيسية مع التكبير عند التمرير وزر Lightbox -->
         <div class="col-lg-6">
           <div class="card border-0 shadow-sm rounded-4 p-3 bg-white text-center">
             <div class="position-relative overflow-hidden rounded-3 cursor-zoom" id="img-zoom-container" style="max-height: 420px;">
               ${discountPercent > 0 ? `<span class="badge bg-danger position-absolute top-0 start-0 m-2 px-3 py-2 rounded-pill fs-9" style="z-index: 10;">خصم ${discountPercent}%</span>` : ''}
               
               <button class="btn btn-sm btn-dark bg-opacity-75 position-absolute top-0 end-0 m-2 rounded-circle" style="z-index: 10; width:36px; height:36px;" onclick="openProductLightbox()" title="تكبير الصورة الفوري">
                 <i class="fa-solid fa-expand fs-9"></i>
               </button>
   
               <img id="main-product-img" src="${mainImg}" class="img-fluid rounded-3 object-fit-contain w-100" style="max-height: 420px; transition: transform 0.1s ease-out; transform-origin: center center;">
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
   
       // تفعيل التكبير عند التمرير بالماوس
       initImageZoomEngine();
   
       // جلب التقييمات فور الانتهاء
       await loadProductReviews(product.id);
   
     } catch (err) {
       console.error("Load Product Error:", err);
       showProductNotFound();
     }
   }
   
   /* محرك نافذة الـ Lightbox المكبرة للصور */
   function openProductLightbox() {
     if (!currentProduct) return;
   
     const titleEl = document.getElementById("lightbox-product-title");
     const mainImgEl = document.getElementById("lightbox-main-img");
     const thumbsWrapper = document.getElementById("lightbox-thumbs-wrapper");
   
     if (titleEl) titleEl.innerText = currentProduct.title;
     
     const images = currentProduct.images && currentProduct.images.length > 0 
       ? currentProduct.images 
       : ["https://via.placeholder.com/500x500?text=ANO+Store"];
   
     if (mainImgEl) mainImgEl.src = images[0];
   
     if (thumbsWrapper) {
       if (images.length > 1) {
         thumbsWrapper.innerHTML = images.map((img, idx) => `
           <img src="${img}" class="img-thumbnail rounded-3 cursor-pointer ${idx === 0 ? 'border-danger' : ''}" style="width: 55px; height: 55px; object-fit: contain; background: #fff;" onclick="changeLightboxMainImage('${img}', this)">
         `).join('');
       } else {
         thumbsWrapper.innerHTML = '';
       }
     }
   
     const lightboxModal = new bootstrap.Modal(document.getElementById('productLightboxModal'));
     lightboxModal.show();
   }
   
   function changeLightboxMainImage(src, thumbEl) {
     const mainImg = document.getElementById("lightbox-main-img");
     if (mainImg) mainImg.src = src;
     document.querySelectorAll("#lightbox-thumbs-wrapper .img-thumbnail").forEach(el => el.classList.remove("border-danger"));
     if (thumbEl) thumbEl.classList.add("border-danger");
   }
   
   /* محرك تكبير الصورة مع حركة الماوس */
   function initImageZoomEngine() {
     const container = document.getElementById("img-zoom-container");
     const img = document.getElementById("main-product-img");
   
     if (!container || !img) return;
   
     container.addEventListener("mousemove", (e) => {
       const rect = container.getBoundingClientRect();
       const x = ((e.clientX - rect.left) / rect.width) * 100;
       const y = ((e.clientY - rect.top) / rect.height) * 100;
   
       img.style.transformOrigin = `${x}% ${y}%`;
       img.style.transform = "scale(2.2)";
     });
   
     container.addEventListener("mouseleave", () => {
       img.style.transformOrigin = "center center";
       img.style.transform = "scale(1)";
     });
   }
   
   function changeMainImage(src, thumbEl) {
     const mainImg = document.getElementById("main-product-img");
     if (mainImg) mainImg.src = src;
     document.querySelectorAll("#product-details-container .img-thumbnail").forEach(el => el.classList.remove("border-danger"));
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
   
   /* 3. جلب المراجعات وإتاحة زر التقييم بشرط الشراء السابق */
   async function loadProductReviews(productId) {
     const reviewsContainer = document.getElementById("product-reviews-list");
     const reviewsCountBadge = document.getElementById("reviews-count-badge");
     const reviewActionBox = document.getElementById("add-review-action-box");
   
     try {
       const { data: reviews, error } = await _supabase
         .from("product_reviews")
         .select("*")
         .eq("product_id", productId.toString())
         .order("created_at", { ascending: false });
   
       if (error) throw error;
   
       if (reviewsCountBadge) {
         reviewsCountBadge.innerText = `${reviews ? reviews.length : 0} تقييمات`;
       }
   
       if (reviewActionBox) {
         reviewActionBox.innerHTML = `
           <button class="btn btn-sm btn-outline-danger rounded-pill fw-bold" onclick="attemptAddReview('${productId}')">
             <i class="fa-solid fa-pen-to-square me-1"></i> أضف تقييمك للمنتج
           </button>
         `;
       }
   
       if (!reviews || reviews.length === 0) {
         if (reviewsContainer) {
           reviewsContainer.innerHTML = '<p class="text-muted small text-center py-3">لا توجد تقييمات لهذا المنتج بعد. التقييمات متاحة للعملاء بعد إتمام الشراء.</p>';
         }
         return;
       }
   
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
   
   /* التحقق من شراء العميل للمنتج قبل فتح نافذة كتابة التقييم */
   async function attemptAddReview(productId) {
     const { data: { session } } = await _supabase.auth.getSession();
   
     if (!session || !session.user) {
       Swal.fire({
         icon: 'info',
         title: 'يرجى تسجيل الدخول أولاً',
         text: 'يجب تسجيل الدخول في المتجر للتحقق من الشراء ولإضافة تقييمك.',
         confirmButtonColor: '#e60023'
       });
       return;
     }
   
     const userEmail = session.user.email;
   
     // التحقق من وجود طلب مكتمل ومسلم لهذا العميل يحتوي على هذا المنتج
     const { data: orders } = await _supabase
       .from("orders")
       .select("*")
       .eq("client_email", userEmail);
   
     let hasPurchased = false;
     if (orders && orders.length > 0) {
       for (let o of orders) {
         const items = o.items || [];
         if (items.some(i => i.id.toString() === productId.toString())) {
           hasPurchased = true;
           break;
         }
       }
     }
   
     if (!hasPurchased) {
       Swal.fire({
         icon: 'warning',
         title: 'خاصية مخصصة للمشترين',
         text: 'عفواً، يمكنك تقييم هذا المنتج فقط بعد إتمام عملية شرائه واستلامه بنجاح!',
         confirmButtonColor: '#e60023'
       });
       return;
     }
   
     openProductReviewModal(productId, session.user.id, session.user.user_metadata?.full_name || userEmail.split('@')[0]);
   }
   
   async function openProductReviewModal(productId, userId, userName) {
     const { value: formValues } = await Swal.fire({
       title: `إضافة تقييم ورأي`,
       html: `
         <div class="text-start mb-3">
           <label class="form-label fw-bold small text-dark mb-1">حدد التقييم من 1 إلى 5 نجوم:</label>
           <select id="swal-rating" class="form-select form-select-sm fw-bold">
             <option value="5">⭐⭐⭐⭐⭐ (5/5) ممتاز جداً</option>
             <option value="4">⭐⭐⭐⭐ (4/5) جيد جداً</option>
             <option value="3">⭐⭐⭐ (3/5) متوسط</option>
             <option value="2">⭐⭐ (2/5) مقبول</option>
             <option value="1">⭐ (1/5) سيء</option>
           </select>
         </div>
         <div class="text-start mb-2">
           <label class="form-label fw-bold small text-dark mb-1">اكتب تعليقك وتجربتك للمنتج:</label>
           <textarea id="swal-comment" class="form-control form-control-sm" rows="3" placeholder="اكتب رأيك بصراحة..."></textarea>
         </div>
       `,
       showCancelButton: true,
       confirmButtonColor: '#e60023',
       confirmButtonText: 'إرسال التقييم',
       cancelButtonText: 'إلغاء',
       preConfirm: () => {
         const rating = document.getElementById('swal-rating').value;
         const comment = document.getElementById('swal-comment').value.trim();
   
         if (!comment) {
           Swal.showValidationMessage('يرجى كتابة تعليق ورأيك بالمنتج!');
           return false;
         }
         return { rating: Number(rating), comment: comment };
       }
     });
   
     if (formValues) {
       try {
         await _supabase.from("product_reviews").insert([{
           product_id: productId.toString(),
           user_id: userId,
           user_name: userName,
           rating: formValues.rating,
           comment: formValues.comment
         }]);
   
         Swal.fire({
           icon: 'success',
           title: 'شكراً لتقييمك!',
           text: 'تم حفظ ونشر تقييمك بنجاح.',
           confirmButtonColor: '#e60023'
         });
         loadProductReviews(productId);
       } catch (err) {
         Swal.fire({
           icon: 'error',
           title: 'فشل حفظ التقييم',
           text: 'تعذر الاتصال بقاعدة البيانات.',
           confirmButtonColor: '#e60023'
         });
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