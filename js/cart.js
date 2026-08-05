/* ==========================================
   ANO Store - Cart & Checkout Engine
   Hybrid Local & Production Routing with Strict Login Barrier
   ========================================== */

   let currentCart = [];
   let uploadedReceiptBase64 = null;
   
   document.addEventListener("DOMContentLoaded", async () => {
     loadCartItems();
     await autoFillUserData();
     initPaymentMethodListener();
   
     const checkoutForm = document.getElementById("checkout-form");
     if (checkoutForm) {
       checkoutForm.addEventListener("submit", handleCheckoutSubmit);
     }
   });
   
   function loadCartItems() {
     currentCart = JSON.parse(localStorage.getItem("ano_cart") || "[]");
     const tbody = document.getElementById("cart-items-tbody");
     const subtotalEl = document.getElementById("cart-subtotal");
     const totalEl = document.getElementById("cart-total");
   
     if (!tbody) return;
   
     const isLocalOrGithub = window.location.protocol === 'file:' || 
                             window.location.pathname.endsWith('.html') || 
                             window.location.hostname.includes('github.io');
     const homePath = isLocalOrGithub ? "index.html" : "/";
   
     if (currentCart.length === 0) {
       tbody.innerHTML = `
         <tr>
           <td colspan="5" class="text-center py-5 text-muted">
             <i class="fa-solid fa-basket-shopping fa-3x text-secondary mb-3 d-block opacity-50"></i>
             <h6 class="fw-bold">عربة التسوق فارغة حالياً</h6>
             <a href="${homePath}" class="btn btn-sm btn-danger rounded-pill mt-2">تصفح المنتجات والتسوق الآن</a>
           </td>
         </tr>
       `;
       if (subtotalEl) subtotalEl.innerText = "0 ج.م";
       if (totalEl) totalEl.innerText = "0 ج.م";
       return;
     }
   
     let totalSum = 0;
   
     tbody.innerHTML = currentCart.map((item, index) => {
       const itemQty = item.quantity || 1;
       const itemTotal = Number(item.price) * itemQty;
       totalSum += itemTotal;
   
       return `
         <tr>
           <td>
             <div class="d-flex align-items-center gap-2">
               <img src="${item.image || 'https://via.placeholder.com/50'}" style="width: 45px; height: 45px; object-fit: contain;">
               <span class="fw-bold text-dark d-inline-block text-truncate" style="max-width: 180px;">${item.title}</span>
             </div>
           </td>
           <td class="fw-bold text-danger">${Number(item.price).toLocaleString()} ج.م</td>
           <td>
             <div class="input-group input-group-sm" style="width: 100px;">
               <button class="btn btn-outline-secondary" type="button" onclick="updateItemQuantity(${index}, -1)">-</button>
               <input type="text" class="form-control text-center fw-bold bg-white" value="${itemQty}" readonly>
               <button class="btn btn-outline-secondary" type="button" onclick="updateItemQuantity(${index}, 1)">+</button>
             </div>
           </td>
           <td class="fw-bold text-danger">${itemTotal.toLocaleString()} ج.م</td>
           <td>
             <button class="btn btn-sm text-secondary" type="button" onclick="removeCartItem(${index})">
               <i class="fa-solid fa-trash text-danger"></i>
             </button>
           </td>
         </tr>
       `;
     }).join("");
   
     if (subtotalEl) subtotalEl.innerText = `${totalSum.toLocaleString()} ج.م`;
     if (totalEl) totalEl.innerText = `${totalSum.toLocaleString()} ج.م`;
   }
   
   function updateItemQuantity(index, change) {
     if (currentCart[index]) {
       currentCart[index].quantity = (currentCart[index].quantity || 1) + change;
       if (currentCart[index].quantity <= 0) currentCart.splice(index, 1);
       localStorage.setItem("ano_cart", JSON.stringify(currentCart));
       loadCartItems();
       if (typeof updateCartCount === "function") updateCartCount();
     }
   }
   
   function removeCartItem(index) {
     currentCart.splice(index, 1);
     localStorage.setItem("ano_cart", JSON.stringify(currentCart));
     loadCartItems();
     if (typeof updateCartCount === "function") updateCartCount();
   }
   
   async function autoFillUserData() {
     if (typeof _supabase === "undefined") return;
   
     const { data: { session } } = await _supabase.auth.getSession();
     if (session && session.user) {
       const { data: profiles } = await _supabase.from("user_profiles").select("*").eq("id", session.user.id);
       const profile = profiles && profiles.length > 0 ? profiles[0] : null;
   
       const nameInput = document.getElementById("order-name");
       const phoneInput = document.getElementById("order-phone");
       const addressInput = document.getElementById("order-address");
   
       if (nameInput) nameInput.value = profile?.full_name || session.user.user_metadata?.full_name || "";
       if (phoneInput) phoneInput.value = profile?.phone || session.user.user_metadata?.phone || "";
       if (addressInput) addressInput.value = profile?.address || "";
     }
   }
   
   function initPaymentMethodListener() {
     const methodSelect = document.getElementById("order-payment-method");
     const branchContainer = document.getElementById("branch-select-container");
     const detailsBox = document.getElementById("payment-details-box");
     const instructionsTitle = document.getElementById("payment-instructions-title");
     const instructionsText = document.getElementById("payment-instructions-text");
     const uploadContainer = document.getElementById("receipt-upload-container");
     const receiptFileInput = document.getElementById("receipt-file-input");
   
     if (!methodSelect) return;
   
     methodSelect.addEventListener("change", () => {
       const method = methodSelect.value;
   
       if (method === "branch_pickup") {
         if (branchContainer) branchContainer.classList.remove("d-none");
         if (detailsBox) detailsBox.classList.add("d-none");
         if (uploadContainer) uploadContainer.classList.add("d-none");
         if (receiptFileInput) receiptFileInput.required = false;
       } else if (method === "cod") {
         if (branchContainer) branchContainer.classList.add("d-none");
         if (detailsBox) detailsBox.classList.add("d-none");
         if (uploadContainer) uploadContainer.classList.add("d-none");
         if (receiptFileInput) receiptFileInput.required = false;
       } else {
         if (branchContainer) branchContainer.classList.add("d-none");
         if (detailsBox) detailsBox.classList.remove("d-none");
         if (uploadContainer) uploadContainer.classList.remove("d-none");
         if (receiptFileInput) receiptFileInput.required = true;
   
         switch (method) {
           case "instapay":
             instructionsTitle.innerText = "حساب InstaPay للتحويل:";
             instructionsText.innerText = "يرجى التحويل على معرف انستا باي: anostore@instapay أو الرقم 01111757936.";
             break;
           case "vodafone_cash":
             instructionsTitle.innerText = "محفظة فودافون كاش للتحويل:";
             instructionsText.innerText = "يرجى تحويل المبلغ إلى الرقم (01115141122).";
             break;
           case "etisalat_cash":
             instructionsTitle.innerText = "محفظة اتصالات كاش للتحويل:";
             instructionsText.innerText = "يرجى تحويل المبلغ إلى الرقم (01111610098).";
             break;
           case "fawry":
             instructionsTitle.innerText = "الدفع عبر فوري باي (Fawry):";
             instructionsText.innerText = "قم بالتحويل بكود فوري (99900).";
             break;
         }
       }
     });
   
     if (receiptFileInput) {
       receiptFileInput.addEventListener("change", (e) => {
         const file = e.target.files[0];
         if (file) {
           const reader = new FileReader();
           reader.onload = (evt) => { uploadedReceiptBase64 = evt.target.result; };
           reader.readAsDataURL(file);
         }
       });
     }
   }
   
   async function handleCheckoutSubmit(e) {
     e.preventDefault();
   
     if (currentCart.length === 0) {
       Swal.fire({ icon: 'warning', title: 'السلة فارغة!', text: 'أضف منتجات أولاً.', confirmButtonColor: '#e60023' });
       return;
     }
   
     // 🔒 فحص إلزام تسجيل الدخول الشديد قبل التنفيذ
     let clientEmail = "";
     const { data: { session } } = await _supabase.auth.getSession();
   
     const isLocalOrGithub = window.location.protocol === 'file:' || 
                             window.location.pathname.endsWith('.html') || 
                             window.location.hostname.includes('github.io');
     const loginPath = isLocalOrGithub ? "login.html" : "/login";
   
     if (!session || !session.user) {
       Swal.fire({
         title: 'تسجيل الدخول مطلوب!',
         html: `
           <div class="text-center py-2">
             <div class="d-inline-flex align-items-center justify-content-center bg-danger bg-opacity-10 text-danger rounded-circle p-3 mb-3">
               <i class="fa-solid fa-lock fa-3x"></i>
             </div>
             <h5 class="fw-bold text-dark mb-2">عفواً، لا يمكنك إتمام الشراء كـ زائر!</h5>
             <p class="text-muted small m-0">يرجى تسجيل الدخول أو إنشاء حساب جديد لتتبع شحنتك وحفظ طلباتك بأمان.</p>
           </div>
         `,
         showCancelButton: true,
         confirmButtonColor: '#e60023',
         cancelButtonColor: '#6c757d',
         confirmButtonText: 'تسجيل الدخول الآن 🔑',
         cancelButtonText: 'تراجع'
       }).then((res) => {
         if (res.isConfirmed) {
           window.location.href = loginPath;
         }
       });
       return;
     }
   
     clientEmail = session.user.email;
   
     const name = document.getElementById("order-name").value.trim();
     const phone = document.getElementById("order-phone").value.trim();
     const address = document.getElementById("order-address").value.trim();
     const paymentMethod = document.getElementById("order-payment-method").value;
     const selectedBranch = paymentMethod === "branch_pickup" ? document.getElementById("order-branch-select")?.value : null;
     const submitBtn = document.getElementById("btn-submit-order");
   
     submitBtn.disabled = true;
     submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>جاري حفظ الطلب...';
   
     try {
       const totalAmount = currentCart.reduce((sum, item) => sum + (Number(item.price) * (item.quantity || 1)), 0);
   
       const { data: newOrder, error } = await _supabase.from("orders").insert([{
         client_name: name,
         client_phone: phone,
         client_email: clientEmail,
         shipping_address: paymentMethod === "branch_pickup" ? `استلام فرع: ${selectedBranch}` : address,
         payment_method: paymentMethod,
         selected_branch: selectedBranch,
         payment_receipt_url: uploadedReceiptBase64 || null,
         tracking_status: 'pending',
         items: currentCart,
         total_price: totalAmount
       }]).select();
   
       if (error) throw error;
   
       localStorage.removeItem("ano_cart");
       loadCartItems();
       if (typeof updateCartCount === "function") updateCartCount();
   
       const profilePath = isLocalOrGithub ? "profile.html" : "/profile";
       const homePath = isLocalOrGithub ? "index.html" : "/";
   
       Swal.fire({
         html: `
           <div class="text-center py-2">
             <div class="d-inline-flex align-items-center justify-content-center bg-danger bg-opacity-10 text-danger rounded-circle p-3 mb-3">
               <i class="fa-solid fa-circle-check fa-3x"></i>
             </div>
             <h4 class="fw-bold text-dark mb-2">تم تسجيل طلبك بنجاح!</h4>
             <p class="text-muted small mb-3">شكراً لثقتك بـ <strong>ANO Store</strong>.</p>
             <div class="p-3 bg-light rounded-3 text-start small border mb-3">
               <div class="d-flex justify-content-between mb-1">
                 <span class="text-muted">طريقة الدفع:</span>
                 <span class="badge bg-dark">${paymentMethod === 'branch_pickup' ? 'استلام من الفرع' : paymentMethod}</span>
               </div>
               ${selectedBranch ? `<div class="d-flex justify-content-between mb-1"><span class="text-muted">الفرع:</span><strong>${selectedBranch}</strong></div>` : ''}
               <div class="d-flex justify-content-between">
                 <span class="text-muted">الإجمالي:</span>
                 <strong class="text-danger">${totalAmount.toLocaleString()} ج.م</strong>
               </div>
             </div>
           </div>
         `,
         showCancelButton: true,
         confirmButtonColor: '#e60023',
         cancelButtonColor: '#212529',
         confirmButtonText: 'تتبع الطلب في حسابك 🚚',
         cancelButtonText: 'العودة للرئيسية'
       }).then((res) => {
         window.location.href = res.isConfirmed ? profilePath : homePath;
       });
   
     } catch (err) {
       console.error("Checkout Error:", err);
       Swal.fire({ icon: 'error', title: 'فشل إرسال الطلب', text: 'تأكد من إعدادات جدول الطلبات.', confirmButtonColor: '#e60023' });
     } finally {
       submitBtn.disabled = false;
       submitBtn.innerHTML = '<i class="fa-solid fa-circle-check me-1"></i> إتمام عملية الشراء الآن';
     }
   }