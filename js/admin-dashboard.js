/* ==========================================================================
   ANO Store - Admin cPanel & Engine Script
   Full Features: Dynamic Category Analytics, Clean URL Handlers, Slider Live Preview, 
   Strict Permissions, Dynamic WhatsApp Contacts & Direct Reply WhatsApp Board
   Guaranteed Hybrid Local & Production Routing Support
   ========================================================================== */

   let currentUserRole = "admin";
   let currentAdminId = null;
   let currentAdminPermissions = [];
   
   document.addEventListener("DOMContentLoaded", async () => {
     const isAdminValid = await checkAdminAuth();
     if (!isAdminValid) return;
   
     await loadDashboardStats();
     await loadAnalyticsData();
     await loadCategoryAnalytics();
     loadAdminOrders();
     loadAdminSlider();
     loadAdminProductsList();
     loadAdminMaintenance();
     loadAdminUsersList();
     loadAdminReviews();
     loadAdminUsersManagement();
     loadPermissionRequestsBoard();
     loadStoreContactsManager();
     loadContactMessagesBoard();
   
     // ربط أحداث البحث في المستخدمين
     const userSearchInput = document.getElementById("search-users-input");
     if (userSearchInput) {
       userSearchInput.addEventListener("input", (e) => {
         loadAdminUsersList(e.target.value.trim());
       });
     }
   
     const logoutBtn = document.getElementById("admin-logout-btn");
     if (logoutBtn) {
       logoutBtn.addEventListener("click", () => {
         localStorage.removeItem("ano_admin_remember");
         sessionStorage.removeItem("ano_admin_session");
         _supabase.auth.signOut();
         
         const isLocal = window.location.protocol === 'file:' || window.location.pathname.endsWith('.html');
         window.location.href = isLocal ? "admin-login.html" : "/admin";
       });
     }
   });
   
   /* 1. التحقق من صلاحيات الأدمن والتوثيق وقراءة الصلاحيات وتفعيل الـ Checkboxes */
   async function checkAdminAuth() {
     const { data: { session } } = await _supabase.auth.getSession();
   
     const isLocal = window.location.protocol === 'file:' || window.location.pathname.endsWith('.html');
     const loginPath = isLocal ? "admin-login.html" : "/admin";
   
     if (!session || !session.user) {
       window.location.href = loginPath;
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
         window.location.href = loginPath;
       });
       return false;
     }
   
     currentAdminId = adminRecord.id;
     currentUserRole = adminRecord.role || "admin";
   
     // جلب مصفوفة الصلاحيات المحددة لهذا الأدمن وتخزينها
     const { data: perms } = await _supabase.from("admin_permissions").select("permission_id").eq("admin_id", currentAdminId);
     currentAdminPermissions = perms ? perms.map(p => p.permission_id) : [];
   
     return true;
   }
   
   /* فحص الصلاحية وإظهار نافذة إرسال طلب تفعيل للسوبر أدمن إذا كانت مقفولة */
   async function checkPermissionOrPrompt(permId, permLabel) {
     if (currentUserRole === 'super_admin' || currentAdminPermissions.includes(permId)) {
       return true;
     }
   
     const { value: notes } = await Swal.fire({
       title: `الصلاحية مقفولة: ${permLabel}`,
       html: `
         <div class="text-start p-2 border bg-light rounded mb-3">
           <p class="small text-dark mb-2">عفواً، هذه الصلاحية غير مفعّلة لحسابك حالياً. يمكنك إرسال طلب تفعيل مباشرة للسوبر أدمن مع كتابة مبرر الطلب:</p>
         </div>
       `,
       input: 'textarea',
       inputPlaceholder: 'اكتب سبب طلب فتح الصلاحية أو الملاحظات هنا...',
       showCancelButton: true,
       confirmButtonColor: '#e60023',
       confirmButtonText: 'إرسال طلب التفعيل للسوبر أدمن 📤',
       cancelButtonText: 'إلغاء'
     });
   
     if (notes !== undefined) {
       await _supabase.from("permission_requests").insert([{
         admin_id: currentAdminId,
         requested_permission: permId,
         notes: notes || 'طلب تفعيل صلاحية',
         status: 'pending'
       }]);
   
       Swal.fire({
         icon: 'success',
         title: 'تم إرسال الطلب بنجاح!',
         text: 'تم إرسال طلب التفعيل للـ Super Admin وسيقوم بمراجعته وتفعيله.',
         confirmButtonColor: '#e60023'
       });
     }
   
     return false;
   }
   
   /* 2. حساب وعرض الإحصائيات السريعة للـ Dashboard */
   async function loadDashboardStats() {
     try {
       const { data: orders } = await _supabase.from("orders").select("total_price, tracking_status");
       const { count: productsCount } = await _supabase.from("products").select("*", { count: 'exact', head: true });
       const { count: maintenanceCount } = await _supabase.from("maintenance_requests").select("*", { count: 'exact', head: true });
   
       const totalOrders = orders ? orders.length : 0;
       const totalSales = orders 
         ? orders.reduce((sum, o) => sum + (o.tracking_status !== 'cancelled' ? Number(o.total_price || 0) : 0), 0)
         : 0;
   
       const statOrders = document.getElementById("stat-total-orders");
       const statSales = document.getElementById("stat-total-sales");
       const statProducts = document.getElementById("stat-total-products");
       const statMaintenance = document.getElementById("stat-total-maintenance");
   
       if (statOrders) statOrders.innerText = totalOrders;
       if (statSales) statSales.innerText = `${totalSales.toLocaleString()} ج.م`;
       if (statProducts) statProducts.innerText = productsCount || 0;
       if (statMaintenance) statMaintenance.innerText = maintenanceCount || 0;
   
     } catch (err) {
       console.error("Error loading dashboard stats:", err);
     }
   }
   
   /* 2.1 تغذية كارت تحليلات البيانات وتفريغ السجل */
   async function loadAnalyticsData() {
     const visitsLabel = document.getElementById("analytics-visits-count");
     if (!visitsLabel) return;
   
     try {
       const { count: visitsCount } = await _supabase.from("site_analytics").select("*", { count: 'exact', head: true });
       visitsLabel.innerText = `${visitsCount || 0} زيارة حقيقية`;
     } catch (err) {
       console.error("Analytics load error:", err);
     }
   }
   
   /* 2.2 حساب وتحليل القسم الأكثر طلباً ديناميكياً مع رسم Progress Bar التناسبي */
   async function loadCategoryAnalytics() {
     const categoryAnalyticsBox = document.querySelector(".progress")?.parentElement;
     if (!categoryAnalyticsBox) return;
   
     try {
       const { data: orders } = await _supabase.from("orders").select("items");
       if (!orders || orders.length === 0) {
         categoryAnalyticsBox.innerHTML = `
           <span class="small fw-bold text-muted d-block mb-2">القسم الأكثر طلباً:</span>
           <div class="progress" style="height: 20px;">
             <div class="progress-bar bg-secondary fw-bold" role="progressbar" style="width: 100%;">لا توجد طلبات بعد</div>
           </div>
         `;
         return;
       }
   
       const categoryCounts = {};
       let totalItemsOrdered = 0;
   
       orders.forEach(order => {
         const items = order.items || [];
         items.forEach(item => {
           const cat = item.category_slug || item.category || 'عام';
           const qty = Number(item.quantity || 1);
           categoryCounts[cat] = (categoryCounts[cat] || 0) + qty;
           totalItemsOrdered += qty;
         });
       });
   
       let topCategory = 'الموبايلات';
       let maxCount = 0;
   
       for (const [cat, count] of Object.entries(categoryCounts)) {
         if (count > maxCount) {
           maxCount = count;
           topCategory = cat;
         }
       }
   
       const percentage = totalItemsOrdered > 0 ? Math.round((maxCount / totalItemsOrdered) * 100) : 0;
   
       const categoryMap = {
         'used-phones': 'موبايلات مستعملة',
         'new-phones': 'موبايلات جديدة',
         'perfumes': 'العطور والسبراي',
         'body-splash': 'بادي سبلاش',
         'handsfree': 'سماعات وايربودز',
         'cases': 'جرابات وشواحن'
       };
   
       const displayCategoryName = categoryMap[topCategory] || topCategory;
   
       categoryAnalyticsBox.innerHTML = `
         <span class="small fw-bold text-muted d-block mb-2">القسم الأكثر طلباً (حقيقي):</span>
         <div class="progress" style="height: 22px;">
           <div class="progress-bar bg-danger fw-bold" role="progressbar" style="width: ${percentage}%;" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
             ${displayCategoryName} (${percentage}%)
           </div>
         </div>
       `;
   
     } catch (err) {
       console.error("Error loading category analytics:", err);
     }
   }
   
   async function resetAnalyticsHistory() {
     if (currentUserRole !== 'super_admin') {
       const hasPerm = await checkPermissionOrPrompt('view_stats', 'تفريغ سجل التحليلات');
       if (!hasPerm) return;
     }
   
     const res = await Swal.fire({
       title: 'تفريغ سجل التحليلات؟',
       text: 'هل أنت تأكد من رغبتك في تصفير سجل الزيارات والتحليلات القديم؟',
       icon: 'warning',
       showCancelButton: true,
       confirmButtonColor: '#e60023',
       confirmButtonText: 'تفريغ وتصفير'
     });
   
     if (res.isConfirmed) {
       await _supabase.from("site_analytics").delete().neq("id", 0);
       Swal.fire({ icon: 'success', title: 'تم تصفير السجل بنجاح!', confirmButtonColor: '#e60023' });
       loadAnalyticsData();
     }
   }
   
   /* 3. محرك إدارة السلايدر الرئيسي الصافي بالمعاينة المباشرة */
   async function loadAdminSlider() {
     const tbody = document.getElementById("admin-slider-tbody");
     if (!tbody) return;
   
     try {
       const { data: slides, error } = await _supabase
         .from("hero_slides")
         .select("*")
         .order("display_order", { ascending: true });
   
       if (error) throw error;
   
       if (!slides || slides.length === 0) {
         tbody.innerHTML = '<tr><td colspan="5" class="text-muted py-4">لا توجد صور في السلايدر حالياً. أضف سلايد جديد بالمعاينة!</td></tr>';
         return;
       }
   
       tbody.innerHTML = slides.map(s => `
         <tr>
           <td><img src="${s.image_url}" style="width: 80px; height: 45px; object-fit: cover;" class="rounded border"></td>
           <td class="text-muted small text-truncate" style="max-width: 150px;">${s.link_url || 'products.html'}</td>
           <td>
             <input type="number" class="form-control form-control-sm text-center fw-bold mx-auto" style="width: 65px;" value="${s.display_order || 0}" onchange="updateSlideOrder('${s.id}', this.value)">
           </td>
           <td>
             <button class="btn btn-sm ${s.is_active ? 'btn-success' : 'btn-secondary'} py-0 px-2 fw-bold" onclick="toggleSlideActive('${s.id}', ${s.is_active})">
               ${s.is_active ? 'نشط' : 'معطل'}
             </button>
           </td>
           <td>
             <button class="btn btn-sm btn-outline-danger" onclick="deleteSlide('${s.id}')" title="حذف السلايد">
               <i class="fa-solid fa-trash"></i>
             </button>
           </td>
         </tr>
       `).join("");
   
     } catch (err) {
       tbody.innerHTML = '<tr><td colspan="5" class="text-muted py-4">حدث خطأ أثناء جلب صور السلايدر.</td></tr>';
     }
   }
   
   /* نافذة إضافة سلايدر مع معاينة فورية للصورة بدون نصوص */
   async function openAddSlideModal() {
     const hasPerm = await checkPermissionOrPrompt('manage_slider', 'إدارة السلايدر الرئيسي');
     if (!hasPerm) return;
   
     let tempUploadedBase64 = "";
   
     const { value: formValues } = await Swal.fire({
       title: 'إضافة سلايدر إعلاني صافي مع المعاينة',
       html: `
         <div class="text-start mb-2">
           <label class="form-label fw-bold small">1. رفع صورة السلايدر من جهازك:</label>
           <input type="file" id="swal-slide-file" class="form-control form-control-sm" accept="image/*">
         </div>
         <div class="text-start mb-2">
           <label class="form-label fw-bold small">2. أو إدخال رابط الصورة (Image URL):</label>
           <input id="swal-slide-img" class="form-control form-control-sm text-start" placeholder="https://...">
         </div>
         <div class="text-start mb-2">
           <label class="form-label fw-bold small">رابط الوجهة عند الضغط على الصورة (Link URL):</label>
           <input id="swal-slide-link" class="form-control form-control-sm text-start" value="products.html">
         </div>
         <div class="text-start mt-3">
           <label class="form-label fw-bold small text-danger d-block">معاينة صورة السلايدر المباشرة:</label>
           <div class="p-2 border rounded text-center bg-dark">
             <img id="swal-slide-preview" src="https://via.placeholder.com/600x200?text=ANO+Store+Slide+Preview" style="max-height: 120px; width: 100%; object-fit: cover;" class="rounded">
           </div>
         </div>
       `,
       showCancelButton: true,
       confirmButtonColor: '#e60023',
       confirmButtonText: 'حفظ ونشر السلايدر',
       cancelButtonText: 'إلغاء',
       didOpen: () => {
         const fileInput = document.getElementById('swal-slide-file');
         const urlInput = document.getElementById('swal-slide-img');
         const previewImg = document.getElementById('swal-slide-preview');
   
         fileInput.addEventListener('change', (e) => {
           const file = e.target.files[0];
           if (file) {
             const reader = new FileReader();
             reader.onload = (evt) => {
               tempUploadedBase64 = evt.target.result;
               previewImg.src = tempUploadedBase64;
             };
             reader.readAsDataURL(file);
           }
         });
   
         urlInput.addEventListener('input', () => {
           if (urlInput.value.trim()) {
             previewImg.src = urlInput.value.trim();
           }
         });
       },
       preConfirm: () => {
         const imgUrl = tempUploadedBase64 || document.getElementById('swal-slide-img').value.trim();
         if (!imgUrl) {
           Swal.showValidationMessage('يرجى رفع أو إدخال رابط صورة السلايدر!');
           return false;
         }
         return {
           image_url: imgUrl,
           link_url: document.getElementById('swal-slide-link').value.trim() || 'products.html',
           is_active: true,
           display_order: 0
         };
       }
     });
   
     if (formValues) {
       await _supabase.from("hero_slides").insert([formValues]);
       Swal.fire({ icon: 'success', title: 'تمت إضافة ونشر صورة السلايدر بنجاح!', confirmButtonColor: '#e60023' });
       loadAdminSlider();
     }
   }
   
   async function updateSlideOrder(id, newOrder) {
     await _supabase.from("hero_slides").update({ display_order: Number(newOrder) }).eq("id", id);
     loadAdminSlider();
   }
   
   async function toggleSlideActive(id, currentStatus) {
     await _supabase.from("hero_slides").update({ is_active: !currentStatus }).eq("id", id);
     loadAdminSlider();
   }
   
   async function deleteSlide(id) {
     const hasPerm = await checkPermissionOrPrompt('manage_slider', 'حذف صور السلايدر');
     if (!hasPerm) return;
   
     const res = await Swal.fire({
       title: 'تأكيد حذف السلايد؟',
       icon: 'warning',
       showCancelButton: true,
       confirmButtonColor: '#e60023',
       confirmButtonText: 'حذف'
     });
   
     if (res.isConfirmed) {
       await _supabase.from("hero_slides").delete().eq("id", id);
       loadAdminSlider();
     }
   }
   
   /* 4. إدارة طلبات الشراء وتعديل الحالة المشروطة بالصلاحية */
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
               <select class="form-select form-select-sm d-inline-block w-auto" onchange="attemptUpdateOrderStatus('${o.id}', this.value)">
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
     const hasPerm = await checkPermissionOrPrompt('manage_orders', 'مراجعة طلبات الإلغاء');
     if (!hasPerm) return;
   
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
     const hasPerm = await checkPermissionOrPrompt('manage_orders', 'حذف الطلبات');
     if (!hasPerm) return;
   
     const res = await Swal.fire({
       title: 'تحذير: تأكيد حذف الطلب؟',
       text: "سيتم مسح هذا الطلب وبياناته نهائياً ولا يمكن استرجاعه!",
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
       loadDashboardStats();
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
   
   async function attemptUpdateOrderStatus(id, newStatus) {
     const hasPerm = await checkPermissionOrPrompt('manage_orders', 'تغيير حالة الطلب');
     if (!hasPerm) {
       loadAdminOrders();
       return;
     }
   
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
     loadDashboardStats();
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
     const hasPerm = await checkPermissionOrPrompt('manage_maintenance', 'تأكيد حجوزات الصيانة');
     if (!hasPerm) return;
   
     await _supabase.from("maintenance_requests").update({ status: "confirmed" }).eq("id", id);
     Swal.fire({ icon: 'success', title: 'تم تأكيد الميعاد!', confirmButtonColor: '#e60023' });
     loadAdminMaintenance();
   }
   
   async function deleteMaintenanceWithConfirm(id) {
     const hasPerm = await checkPermissionOrPrompt('manage_maintenance', 'حذف حجز صيانة');
     if (!hasPerm) return;
   
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
   
   /* 6. إدارة المستخدمين والعملاء وتعديل البيانات الفورية (Users Manager) */
   async function loadAdminUsersList(searchFilter = "") {
     const tbody = document.getElementById("admin-users-tbody");
     if (!tbody) return;
   
     try {
       let query = _supabase.from("user_profiles").select("*").order("updated_at", { ascending: false });
       const { data: users, error } = await query;
   
       if (error) throw error;
   
       if (!users || users.length === 0) {
         tbody.innerHTML = '<tr><td colspan="5" class="text-muted py-4">لا يوجد مستخدمون مسجلون بعد.</td></tr>';
         return;
       }
   
       let filtered = users;
       if (searchFilter) {
         filtered = users.filter(u => 
           (u.full_name && u.full_name.toLowerCase().includes(searchFilter.toLowerCase())) ||
           (u.phone && u.phone.includes(searchFilter))
         );
       }
   
       tbody.innerHTML = filtered.map(u => {
         const formattedPhone = (u.phone || '').replace(/\D/g, '');
         const waLink = formattedPhone.startsWith('0') ? `https://wa.me/2${formattedPhone}` : `https://wa.me/${formattedPhone}`;
   
         return `
           <tr>
             <td>
               <div class="d-flex align-items-center gap-2">
                 <img src="${u.avatar_url || 'https://via.placeholder.com/40'}" class="rounded-circle object-fit-cover" style="width: 35px; height: 35px;">
                 <span class="fw-bold text-dark">${u.full_name || 'عميل'}</span>
               </div>
             </td>
             <td>${u.phone || '-'}</td>
             <td style="max-width: 200px;" class="text-truncate">${u.address || '-'}</td>
             <td>
               <span class="badge ${u.is_blocked ? 'bg-danger' : 'bg-success'}">
                 ${u.is_blocked ? 'محظور' : 'نشط'}
               </span>
             </td>
             <td>
               <button class="btn btn-sm btn-outline-primary py-0 px-2 fw-bold me-1" onclick="editUserProfileByAdmin('${u.id}', '${encodeURIComponent(u.full_name || '')}', '${u.phone || ''}', '${encodeURIComponent(u.address || '')}')">
                 ✏️ تعديل
               </button>
               <a href="${waLink}" target="_blank" class="btn btn-sm btn-outline-success py-0 px-2 fw-bold me-1" title="تواصل واتساب">
                 💬 واتساب
               </a>
               <button class="btn btn-sm ${u.is_blocked ? 'btn-outline-success' : 'btn-outline-warning'} py-0 px-2 fw-bold me-1" onclick="toggleBlockUser('${u.id}', ${u.is_blocked})">
                 ${u.is_blocked ? 'إلغاء الحظر' : 'حظر'}
               </button>
               <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="deleteUser('${u.id}')" title="حذف المستخدم">
                 <i class="fa-solid fa-trash"></i>
               </button>
             </td>
           </tr>
         `;
       }).join("");
   
     } catch (err) {
       tbody.innerHTML = '<tr><td colspan="5" class="text-muted py-4">خطأ أثناء جلب قائمة المستخدمين.</td></tr>';
     }
   }
   
   /* نافذة تعديل بيانات أي عميل بصفة الأدمن */
   async function editUserProfileByAdmin(userId, encodedName, currentPhone, encodedAddress) {
     const hasPerm = await checkPermissionOrPrompt('manage_users', 'تعديل بيانات العميل');
     if (!hasPerm) return;
   
     const name = decodeURIComponent(encodedName);
     const address = decodeURIComponent(encodedAddress);
   
     const { value: formValues } = await Swal.fire({
       title: `تعديل بيانات العميل`,
       html: `
         <div class="text-start mb-2">
           <label class="form-label fw-bold small">الاسم بالكامل:</label>
           <input id="swal-user-name" class="form-control form-control-sm" value="${name}">
         </div>
         <div class="text-start mb-2">
           <label class="form-label fw-bold small">رقم الهاتف:</label>
           <input id="swal-user-phone" class="form-control form-control-sm" value="${currentPhone}">
         </div>
         <div class="text-start mb-2">
           <label class="form-label fw-bold small">عنوان الشحن:</label>
           <textarea id="swal-user-address" class="form-control form-control-sm" rows="3">${address}</textarea>
         </div>
       `,
       showCancelButton: true,
       confirmButtonColor: '#e60023',
       confirmButtonText: 'حفظ والتحديث',
       cancelButtonText: 'إلغاء',
       preConfirm: () => {
         return {
           full_name: document.getElementById('swal-user-name').value.trim(),
           phone: document.getElementById('swal-user-phone').value.trim(),
           address: document.getElementById('swal-user-address').value.trim()
         };
       }
     });
   
     if (formValues) {
       await _supabase.from("user_profiles").update({
         full_name: formValues.full_name,
         phone: formValues.phone,
         address: formValues.address,
         updated_at: new Date()
       }).eq("id", userId);
   
       Swal.fire({
         icon: 'success',
         title: 'تم تحديث بيانات العميل بنجاح!',
         confirmButtonColor: '#e60023'
       });
       loadAdminUsersList();
     }
   }
   
   async function toggleBlockUser(userId, currentBlocked) {
     const hasPerm = await checkPermissionOrPrompt('manage_users', 'حظر وإلغاء حظر المستخدمين');
     if (!hasPerm) return;
   
     await _supabase.from("user_profiles").update({ is_blocked: !currentBlocked }).eq("id", userId);
     loadAdminUsersList();
   }
   
   async function deleteUser(userId) {
     const hasPerm = await checkPermissionOrPrompt('manage_users', 'حذف المستخدمين');
     if (!hasPerm) return;
   
     const res = await Swal.fire({
       title: 'حذف بيانات المستخدم؟',
       icon: 'warning',
       showCancelButton: true,
       confirmButtonColor: '#e60023',
       confirmButtonText: 'حذف'
     });
   
     if (res.isConfirmed) {
       await _supabase.from("user_profiles").delete().eq("id", userId);
       loadAdminUsersList();
     }
   }
   
   /* 7. جلب وإدارة المنتجات المضافة */
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
   
       const isLocal = window.location.protocol === 'file:' || window.location.pathname.endsWith('.html');
   
       tbody.innerHTML = data.map(p => {
         const editUrl = isLocal ? `add-product.html?id=${p.id}` : `/admin/add-product?id=${p.id}`;
   
         return `
           <tr>
             <td><img src="${(p.images && p.images[0]) ? p.images[0] : 'https://via.placeholder.com/40'}" style="width: 40px; height: 40px; object-fit: contain;"></td>
             <td class="fw-bold">${p.title}</td>
             <td><span class="badge bg-light text-dark border">${p.category_slug}</span></td>
             <td class="fw-bold text-danger">${Number(p.price).toLocaleString()} ج.م</td>
             <td>
               <a href="${editUrl}" class="btn btn-sm btn-outline-primary">تعديل حي</a>
             </td>
             <td>
               <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct('${p.id}')"><i class="fa-solid fa-trash"></i> حذف</button>
             </td>
           </tr>
         `;
       }).join("");
     } catch (err) {
       tbody.innerHTML = '<tr><td colspan="6" class="text-muted py-4">خطأ أثناء تحميل المنتجات.</td></tr>';
     }
   }
   
   async function deleteProduct(id) {
     const hasPerm = await checkPermissionOrPrompt('manage_products', 'حذف المنتجات');
     if (!hasPerm) return;
   
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
       loadDashboardStats();
     }
   }
   
   /* 8. جلب وإدارة مراجعات وتقييمات العملاء */
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
     const hasPerm = await checkPermissionOrPrompt('manage_reviews', 'حذف التقييمات');
     if (!hasPerm) return;
   
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
   
   /* 9. إدارة حسابات الأدمنز ونظام الصلاحيات الشامل (Checkboxes Permissions) */
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
                 <th>الصلاحيات التفصيلية</th>
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
                     <button class="btn btn-sm btn-outline-danger py-0 px-2 fw-bold" onclick="openPermissionsModal('${u.id}', '${u.full_name || 'أدمن'}')">
                       ⚙️ الصلاحيات
                     </button>
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
   
   /* جلب وعرض طلبات الصلاحيات المرفوعة للسوبر أدمن */
   async function loadPermissionRequestsBoard() {
     const container = document.getElementById("permission-requests-board");
     if (!container) return;
   
     try {
       const { data: reqs, error } = await _supabase
         .from("permission_requests")
         .select("*")
         .eq("status", "pending")
         .order("created_at", { ascending: false });
   
       if (error) throw error;
   
       if (!reqs || reqs.length === 0) {
         container.innerHTML = '<div class="text-muted small py-3 text-center">لا توجد طلبات صلاحيات معلقة حالياً.</div>';
         return;
       }
   
       container.innerHTML = `
         <div class="table-responsive">
           <table class="table table-bordered align-middle text-center small m-0">
             <thead class="table-light">
               <tr>
                 <th>ID الأدمن</th>
                 <th>الصلاحية المطلوبة</th>
                 <th>السبب والملاحظات</th>
                 <th>تاريخ الطلب</th>
                 <th>القرار</th>
               </tr>
             </thead>
             <tbody>
               ${reqs.map(r => `
                 <tr>
                   <td class="fw-bold">${r.admin_id.toString().slice(0, 8)}...</td>
                   <td><span class="badge bg-danger">${r.requested_permission}</span></td>
                   <td class="text-start small">${r.notes || 'بدون ملاحظات'}</td>
                   <td class="text-muted fs-9">${new Date(r.created_at).toLocaleDateString('ar-EG')}</td>
                   <td>
                     ${currentUserRole === 'super_admin' ? `
                       <button class="btn btn-sm btn-success py-0 px-2 fw-bold" onclick="grantPermissionRequest('${r.id}', '${r.admin_id}', '${r.requested_permission}')">قبول وتفعيل</button>
                       <button class="btn btn-sm btn-outline-secondary py-0 px-2 ms-1" onclick="rejectPermissionRequest('${r.id}')">رفض</button>
                     ` : '<span class="text-muted fs-9">مخصصة للسوبر أدمن</span>'}
                   </td>
                 </tr>
               `).join('')}
             </tbody>
           </table>
         </div>
       `;
   
     } catch (err) {
       container.innerHTML = '<div class="text-muted small py-3 text-center">لا توجد طلبات معلقة.</div>';
     }
   }
   
   async function grantPermissionRequest(reqId, adminId, permId) {
     await _supabase.from("admin_permissions").insert([{ admin_id: adminId, permission_id: permId }]);
     await _supabase.from("permission_requests").update({ status: 'approved' }).eq("id", reqId);
   
     Swal.fire({ icon: 'success', title: 'تمت الموافقة وتفعيل الصلاحية للأدمن!', confirmButtonColor: '#e60023' });
     loadPermissionRequestsBoard();
   }
   
   async function rejectPermissionRequest(reqId) {
     await _supabase.from("permission_requests").update({ status: 'rejected' }).eq("id", reqId);
     Swal.fire({ icon: 'info', title: 'تم رفض الطلب.', confirmButtonColor: '#e60023' });
     loadPermissionRequestsBoard();
   }
   
   /* نافذة تحديد الصلاحيات بنظام Checkboxes مع تفعيل علامة الصح تلقائياً */
   async function openPermissionsModal(adminId, adminName) {
     if (currentUserRole !== 'super_admin') {
       const hasPerm = await checkPermissionOrPrompt('manage_admins', 'تعديل صلاحيات الأدمنز');
       if (!hasPerm) return;
     }
   
     // جلب مصفوفة الصلاحيات الخاصة بهذا الأدمن وتحديد علامة الصح
     const { data: savedPerms } = await _supabase.from("admin_permissions").select("permission_id").eq("admin_id", adminId);
     const activePermsList = savedPerms ? savedPerms.map(p => p.permission_id) : [];
   
     const permissionsList = [
       { id: 'manage_products', label: 'إدارة وتعديل المنتجات' },
       { id: 'manage_orders', label: 'إدارة وتتبع طلبات الشراء' },
       { id: 'manage_slider', label: 'إدارة صور السلايدر الرئيسي' },
       { id: 'manage_users', label: 'إدارة وحظر المستخدمين' },
       { id: 'manage_maintenance', label: 'إدارة وتأكيد حجوزات الصيانة' },
       { id: 'manage_reviews', label: 'إدارة وتعديل التقييمات' },
       { id: 'manage_admins', label: 'إدارة واعتماد الأدمنز' },
       { id: 'manage_contacts', label: 'إدارة أرقام الواتساب والدعم' },
       { id: 'view_stats', label: 'عرض الإحصائيات والمبيعات' }
     ];
   
     const checkboxesHtml = permissionsList.map(p => `
       <div class="col-6 text-start mb-2">
         <div class="form-check">
           <input class="form-check-input perm-checkbox" type="checkbox" value="${p.id}" id="perm-${p.id}" ${activePermsList.includes(p.id) ? 'checked' : ''}>
           <label class="form-check-label small fw-bold text-dark" for="perm-${p.id}">
             ${p.label}
           </label>
         </div>
       </div>
     `).join("");
   
     const { isConfirmed } = await Swal.fire({
       title: `صلاحيات الأدمن: ${adminName}`,
       html: `
         <div class="row g-2 p-2 border bg-light rounded text-start">
           ${checkboxesHtml}
         </div>
       `,
       showCancelButton: true,
       confirmButtonColor: '#e60023',
       confirmButtonText: 'حفظ الصلاحيات',
       cancelButtonText: 'إلغاء'
     });
   
     if (isConfirmed) {
       const selectedCheckboxes = document.querySelectorAll('.perm-checkbox:checked');
       const newPerms = Array.from(selectedCheckboxes).map(cb => ({
         admin_id: adminId,
         permission_id: cb.value
       }));
   
       await _supabase.from("admin_permissions").delete().eq("admin_id", adminId);
       if (newPerms.length > 0) {
         await _supabase.from("admin_permissions").insert(newPerms);
       }
   
       Swal.fire({ icon: 'success', title: 'تم حفظ وتحديث الصلاحيات بنجاح!', confirmButtonColor: '#e60023' });
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
   
   /* 10. إدارة أرقام الواتساب والدعم الفني المباشر */
   async function loadStoreContactsManager() {
     const container = document.getElementById("store-contacts-container");
     if (!container) return;
   
     try {
       const { data: contacts } = await _supabase.from("store_contacts").select("*").order("created_at", { ascending: false });
       if (!contacts || contacts.length === 0) {
         container.innerHTML = '<div class="text-muted small py-2 text-center">لا توجد أرقام تواصل مضافة حالياً.</div>';
         return;
       }
   
       container.innerHTML = contacts.map(c => {
         const formattedPhone = c.phone_number.replace(/\D/g, '');
         const waLink = formattedPhone.startsWith('0') ? `https://wa.me/2${formattedPhone}` : `https://wa.me/${formattedPhone}`;
   
         return `
           <div class="d-flex justify-content-between align-items-center border-bottom py-2">
             <div class="text-start">
               <strong class="d-block text-dark">${c.label_name}</strong>
               <span class="text-muted fs-9">${c.phone_number}</span>
             </div>
             <div class="d-flex gap-1">
               <a href="${waLink}" target="_blank" class="btn btn-sm btn-outline-success py-0 px-2 fs-9">شات</a>
               <button class="btn btn-sm btn-outline-danger py-0 px-2 fs-9" onclick="deleteContactNumber('${c.id}')"><i class="fa-solid fa-trash"></i></button>
             </div>
           </div>
         `;
       }).join('');
     } catch (err) {
       console.error("Contacts load error:", err);
     }
   }
   
   async function openAddContactModal() {
     const hasPerm = await checkPermissionOrPrompt('manage_contacts', 'إدارة أرقام التواصل والدعم');
     if (!hasPerm) return;
   
     const { value: formValues } = await Swal.fire({
       title: 'إضافة رقم واتساب / دعم جديد',
       html: `
         <div class="text-start mb-2">
           <label class="form-label fw-bold small">اسم الموظف / الفرع:</label>
           <input id="swal-contact-label" class="form-control form-control-sm" placeholder="مثال: الدعم والواتساب - فرع السلام">
         </div>
         <div class="text-start mb-2">
           <label class="form-label fw-bold small">رقم الموبايل (11 رقم):</label>
           <input id="swal-contact-phone" class="form-control form-control-sm" placeholder="01111757936">
         </div>
       `,
       showCancelButton: true,
       confirmButtonColor: '#e60023',
       confirmButtonText: 'إضافة وتحفظ',
       cancelButtonText: 'إلغاء',
       preConfirm: () => {
         const label = document.getElementById('swal-contact-label').value.trim();
         const phone = document.getElementById('swal-contact-phone').value.trim();
   
         if (!label || !phone) {
           Swal.showValidationMessage('يرجى كتابة الاسم ورقم الهاتف!');
           return false;
         }
         return { label_name: label, phone_number: phone };
       }
     });
   
     if (formValues) {
       await _supabase.from("store_contacts").insert([formValues]);
       Swal.fire({ icon: 'success', title: 'تمت إضافة رقم الواتساب بنجاح!', confirmButtonColor: '#e60023' });
       loadStoreContactsManager();
     }
   }
   
   async function deleteContactNumber(id) {
     const hasPerm = await checkPermissionOrPrompt('manage_contacts', 'حذف أرقام التواصل');
     if (!hasPerm) return;
   
     await _supabase.from("store_contacts").delete().eq("id", id);
     loadStoreContactsManager();
   }
   
   /* 11. شاشة استعراض رسائل "تواصل معنا" المباشرة وفتح الواتساب التلقائي */
   async function loadContactMessagesBoard() {
     const tbody = document.getElementById("contact-messages-tbody");
     if (!tbody) return;
   
     try {
       const { data: msgs, error } = await _supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
       if (error || !msgs || msgs.length === 0) {
         tbody.innerHTML = '<tr><td colspan="5" class="text-muted py-4">لا توجد رسائل مستلمة حتى الآن.</td></tr>';
         return;
       }
   
       tbody.innerHTML = msgs.map(m => {
         const rawPhone = m.user_phone || '';
         const formattedPhone = rawPhone.replace(/\D/g, '');
         const waLink = formattedPhone.startsWith('0') ? `https://wa.me/2${formattedPhone}` : `https://wa.me/${formattedPhone}`;
   
         return `
           <tr>
             <td class="fw-bold">${m.user_name || 'عميل'}</td>
             <td>${m.user_phone || m.user_email || '-'}</td>
             <td class="text-start small" style="max-width: 250px;">${m.message_body}</td>
             <td class="text-muted fs-9">${new Date(m.created_at).toLocaleDateString('ar-EG')}</td>
             <td>
               <a href="${waLink}" target="_blank" class="btn btn-sm btn-outline-success py-0 px-2 fw-bold me-1">💬 رَد</a>
               <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="deleteContactMessage('${m.id}')"><i class="fa-solid fa-trash"></i></button>
             </td>
           </tr>
         `;
       }).join('');
     } catch (err) {
       tbody.innerHTML = '<tr><td colspan="5" class="text-muted py-4">خطأ في جلب الرسائل.</td></tr>';
     }
   }
   
   async function deleteContactMessage(id) {
     await _supabase.from("contact_messages").delete().eq("id", id);
     loadContactMessagesBoard();
   }