/* ==========================================
   ANO Store - Profile, Live Order Tracking & Reviews Engine
   Clean URLs & Enhanced Rating Engine
   ========================================== */

   let currentUserId = null;
   let currentUserEmail = "";
   
   document.addEventListener("DOMContentLoaded", async () => {
     await initUserProfile();
     initAvatarUploadEvents();
   
     const profileForm = document.getElementById("profile-update-form");
     if (profileForm) {
       profileForm.addEventListener("submit", handleProfileUpdate);
     }
   });
   
   async function initUserProfile() {
     if (typeof _supabase === "undefined") return;
   
     const { data: { session } } = await _supabase.auth.getSession();
   
     if (!session || !session.user) {
       Swal.fire({
         icon: 'info',
         title: 'يرجى تسجيل الدخول!',
         text: 'يجب تسجيل الدخول لعرض بروفايلك وتتبع طلباتك.',
         confirmButtonColor: '#e60023'
       }).then(() => {
         window.location.href = "/login";
       });
       return;
     }
   
     currentUserId = session.user.id;
     currentUserEmail = session.user.email;
   
     const emailDisplay = document.getElementById("profile-display-email");
     if (emailDisplay) emailDisplay.innerText = currentUserEmail;
   
     // جلب الصورة والبيانات المخزنة
     const { data: profiles } = await _supabase
       .from("user_profiles")
       .select("*")
       .eq("id", currentUserId);
   
     const profile = profiles && profiles.length > 0 ? profiles[0] : null;
   
     const fullName = profile?.full_name || session.user.user_metadata?.full_name || currentUserEmail.split("@")[0];
     const phone = profile?.phone || session.user.user_metadata?.phone || "";
     const address = profile?.address || "";
     const avatarUrl = profile?.avatar_url || "https://via.placeholder.com/150";
   
     const nameDisplay = document.getElementById("profile-display-fullname");
     if (nameDisplay) nameDisplay.innerText = fullName;
   
     const nameInput = document.getElementById("profile-input-name");
     if (nameInput) nameInput.value = fullName;
   
     const phoneInput = document.getElementById("profile-input-phone");
     if (phoneInput) phoneInput.value = phone;
   
     const addressInput = document.getElementById("profile-input-address");
     if (addressInput) addressInput.value = address;
     
     const avatarImg = document.getElementById("user-avatar-img");
     if (avatarImg) avatarImg.src = avatarUrl;
   
     const deleteAvatarBtn = document.getElementById("btn-delete-avatar");
     if (deleteAvatarBtn && profile?.avatar_url) {
       deleteAvatarBtn.classList.remove("d-none");
     }
   
     loadUserOrders(phone);
     loadUserOrderHistory(phone);
   }
   
   function initAvatarUploadEvents() {
     const fileInput = document.getElementById("avatar-input-file");
     const deleteBtn = document.getElementById("btn-delete-avatar");
   
     if (fileInput) {
       fileInput.addEventListener("change", async (e) => {
         const file = e.target.files[0];
         if (!file) return;
   
         const reader = new FileReader();
         reader.onload = async (evt) => {
           const base64Img = evt.target.result;
           const avatarImg = document.getElementById("user-avatar-img");
           if (avatarImg) avatarImg.src = base64Img;
   
           // حفظ الصورة دائماً بـ upsert
           await _supabase.from("user_profiles").upsert({
             id: currentUserId,
             avatar_url: base64Img,
             updated_at: new Date()
           });
   
           if (deleteBtn) deleteBtn.classList.remove("d-none");
   
           Swal.fire({
             icon: 'success',
             title: 'تم حفظ وتحديث صورتك الشخصية!',
             toast: true,
             position: 'top-end',
             showConfirmButton: false,
             timer: 1500
           });
         };
         reader.readAsDataURL(file);
       });
     }
   
     if (deleteBtn) {
       deleteBtn.addEventListener("click", async () => {
         const defaultImg = "https://via.placeholder.com/150";
         const avatarImg = document.getElementById("user-avatar-img");
         if (avatarImg) avatarImg.src = defaultImg;
   
         await _supabase.from("user_profiles").update({ avatar_url: null }).eq("id", currentUserId);
         deleteBtn.classList.add("d-none");
   
         Swal.fire({
           icon: 'info',
           title: 'تم حذف الصورة الشخصية',
           toast: true,
           position: 'top-end',
           showConfirmButton: false,
           timer: 1500
         });
       });
     }
   }
   
   async function handleProfileUpdate(e) {
     e.preventDefault();
   
     const name = document.getElementById("profile-input-name").value.trim();
     const phone = document.getElementById("profile-input-phone").value.trim();
     const address = document.getElementById("profile-input-address").value.trim();
     const saveBtn = document.getElementById("btn-save-profile");
   
     saveBtn.disabled = true;
     saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>جاري الحفظ...';
   
     try {
       const { error } = await _supabase.from("user_profiles").upsert({
         id: currentUserId,
         full_name: name,
         phone: phone,
         address: address,
         updated_at: new Date()
       });
   
       if (error) throw error;
   
       const nameDisplay = document.getElementById("profile-display-fullname");
       if (nameDisplay) nameDisplay.innerText = name;
       localStorage.setItem("ano_user_name", name);
   
       Swal.fire({
         icon: 'success',
         title: 'تم حفظ وتحديث بياناتك بنجاح!',
         confirmButtonColor: '#e60023'
       });
   
     } catch (err) {
       Swal.fire({
         icon: 'error',
         title: 'فشل تحديث البيانات',
         text: err.message || 'تعذر التواصل مع قاعدة البيانات.',
         confirmButtonColor: '#e60023'
       });
     } finally {
       saveBtn.disabled = false;
       saveBtn.innerHTML = 'حفظ والتحديث <i class="fa-solid fa-floppy-disk ms-1"></i>';
     }
   }
   
   async function loadUserOrders(userPhone = "") {
     const tbody = document.getElementById("user-orders-tbody");
     if (!tbody) return;
   
     try {
       let query = _supabase.from("orders").select("*");
   
       if (userPhone) {
         query = query.or(`client_email.eq.${currentUserEmail},client_phone.eq.${userPhone}`);
       } else {
         query = query.eq("client_email", currentUserEmail);
       }
   
       const { data: orders, error } = await query.order("created_at", { ascending: false });
   
       if (error) throw error;
   
       if (!orders || orders.length === 0) {
         tbody.innerHTML = '<tr><td colspan="5" class="text-muted py-4">لا توجد طلبات شراء مسجلة باسمك حتى الآن.</td></tr>';
         return;
       }
   
       tbody.innerHTML = orders.map((o) => `
         <tr>
           <td class="fw-bold">#${o.id.toString().slice(-6)}</td>
           <td style="max-width:180px;">${o.shipping_address || 'استلام فرع'}</td>
           <td><span class="badge bg-light text-dark border">${getPaymentMethodArabic(o.payment_method)}</span></td>
           <td>
             <span class="badge ${getStatusBadgeClass(o.tracking_status)}">
               ${getStatusTextArabic(o.tracking_status)}
             </span>
             ${o.cancel_requested ? '<br><span class="badge bg-danger mt-1">طلب إلغاء قيد المراجعة</span>' : ''}
             ${o.expedite_requested ? '<br><span class="badge bg-warning text-dark mt-1">⚡ تسريع مطلوب</span>' : ''}
           </td>
           <td>
             ${o.tracking_status !== 'cancelled' && o.tracking_status !== 'delivered' && !o.cancel_requested ? `
               <button class="btn btn-sm btn-outline-danger me-1 py-0 px-2" onclick="requestExpedite('${o.id}')" title="طلب تسريع الشحن">
                 ⚡ تسريع
               </button>
               <button class="btn btn-sm btn-outline-secondary py-0 px-2" onclick="cancelOrderWithReason('${o.id}')" title="طلب إلغاء الطلب">
                 ✖ إلغاء
               </button>
             ` : '<span class="text-muted fs-9">غير متاح للإلغاء</span>'}
           </td>
         </tr>
       `).join("");
   
     } catch (err) {
       tbody.innerHTML = '<tr><td colspan="5" class="text-muted py-4">لا توجد طلبات شراء مسجلة باسمك حتى الآن.</td></tr>';
     }
   }
   
   /* جلب وعرض سجل الطلبات التفصيلي والمنتجات للتقييم */
   async function loadUserOrderHistory(userPhone = "") {
     const container = document.getElementById("dynamic-order-history-container");
     if (!container) return;
   
     try {
       let query = _supabase.from("orders").select("*");
       if (userPhone) {
         query = query.or(`client_email.eq.${currentUserEmail},client_phone.eq.${userPhone}`);
       } else {
         query = query.eq("client_email", currentUserEmail);
       }
   
       const { data: orders, error } = await query.order("created_at", { ascending: false });
   
       if (error) throw error;
   
       if (!orders || orders.length === 0) {
         container.innerHTML = '<div class="text-muted small py-4 text-center">لا يوجد سجل طلبات سابق.</div>';
         return;
       }
   
       container.innerHTML = orders.map(o => {
         const items = o.items || [];
         const itemsHtml = items.map(i => `
           <div class="d-flex justify-content-between align-items-center p-2 border-bottom">
             <div class="d-flex align-items-center gap-2">
               <img src="${i.image || 'https://via.placeholder.com/40'}" style="width: 40px; height: 40px; object-fit: contain;">
               <div>
                 <strong class="d-block small text-dark">${i.title}</strong>
                 <span class="text-muted fs-9">السعر: ${Number(i.price).toLocaleString()} ج.م | الكمية: ${i.quantity || 1}</span>
               </div>
             </div>
             <div>
               <button class="btn btn-sm btn-outline-warning text-dark py-1 px-2 fw-bold" onclick="openProductReviewModal('${i.id || o.id}', '${encodeURIComponent(i.title)}')">
                 ⭐ تقييم المنتج
               </button>
             </div>
           </div>
         `).join("");
   
         return `
           <div class="card border mb-3 rounded-3 shadow-sm">
             <div class="card-header bg-light d-flex justify-content-between align-items-center">
               <span class="fw-bold text-danger">طلب #${o.id.toString().slice(-6)}</span>
               <span class="badge ${getStatusBadgeClass(o.tracking_status)}">${getStatusTextArabic(o.tracking_status)}</span>
             </div>
             <div class="card-body p-2">
               ${itemsHtml || '<p class="text-muted small m-0">لا توجد تفاصيل.</p>'}
               <div class="d-flex justify-content-between align-items-center mt-2 pt-2 border-top fs-9">
                 <span class="text-muted">طريقة الدفع: ${getPaymentMethodArabic(o.payment_method)}</span>
                 <strong class="text-danger">الإجمالي: ${Number(o.total_price || 0).toLocaleString()} ج.م</strong>
               </div>
             </div>
           </div>
         `;
       }).join("");
   
     } catch (err) {
       container.innerHTML = '<div class="text-muted small py-4 text-center">خطأ أثناء تحميل سجل الطلبات.</div>';
     }
   }
   
   /* نافذة إضافة تقييم وكومنت للمنتج */
   async function openProductReviewModal(productId, encodedTitle) {
     const title = decodeURIComponent(encodedTitle);
     const userName = document.getElementById("profile-display-fullname")?.innerText || "عميل مميز";
   
     const { value: formValues } = await Swal.fire({
       title: `تقييم: ${title}`,
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
           user_id: currentUserId,
           user_name: userName,
           rating: formValues.rating,
           comment: formValues.comment
         }]);
   
         Swal.fire({
           icon: 'success',
           title: 'شكراً لتقييمك!',
           text: 'تم نشر تقييمك ورأيك في صفحة المنتج بنجاح.',
           confirmButtonColor: '#e60023'
         });
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
   
   function getPaymentMethodArabic(method) {
     switch (method) {
       case 'instapay': return 'InstaPay';
       case 'vodafone_cash': return 'فودافون كاش';
       case 'etisalat_cash': return 'اتصالات كاش';
       case 'fawry': return 'فوري باي';
       case 'branch_pickup': return 'استلام من الفرع';
       default: return 'دفع عند الاستلام';
     }
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
       case 'cancelled': return 'ملغي';
       case 'processing': return 'قيد التجهيز';
       default: return 'قيد الانتظار';
     }
   }
   
   async function requestExpedite(orderId) {
     await _supabase.from("orders").update({ expedite_requested: true }).eq("id", orderId);
     Swal.fire({
       icon: 'success',
       title: 'تم إرسال طلب تسريع الشحن!',
       text: 'تم إخطار فريق الدعم لسرعة تجهيز وشحن طلبك.',
       confirmButtonColor: '#e60023'
     });
     initUserProfile();
   }
   
   async function cancelOrderWithReason(orderId) {
     const { value: reason } = await Swal.fire({
       title: 'طلب إلغاء الشراء',
       input: 'textarea',
       inputLabel: 'يرجى كتابة سبب إلغاء الطلب:',
       inputPlaceholder: 'اكتب سبب الإلغاء هنا بالتفصيل...',
       inputAttributes: { 'aria-label': 'اكتب سبب الإلغاء هنا' },
       showCancelButton: true,
       confirmButtonColor: '#e60023',
       cancelButtonColor: '#6c757d',
       confirmButtonText: 'إرسال طلب الإلغاء',
       cancelButtonText: 'تراجع',
       inputValidator: (value) => {
         if (!value) {
           return 'يجب كتابة سبب الإلغاء لإرسال الطلب!';
         }
       }
     });
   
     if (reason) {
       await _supabase.from("orders").update({
         cancel_requested: true,
         cancellation_reason: reason
       }).eq("id", orderId);
   
       Swal.fire({
         icon: 'info',
         title: 'تم تسجيل طلب الإلغاء بنجاح!',
         text: 'تم إرسال طلبك للـ الأدمن للمراجعة والقبول، وسيتم التواصل معك لإعادة أي مبالغ مالية مدفوعة.',
         confirmButtonColor: '#e60023'
       });
       
       initUserProfile();
     }
   }