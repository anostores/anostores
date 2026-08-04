/* ==========================================
   ANO Store - Admin cPanel & Engine Script
   ========================================== */

   let currentUserRole = "admin";

   document.addEventListener("DOMContentLoaded", async () => {
     const isAdminValid = await checkAdminAuth();
     if (!isAdminValid) return;
   
     initLiveEditorListeners();
     loadAdminOrders();
     loadAdminMaintenance();
     loadAdminProductsList();
     loadAdminReviews();
     loadAdminUsersManagement();
   
     const saveLiveBtn = document.getElementById("btn-save-product-live");
     if (saveLiveBtn) {
       saveLiveBtn.addEventListener("click", handleSaveLiveProduct);
     }
   
     const logoutBtn = document.getElementById("admin-logout-btn");
     if (logoutBtn) {
       logoutBtn.addEventListener("click", () => {
         localStorage.removeItem("ano_admin_remember");
         sessionStorage.removeItem("ano_admin_session");
         _supabase.auth.signOut();
         window.location.href = "admin-login.html";
       });
     }
   });
   
   async function checkAdminAuth() {
     const { data: { session } } = await _supabase.auth.getSession();
   
     if (!session || !session.user) {
       window.location.href = "admin-login.html";
       return false;
     }
   
     const userEmail = session.user.email;
   
     const { data: adminRecord, error } = await _supabase
       .from("admin_users")
       .select("*")
       .eq("email", userEmail)
       .single();
   
     if (error || !adminRecord || !adminRecord.is_approved) {
       Swal.fire({
         icon: "error",
         title: "دخول غير مصرح!",
         text: "حسابك بانتظار موافقة الأدمن الرئيسي.",
         confirmButtonColor: "#e60023"
       }).then(() => {
         _supabase.auth.signOut();
         window.location.href = "admin-login.html";
       });
       return false;
     }
   
     currentUserRole = adminRecord.role || "admin";
     return true;
   }
   
   function initLiveEditorListeners() {
     const titleInput = document.getElementById("live-input-title");
     const priceInput = document.getElementById("live-input-price");
     const oldPriceInput = document.getElementById("live-input-old-price");
     const brandInput = document.getElementById("live-input-brand");
     const stockInput = document.getElementById("live-input-stock-status");
     const imageInput = document.getElementById("live-input-image");
     const descInput = document.getElementById("live-input-desc");
   
     const prevTitle = document.getElementById("live-preview-title");
     const prevPrice = document.getElementById("live-preview-price");
     const prevOldPrice = document.getElementById("live-preview-old-price");
     const prevBrand = document.getElementById("live-preview-brand-tag");
     const prevStock = document.getElementById("live-preview-stock-tag");
     const prevImg = document.getElementById("live-preview-img");
     const prevDesc = document.getElementById("live-preview-desc");
   
     if (titleInput && prevTitle) {
       titleInput.addEventListener("input", () => {
         prevTitle.innerText = titleInput.value.trim() || "اسم المنتج...";
       });
     }
     if (priceInput && prevPrice) {
       priceInput.addEventListener("input", () => {
         prevPrice.innerText = priceInput.value ? `${Number(priceInput.value).toLocaleString()} ج.م` : "0 ج.م";
       });
     }
     if (oldPriceInput && prevOldPrice) {
       oldPriceInput.addEventListener("input", () => {
         prevOldPrice.innerText = oldPriceInput.value ? `${Number(oldPriceInput.value).toLocaleString()} ج.م` : "";
       });
     }
     if (brandInput && prevBrand) {
       brandInput.addEventListener("input", () => {
         prevBrand.innerText = brandInput.value.trim() || "العلامة التجاريه";
       });
     }
     if (stockInput && prevStock) {
       stockInput.addEventListener("input", () => {
         prevStock.innerText = stockInput.value.trim() || "متوفر";
       });
     }
     if (imageInput && prevImg) {
       imageInput.addEventListener("input", () => {
         prevImg.src = imageInput.value.trim() || "https://via.placeholder.com/300";
       });
     }
     if (descInput && prevDesc) {
       descInput.addEventListener("input", () => {
         prevDesc.innerText = descInput.value.trim() || "الوصف...";
       });
     }
   }
   
   async function handleSaveLiveProduct() {
     const title = document.getElementById("live-input-title")?.value.trim();
     const category = document.getElementById("live-input-category")?.value;
     const price = document.getElementById("live-input-price")?.value;
     const oldPrice = document.getElementById("live-input-old-price")?.value;
     const brand = document.getElementById("live-input-brand")?.value.trim();
     const stock = document.getElementById("live-input-stock-status")?.value.trim();
     const image = document.getElementById("live-input-image")?.value.trim();
     const desc = document.getElementById("live-input-desc")?.value.trim();
   
     if (!title || !price) {
       Swal.fire({ icon: 'warning', title: 'تنبيـه', text: 'أدخل الاسم والسعر.', confirmButtonColor: '#e60023' });
       return;
     }
   
     const saveBtn = document.getElementById("btn-save-product-live");
     saveBtn.disabled = true;
   
     try {
       const { error } = await _supabase.from("products").insert([{
         title: title,
         price: Number(price),
         original_price: oldPrice ? Number(oldPrice) : 0,
         category_slug: category,
         brand: brand || "",
         stock_status: stock || "in_stock",
         description: desc || "",
         images: image ? [image] : []
       }]);
   
       if (error) throw error;
   
       Swal.fire({ icon: 'success', title: 'تمت الإضافة!', confirmButtonColor: '#e60023' });
       document.getElementById("live-product-form")?.reset();
       loadAdminProductsList();
   
     } catch (err) {
       Swal.fire({ icon: 'error', title: 'خطأ', text: err.message, confirmButtonColor: '#e60023' });
     } finally {
       saveBtn.disabled = false;
     }
   }
   
   /* 4. إدارة طلبات الشراء والموافقة على الإلغاء وحذف الطلب بـ تحذير */
   async function loadAdminOrders() {
     const tbody = document.getElementById("admin-orders-tbody");
     if (!tbody) return;
   
     try {
       const { data, error } = await _supabase
         .from("orders")
         .select("*")
         .order("created_at", { ascending: false });
   
       if (error) throw error;
   
       if (!data || data.length === 0) {
         tbody.innerHTML = '<tr><td colspan="7" class="text-muted py-4">لا توجد طلبات شراء حتى الآن.</td></tr>';
         return;
       }
   
       tbody.innerHTML = data.map((o, idx) => `
         <tr>
           <td>${idx + 1}</td>
           <td class="fw-bold">${o.client_name}</td>
           <td>${o.client_phone}</td>
           <td>${o.shipping_address || 'استلام فرع'}</td>
           <td>${renderOrderPaymentDetails(o)}</td>
           <td>
             <span class="badge ${getStatusBadgeClass(o.tracking_status)}">
               ${getStatusTextArabic(o.tracking_status)}
             </span>
             ${o.cancel_requested ? `<br><button class="btn btn-sm btn-danger py-0 px-2 mt-1" onclick="reviewCancelRequest('${o.id}', '${encodeURIComponent(o.cancellation_reason || '')}')">مراجعة طلب الإلغاء</button>` : ''}
             ${o.expedite_requested ? '<br><span class="badge bg-warning text-dark mt-1">⚡ تسريع مطلوب</span>' : ''}
           </td>
           <td>
             <div class="d-flex align-items-center justify-content-center gap-1">
               <select class="form-select form-select-sm d-inline-block w-auto" onchange="updateOrderStatus('${o.id}', this.value)">
                 <option value="pending" ${o.tracking_status === 'pending' ? 'selected' : ''}>قيد الانتظار</option>
                 <option value="processing" ${o.tracking_status === 'processing' ? 'selected' : ''}>قيد التجهيز</option>
                 <option value="shipped" ${o.tracking_status === 'shipped' ? 'selected' : ''}>تم الشحن</option>
                 <option value="delivered" ${o.tracking_status === 'delivered' ? 'selected' : ''}>تم التوصيل</option>
                 <option value="cancelled" ${o.tracking_status === 'cancelled' ? 'selected' : ''}>ملغي</option>
               </select>
               <button class="btn btn-sm btn-outline-dark" onclick="showOrderItemsModal('${o.id}')" title="تفاصيل المنتجات">
                 <i class="fa-solid fa-list"></i>
               </button>
               <button class="btn btn-sm btn-outline-danger" onclick="deleteOrderWithConfirm('${o.id}')" title="حذف الطلب">
                 <i class="fa-solid fa-trash"></i>
               </button>
             </div>
           </td>
         </tr>
       `).join("");
     } catch (err) {
       tbody.innerHTML = '<tr><td colspan="7" class="text-muted py-4">حدث خطأ أثناء تحميل الطلبات.</td></tr>';
     }
   }
   
   function renderOrderPaymentDetails(o) {
     if (o.payment_method === 'branch_pickup') {
       return `<span class="badge bg-primary">🏢 ${o.selected_branch || 'استلام فرع'}</span>`;
     }
     if (o.payment_receipt_url) {
       return `<button class="btn btn-sm btn-outline-success py-0 px-2 fw-bold" onclick="showReceiptModal('${o.payment_receipt_url}')">عرض الإيصال</button>`;
     }
     return `<span class="badge bg-light text-dark border">${o.payment_method || 'دفع عند الاستلام'}</span>`;
   }
   
   function showReceiptModal(imgUrl) {
     Swal.fire({
       title: 'صورة إيصال التحويل',
       imageUrl: imgUrl,
       confirmButtonColor: '#e60023'
     });
   }
   
   async function reviewCancelRequest(orderId, encodedReason) {
     const reason = decodeURIComponent(encodedReason);
     
     const res = await Swal.fire({
       title: 'طلب إلغاء من العميل',
       html: `
         <div class="text-start p-2 border bg-light rounded mb-3">
           <strong>سبب الإلغاء المكتوب:</strong>
           <p class="text-danger m-0 mt-1">${reason || 'لم يذكر سبباً'}</p>
         </div>
         <p class="small text-muted mb-0">عند القبول سيتم تحويل حالة الطلب إلى "ملغي".</p>
       `,
       showCancelButton: true,
       showDenyButton: true,
       confirmButtonColor: '#dc3545',
       denyButtonColor: '#6c757d',
       cancelButtonColor: '#198754',
       confirmButtonText: 'الموافقة على الإلغاء',
       denyButtonText: 'رفض طلب الإلغاء',
       cancelButtonText: 'إغلاق'
     });
   
     if (res.isConfirmed) {
       await _supabase.from("orders").update({ tracking_status: 'cancelled', cancel_requested: false }).eq("id", orderId);
       Swal.fire({ icon: 'success', title: 'تمت الموافقة وإلغاء الطلب!', confirmButtonColor: '#e60023' });
       loadAdminOrders();
     } else if (res.isDenied) {
       await _supabase.from("orders").update({ cancel_requested: false }).eq("id", orderId);
       Swal.fire({ icon: 'info', title: 'تم رفض طلب الإلغاء واستمرار الشحن.', confirmButtonColor: '#e60023' });
       loadAdminOrders();
     }
   }
   
   async function deleteOrderWithConfirm(orderId) {
     const res = await Swal.fire({
       title: 'تحذير: تأكيد حذف الطلب؟',
       text: "سيتم مسح هذا الطلب وبياناته نهائياً من قاعدة البيانات ولا يمكن استرجاعه!",
       icon: 'warning',
       showCancelButton: true,
       confirmButtonColor: '#e60023',
       cancelButtonColor: '#6c757d',
       confirmButtonText: 'نعم، قم بحذف الطلب',
       cancelButtonText: 'إلغاء'
     });
   
     if (res.isConfirmed) {
       await _supabase.from("orders").delete().eq("id", orderId);
       Swal.fire({ icon: 'success', title: 'تم حذف الطلب بنجاح!', confirmButtonColor: '#e60023' });
       loadAdminOrders();
     }
   }
   
   async function showOrderItemsModal(orderId) {
     const { data: order } = await _supabase.from("orders").select("*").eq("id", orderId).single();
     if (!order) return;
   
     const items = order.items || [];
     const itemsHtml = items.map(i => `
       <div class="d-flex justify-content-between align-items-center border-bottom py-2">
         <div class="text-start">
           <strong class="d-block">${i.title}</strong>
           <span class="text-muted fs-9">الكمية: ${i.quantity || 1} | السعر: ${Number(i.price).toLocaleString()} ج.م</span>
         </div>
         <strong class="text-danger">${((i.quantity || 1) * Number(i.price)).toLocaleString()} ج.م</strong>
       </div>
     `).join("");
   
     Swal.fire({
       title: `تفاصيل الطلب #${order.id.toString().slice(-6)}`,
       html: `
         <div class="p-2 text-start">
           <p class="mb-1"><strong>العميل:</strong> ${order.client_name} (${order.client_phone})</p>
           <p class="mb-3"><strong>العنوان / الفرع:</strong> ${order.shipping_address || 'استلام فرع'}</p>
           <h6 class="fw-bold text-danger border-bottom pb-1">المنتجات المطلوبة:</h6>
           ${itemsHtml || '<p class="text-muted small">لا توجد تفاصيل.</p>'}
           <div class="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
             <strong class="fs-6">الإجمالي الكلي:</strong>
             <strong class="text-danger fs-5">${Number(order.total_price || 0).toLocaleString()} ج.م</strong>
           </div>
         </div>
       `,
       confirmButtonColor: '#e60023'
     });
   }
   
   function getStatusBadgeClass(status) {
     switch (status) {
       case 'shipped': return 'bg-info text-dark';
       case 'delivered': return 'bg-success';
       case 'cancelled': return 'bg-danger';
       case 'processing': return 'bg-primary';
       default: return 'bg-warning text-dark';
     }
   }
   
   function getStatusTextArabic(status) {
     switch (status) {
       case 'shipped': return 'تم الشحن';
       case 'delivered': return 'تم التوصيل';
       case 'cancelled': return 'تم الإلغاء';
       case 'processing': return 'قيد التجهيز';
       default: return 'قيد الانتظار';
     }
   }
   
   async function updateOrderStatus(id, newStatus) {
     await _supabase.from("orders").update({ tracking_status: newStatus }).eq("id", id);
     Swal.fire({
       icon: 'success',
       title: 'تم تحديث حالة الطلب!',
       toast: true,
       position: 'top-end',
       showConfirmButton: false,
       timer: 1500
     });
     loadAdminOrders();
   }
   
   /* 5. جلب وتأكيد حجوزات الصيانة */
   async function loadAdminMaintenance() {
     const tbody = document.getElementById("admin-maintenance-tbody");
     if (!tbody) return;
   
     try {
       const { data, error } = await _supabase.from("maintenance_requests").select("*").order("created_at", { ascending: false });
       if (error) throw error;
   
       if (!data || data.length === 0) {
         tbody.innerHTML = '<tr><td colspan="7" class="text-muted py-4">لا توجد حجوزات صيانة حالياً.</td></tr>';
         return;
       }
   
       tbody.innerHTML = data.map(m => `
         <tr>
           <td class="fw-bold">${m.client_name}</td>
           <td>${m.client_phone}</td>
           <td>${m.device_model}</td>
           <td>${m.branch_location}</td>
           <td>${m.preferred_date} (${m.preferred_time})</td>
           <td style="max-width: 200px;">${m.issue_description}</td>
           <td>
             <button class="btn btn-sm ${m.status === 'confirmed' ? 'btn-secondary disabled' : 'btn-success'}" onclick="confirmMaintenance('${m.id}')">
               ${m.status === 'confirmed' ? 'مقبول' : 'تأكيد الميعاد'}
             </button>
             <button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteMaintenanceWithConfirm('${m.id}')" title="حذف">
               <i class="fa-solid fa-trash"></i>
             </button>
           </td>
         </tr>
       `).join("");
     } catch (err) {
       tbody.innerHTML = '<tr><td colspan="7" class="text-muted py-4">خطأ في التحميل.</td></tr>';
     }
   }
   
   async function confirmMaintenance(id) {
     await _supabase.from("maintenance_requests").update({ status: "confirmed" }).eq("id", id);
     Swal.fire({ icon: 'success', title: 'تم تأكيد الميعاد!', confirmButtonColor: '#e60023' });
     loadAdminMaintenance();
   }
   
   async function deleteMaintenanceWithConfirm(id) {
     const res = await Swal.fire({
       title: 'حذف حجز الصيانة؟',
       text: "هل أنت تأكد من رغبتك في حذف حجز الصيانة هذا؟",
       icon: 'warning',
       showCancelButton: true,
       confirmButtonColor: '#e60023',
       confirmButtonText: 'حذف الحجز'
     });
   
     if (res.isConfirmed) {
       await _supabase.from("maintenance_requests").delete().eq("id", id);
       Swal.fire({ icon: 'success', title: 'تم الحذف بنجاح!', confirmButtonColor: '#e60023' });
       loadAdminMaintenance();
     }
   }
   
   /* 6. جلب وإدارة المنتجات المضافة */
   async function loadAdminProductsList() {
     const tbody = document.getElementById("admin-products-list-tbody");
     if (!tbody) return;
   
     try {
       const { data, error } = await _supabase.from("products").select("*").order("created_at", { ascending: false });
       if (error) throw error;
   
       if (!data || data.length === 0) {
         tbody.innerHTML = '<tr><td colspan="6" class="text-muted py-4">لا توجد منتجات مضافة.</td></tr>';
         return;
       }
   
       tbody.innerHTML = data.map(p => `
         <tr>
           <td><img src="${(p.images && p.images[0]) ? p.images[0] : 'https://via.placeholder.com/40'}" style="width: 40px; height: 40px; object-fit: contain;"></td>
           <td class="fw-bold">${p.title}</td>
           <td><span class="badge bg-light text-dark border">${p.category_slug}</span></td>
           <td class="fw-bold text-danger">${Number(p.price).toLocaleString()} ج.م</td>
           <td>
             <a href="add-product.html?id=${p.id}" class="btn btn-sm btn-outline-primary">تعديل حي</a>
           </td>
           <td>
             <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct('${p.id}')"><i class="fa-solid fa-trash"></i> حذف</button>
           </td>
         </tr>
       `).join("");
     } catch (err) {
       tbody.innerHTML = '<tr><td colspan="6" class="text-muted py-4">خطأ أثناء تحميل المنتجات.</td></tr>';
     }
   }
   
   async function deleteProduct(id) {
     const result = await Swal.fire({
       title: 'تأكيد الحذف؟',
       text: "سيتم حذف هذا المنتج من المتجر نهائياً!",
       icon: 'warning',
       showCancelButton: true,
       confirmButtonColor: '#e60023',
       cancelButtonColor: '#6c757d',
       confirmButtonText: 'نعم، احذفه'
     });
   
     if (result.isConfirmed) {
       await _supabase.from("products").delete().eq("id", id);
       Swal.fire({ icon: 'success', title: 'تم الحذف بنجاح!', confirmButtonColor: '#e60023' });
       loadAdminProductsList();
     }
   }
   
   /* 7. جلب وإدارة مراجعات وتقييمات العملاء */
   async function loadAdminReviews() {
     const tbody = document.getElementById("admin-reviews-tbody");
     if (!tbody) return;
   
     try {
       const { data: reviews, error } = await _supabase
         .from("product_reviews")
         .select("*")
         .order("created_at", { ascending: false });
   
       if (error) throw error;
   
       if (!reviews || reviews.length === 0) {
         tbody.innerHTML = '<tr><td colspan="6" class="text-muted py-4">لا توجد تقييمات أو تعليقات حتى الآن.</td></tr>';
         return;
       }
   
       tbody.innerHTML = reviews.map(r => `
         <tr>
           <td class="fw-bold text-dark">${r.user_name || 'عميل'}</td>
           <td><span class="badge bg-light text-dark border">ID: ${r.product_id}</span></td>
           <td class="text-warning">${'⭐'.repeat(r.rating || 5)}</td>
           <td style="max-width: 250px;" class="text-start small">${r.comment || 'بدون تعليق'}</td>
           <td class="text-muted fs-9">${new Date(r.created_at).toLocaleDateString('ar-EG')}</td>
           <td>
             <button class="btn btn-sm btn-outline-danger" onclick="deleteReviewWithConfirm('${r.id}')" title="حذف التقييم">
               <i class="fa-solid fa-trash"></i>
             </button>
           </td>
         </tr>
       `).join("");
   
     } catch (err) {
       tbody.innerHTML = '<tr><td colspan="6" class="text-muted py-4">حدث خطأ أثناء تحميل التقييمات.</td></tr>';
     }
   }
   
   async function deleteReviewWithConfirm(reviewId) {
     const res = await Swal.fire({
       title: 'تأكيد حذف التقييم؟',
       text: "هل أنت تأكد من رغبتك في حذف هذا التعليق والتقييم من المتجر نهائياً؟",
       icon: 'warning',
       showCancelButton: true,
       confirmButtonColor: '#e60023',
       cancelButtonColor: '#6c757d',
       confirmButtonText: 'نعم، احذف التقييم',
       cancelButtonText: 'إلغاء'
     });
   
     if (res.isConfirmed) {
       await _supabase.from("product_reviews").delete().eq("id", reviewId);
       Swal.fire({ icon: 'success', title: 'تم حذف التقييم بنجاح!', confirmButtonColor: '#e60023' });
       loadAdminReviews();
     }
   }
   
   /* 8. إدارة حسابات الأدمنز والصلاحيات الشاملة */
   async function loadAdminUsersManagement() {
     const container = document.getElementById("admin-requests-container");
     if (!container) return;
   
     try {
       const { data: users, error } = await _supabase.from("admin_users").select("*").order("created_at", { ascending: false });
       if (error) throw error;
   
       if (!users || users.length === 0) {
         container.innerHTML = '<div class="text-muted small py-3 text-center">لا توجد حسابات أدمنز.</div>';
         return;
       }
   
       container.innerHTML = `
         <div class="table-responsive">
           <table class="table table-bordered align-middle text-center small m-0">
             <thead class="table-light">
               <tr>
                 <th>الاسم والبريد</th>
                 <th>الحالة</th>
                 <th>الصلاحية</th>
                 <th>القرار / حذف</th>
               </tr>
             </thead>
             <tbody>
               ${users.map(u => `
                 <tr>
                   <td>
                     <strong class="d-block text-dark">${u.full_name || 'أدمن'}</strong>
                     <span class="text-muted fs-9">${u.email}</span>
                   </td>
                   <td>
                     <span class="badge ${u.is_approved ? 'bg-success' : 'bg-warning text-dark'}">
                       ${u.is_approved ? 'معتمد' : 'تحت المراجعة'}
                     </span>
                   </td>
                   <td>
                     <span class="badge bg-dark">${u.role === 'super_admin' ? 'Super Admin' : 'Admin عادي'}</span>
                   </td>
                   <td>
                     ${currentUserRole === 'super_admin' ? `
                       ${!u.is_approved ? `
                         <button class="btn btn-sm btn-success py-1 px-2" onclick="approveAdmin('${u.id}')">قبول</button>
                         <button class="btn btn-sm btn-danger py-1 px-2" onclick="rejectAdmin('${u.id}')">رفض</button>
                       ` : `
                         <button class="btn btn-sm btn-outline-dark py-1 px-2" onclick="toggleRole('${u.id}', '${u.role}')">
                           تحويل لـ ${u.role === 'super_admin' ? 'Admin عادي' : 'Super Admin'}
                         </button>
                         <button class="btn btn-sm btn-outline-danger py-1 px-2 ms-1" onclick="deleteAdminUserWithConfirm('${u.id}')" title="حذف أدمن">
                           <i class="fa-solid fa-trash"></i>
                         </button>
                       `}
                     ` : '<span class="text-muted fs-9">مخصصة للسوبر أدمن</span>'}
                   </td>
                 </tr>
               `).join('')}
             </tbody>
           </table>
         </div>
       `;
   
     } catch (err) {
       container.innerHTML = '<div class="text-muted small py-3 text-center">خطأ في جلب البيانات.</div>';
     }
   }
   
   async function approveAdmin(id) {
     await _supabase.from("admin_users").update({ is_approved: true }).eq("id", id);
     Swal.fire({ icon: 'success', title: 'تمت الموافقة وتفعيل حساب الأدمن بنجاح!', confirmButtonColor: '#e60023' });
     loadAdminUsersManagement();
   }
   
   async function rejectAdmin(id) {
     await _supabase.from("admin_users").delete().eq("id", id);
     Swal.fire({ icon: 'info', title: 'تم رفض الطلب وحذفه.', confirmButtonColor: '#e60023' });
     loadAdminUsersManagement();
   }
   
   async function deleteAdminUserWithConfirm(id) {
     const res = await Swal.fire({
       title: 'حذف حساب أدمن؟',
       text: "هل أنت تأكد من رغبتك في سحب صلاحية الأدمن وحذف حسابه؟",
       icon: 'warning',
       showCancelButton: true,
       confirmButtonColor: '#e60023',
       confirmButtonText: 'حذف الحساب'
     });
   
     if (res.isConfirmed) {
       await _supabase.from("admin_users").delete().eq("id", id);
       Swal.fire({ icon: 'success', title: 'تم الحذف بنجاح!', confirmButtonColor: '#e60023' });
       loadAdminUsersManagement();
     }
   }
   
   async function toggleRole(id, currentRole) {
     const newRole = currentRole === 'super_admin' ? 'admin' : 'super_admin';
     await _supabase.from("admin_users").update({ role: newRole }).eq("id", id);
     Swal.fire({ icon: 'success', title: 'تم تغيير صلاحية الأدمن بنجاح!', confirmButtonColor: '#e60023' });
     loadAdminUsersManagement();
   }