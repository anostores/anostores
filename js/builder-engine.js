/* ==========================================================================
   ANO Store - Live Product Builder Engine
   With Automatic Dynamic Slug Generator & Fallback Handling
   ========================================================================== */

   let currentEditProductId = null;
   let uploadedFileBase64 = '';
   const placeholderSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'><rect width='100%' height='100%' fill='%23fff0f2'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%23e60023'>معاينة صورة المنتج</text></svg>";
   
   document.addEventListener('DOMContentLoaded', async function () {
     bindEvents();
     renderVirtualPreview();
   
     const urlParams = new URLSearchParams(window.location.search);
     currentEditProductId = urlParams.get('id');
   
     if (currentEditProductId) {
       document.getElementById('builderModeTitle').innerText = '⚡ محرر المنتجات الفوري (تعديل منتج قائم)';
       document.getElementById('saveProductLiveBtn').innerHTML = 'تحديث وحفظ المنتج <i class="fa-solid fa-floppy-disk ms-1"></i>';
       await loadProductDetails(currentEditProductId);
     }
   
     document.getElementById('saveProductLiveBtn').addEventListener('click', async function () {
       await saveProductData();
     });
   });
   
   /* 🌟 دالة الإشعارات الاحترافية (Chic Toast) */
   function showChicNotification(message, type = 'success') {
     const container = document.getElementById('chicToastContainer');
     if (!container) return;
   
     const iconClass = type === 'success' ? 'fa-circle-check text-success' : (type === 'error' ? 'fa-circle-xmark text-danger' : 'fa-triangle-exclamation text-warning');
     
     const toast = document.createElement('div');
     toast.className = `custom-chic-toast toast-${type}`;
     toast.innerHTML = `
       <div class="d-flex align-items-center gap-2">
         <i class="fa-solid ${iconClass} fs-5"></i>
         <span class="fw-bold fs-8 text-dark">${message}</span>
       </div>
       <button type="button" class="btn-close ms-3 fs-9" onclick="this.parentElement.remove()"></button>
     `;
   
     container.appendChild(toast);
   
     setTimeout(() => {
       toast.style.opacity = '0';
       toast.style.transform = 'translateY(-15px) scale(0.95)';
       toast.style.transition = 'all 0.3s ease';
       setTimeout(() => toast.remove(), 300);
     }, 3500);
   }
   
   /* دالة توليد Slug نظيف متوافق مع SEO من اسم المنتج */
   function generateSlug(text) {
     if (!text) return "";
     return text
       .toString()
       .trim()
       .toLowerCase()
       .replace(/\s+/g, '-')          // استبدال المسافات بشرطات
       .replace(/[^\w\u0600-\u06FF\-]+/g, '') // الحفاظ على الحروف العربية والإنجليزية والشرطات
       .replace(/\-\-+/g, '-')         // منع تكرار الشرطات المتتالية
       .replace(/^-+/, '')             // إزالة الشرطات من البداية
       .replace(/-+$/, '');            // إزالة الشرطات من النهاية
   }
   
   /* جلب بيانات المنتج في حالة التعديل */
   async function loadProductDetails(id) {
     try {
       const { data: p, error } = await _supabase.from('products').select('*').eq('id', id).single();
       if (error || !p) throw new Error('تعذر جلب بيانات المنتج من قاعدة البيانات');
   
       document.getElementById('inputTitle').value = p.title || '';
       if (document.getElementById('inputSlug')) {
         document.getElementById('inputSlug').value = p.slug || generateSlug(p.title);
       }
       document.getElementById('inputDiscountPrice').value = p.price || '';
       document.getElementById('inputOriginalPrice').value = p.original_price || '';
       document.getElementById('inputBrand').value = p.brand || '';
       document.getElementById('selectCategory').value = p.category_slug || 'used-phones';
       document.getElementById('selectStockStatus').value = p.stock_status || 'in_stock';
       document.getElementById('inputMainImgUrl').value = (p.images && p.images[0]) ? p.images[0] : '';
       document.getElementById('inputSpecs').value = p.specs || '';
       document.getElementById('inputDescription').value = p.description || '';
   
       if (p.images && Array.isArray(p.images) && p.images.length > 1) {
         document.getElementById('inputGalleryUrls').value = p.images.slice(1).join('\n');
       }
   
       renderVirtualPreview();
   
     } catch (err) {
       showChicNotification('❌ ' + err.message, 'error');
     }
   }
   
   /* ربط الأحداث للتفاعل الفوري مع المعاينة وتوليد الـ Slug */
   function bindEvents() {
     const titleInput = document.getElementById('inputTitle');
     const slugInput = document.getElementById('inputSlug');
   
     if (titleInput) {
       titleInput.addEventListener('input', function() {
         if (slugInput && (!slugInput.dataset.userModified || slugInput.value.trim() === '')) {
           slugInput.value = generateSlug(this.value);
         }
       });
     }
   
     if (slugInput) {
       slugInput.addEventListener('input', function() {
         this.dataset.userModified = 'true';
       });
     }
   
     const inputIds = [
       'inputTitle', 'inputDiscountPrice', 'inputOriginalPrice',
       'inputBrand', 'selectCategory', 'selectStockStatus',
       'inputMainImgUrl', 'inputGalleryUrls', 'inputSpecs', 'inputDescription'
     ];
   
     inputIds.forEach(id => {
       const el = document.getElementById(id);
       if (el) {
         el.addEventListener('input', renderVirtualPreview);
         el.addEventListener('keyup', renderVirtualPreview);
         el.addEventListener('change', renderVirtualPreview);
       }
     });
   
     const fileInput = document.getElementById('inputImageFile');
     if (fileInput) {
       fileInput.addEventListener('change', function (e) {
         const file = e.target.files[0];
         if (file) {
           const reader = new FileReader();
           reader.onload = function (evt) {
             uploadedFileBase64 = evt.target.result;
             renderVirtualPreview();
           };
           reader.readAsDataURL(file);
         }
       });
     }
   
     const fontSlider = document.getElementById('fontSizeSlider');
     if (fontSlider) {
       fontSlider.addEventListener('input', function() {
         const size = this.value + 'px';
         document.getElementById('fontSizeDisplay').innerText = size;
         document.getElementById('vDescriptionText').style.fontSize = size;
       });
     }
   }
   
   /* دالة المعاينة الحية اللحظية (Live Preview) */
   function renderVirtualPreview() {
     const titleEl = document.getElementById('inputTitle');
     const title = (titleEl && titleEl.value.trim()) ? titleEl.value.trim() : 'عنوان واسم المنتج يظهر هنا بشكل عريض وواضح...';
   
     const discPrice = parseFloat(document.getElementById('inputDiscountPrice')?.value || '0') || 0;
     const origPrice = parseFloat(document.getElementById('inputOriginalPrice')?.value || '0') || 0;
     const brand = document.getElementById('inputBrand')?.value.trim() || 'العلامة التجارية';
     const categorySelect = document.getElementById('selectCategory');
     const categoryText = categorySelect ? categorySelect.options[categorySelect.selectedIndex].text : 'القسم';
     const stockStatus = document.getElementById('selectStockStatus')?.value || 'in_stock';
     
     const urlImg = document.getElementById('inputMainImgUrl')?.value.trim() || '';
     const mainImg = uploadedFileBase64 || urlImg || placeholderSvg;
   
     const galleryText = document.getElementById('inputGalleryUrls')?.value.trim() || '';
     const specsText = document.getElementById('inputSpecs')?.value.trim() || '';
     const descText = document.getElementById('inputDescription')?.value.trim() || 'اكتب وصف ومميزات المنتج بداخل القائمة الجانبية ليظهر النص هنا مباشرة ومتحكم بحجم خطه...';
   
     if(document.getElementById('vTitle')) document.getElementById('vTitle').innerText = title;
     if(document.getElementById('vBrandBadge')) document.getElementById('vBrandBadge').innerText = brand;
     if(document.getElementById('vCategoryBadge')) document.getElementById('vCategoryBadge').innerText = categoryText;
     if(document.getElementById('vDiscountPrice')) document.getElementById('vDiscountPrice').innerText = `${discPrice.toLocaleString()} ج.م`;
     if(document.getElementById('vOriginalPrice')) document.getElementById('vOriginalPrice').innerText = origPrice > 0 ? `${origPrice.toLocaleString()} ج.م` : '';
     if(document.getElementById('vDescriptionText')) document.getElementById('vDescriptionText').innerText = descText;
   
     const discBadge = document.getElementById('vDiscountBadge');
     if (discBadge) {
       if (origPrice > 0 && discPrice > 0 && origPrice > discPrice) {
         const percent = Math.round(((origPrice - discPrice) / origPrice) * 100);
         discBadge.innerText = `خصم ${percent}%`;
         discBadge.classList.remove('d-none');
       } else {
         discBadge.classList.add('d-none');
       }
     }
   
     const stockBadge = document.getElementById('vStockBadge');
     if (stockBadge) {
       if (stockStatus === 'out_of_stock') {
         stockBadge.className = 'badge bg-danger text-white px-3 py-1 rounded-pill fs-8 fw-bold';
         stockBadge.innerText = '⚠️ نفدت الكمية';
       } else if (stockStatus === 'limited') {
         stockBadge.className = 'badge bg-warning text-dark px-3 py-1 rounded-pill fs-8 fw-bold';
         stockBadge.innerText = 'قطع قليلة بالمخزن';
       } else {
         stockBadge.className = 'badge bg-success bg-opacity-10 text-success px-3 py-1 rounded-pill fs-8 fw-bold';
         stockBadge.innerText = 'متوفر بالمخزن';
       }
     }
   
     const mainImgEl = document.getElementById('vMainImg');
     if (mainImgEl) {
       mainImgEl.src = mainImg;
       mainImgEl.onerror = function() { this.src = placeholderSvg; };
     }
   
     const galleryWrapper = document.getElementById('vGalleryThumbsWrapper');
     if (galleryWrapper) {
       galleryWrapper.innerHTML = '';
   
       let galleryArray = [mainImg];
       if (galleryText) {
         const additionalImgs = galleryText.split('\n').map(u => u.trim()).filter(Boolean);
         galleryArray = [...new Set([...galleryArray, ...additionalImgs])];
       }
   
       galleryArray.forEach((url, idx) => {
         const imgThumb = document.createElement('img');
         imgThumb.src = url;
         imgThumb.className = `gallery-thumb-item ${idx === 0 ? 'active' : ''}`;
         imgThumb.onerror = function() { this.src = placeholderSvg; };
         imgThumb.onclick = function() {
           if(mainImgEl) mainImgEl.src = url;
           document.querySelectorAll('.gallery-thumb-item').forEach(i => i.classList.remove('active'));
           this.classList.add('active');
         };
         galleryWrapper.appendChild(imgThumb);
       });
     }
   
     const specsBody = document.getElementById('vSpecsTableBody');
     if (specsBody) {
       if (specsText) {
         const lines = specsText.split('\n').filter(Boolean);
         specsBody.innerHTML = lines.map(line => {
           const parts = line.split(':');
           const key = parts[0] ? parts[0].trim() : 'المواصفة';
           const val = parts[1] ? parts.slice(1).join(':').trim() : '-';
           return `
             <tr>
               <td class="fw-bold text-dark w-50">${key}</td>
               <td class="text-secondary">${val}</td>
             </tr>
           `;
         }).join('');
       } else {
         specsBody.innerHTML = `<tr><td colspan="2" class="text-muted text-center py-2 fs-9">اكتب المواصفات بالجوار لتظهر في الجدول...</td></tr>`;
       }
     }
   }
   
   /* حفظ المنتج ونشره مباشرة في Supabase مع الحماية من خطأ 400 */
   async function saveProductData() {
     const title = document.getElementById('inputTitle').value.trim();
     const slugInputVal = document.getElementById('inputSlug')?.value.trim();
     const price = parseFloat(document.getElementById('inputDiscountPrice').value || '0') || 0;
   
     if (!title || price <= 0) {
       showChicNotification('يرجى كتابة اسم المنتج والسعر بعد الخصم بشكل صحيح!', 'warning');
       return;
     }
   
     const slug = slugInputVal || generateSlug(title);
     const origPrice = parseFloat(document.getElementById('inputOriginalPrice').value || '0') || 0;
     const urlImg = document.getElementById('inputMainImgUrl').value.trim();
     const mainImg = uploadedFileBase64 || urlImg || 'https://via.placeholder.com/300?text=ANO+STORE';
   
     const galleryText = document.getElementById('inputGalleryUrls').value.trim();
     let imagesArr = [mainImg];
     if (galleryText) {
       const extra = galleryText.split('\n').map(u => u.trim()).filter(Boolean);
       imagesArr = [...new Set([...imagesArr, ...extra])];
     }
   
     const btn = document.getElementById('saveProductLiveBtn');
     btn.disabled = true;
     btn.innerHTML = 'جاري الحفظ والنشر... <span class="spinner-border spinner-border-sm me-1"></span>';
   
     // الكائن الأساسي المقبول دائماً في قاعدة البيانات
     const payload = {
       title: title,
       price: price,
       original_price: origPrice,
       category_slug: document.getElementById('selectCategory').value,
       brand: document.getElementById('inputBrand').value.trim(),
       stock_status: document.getElementById('selectStockStatus').value,
       images: imagesArr,
       specs: document.getElementById('inputSpecs').value.trim(),
       description: document.getElementById('inputDescription').value.trim()
     };
   
     if (slug) {
       payload.slug = slug;
     }
   
     try {
       let res;
   
       if (currentEditProductId) {
         res = await _supabase.from('products').update(payload).eq('id', currentEditProductId);
       } else {
         res = await _supabase.from('products').insert([payload]);
       }
   
       // إذا فشل الإرسال بـ 400 بسبب عدم وجود حقل slug بجدول السيرفر، نعيد المحاولة كـ Fallback بدون slug
       if (res.error && res.error.message && res.error.message.includes("slug")) {
         delete payload.slug;
         if (currentEditProductId) {
           res = await _supabase.from('products').update(payload).eq('id', currentEditProductId);
         } else {
           res = await _supabase.from('products').insert([payload]);
         }
       }
   
       if (res.error) throw res.error;
   
       showChicNotification('🎉 تم حفظ ونشر المنتج بنجاح في متجر ANO Store!', 'success');
       setTimeout(() => {
         window.location.href = window.location.pathname.includes("/admin") ? "/admin/dashboard" : "dashboard.html";
       }, 1500);
   
     } catch (err) {
       console.error("Save Error:", err);
       showChicNotification('❌ حدث خطأ أثناء الحفظ: ' + (err.message || 'تأكد من الاتصال'), 'error');
     } finally {
       btn.disabled = false;
       btn.innerHTML = 'حفظ ونشر المنتج <i class="fa-solid fa-circle-check ms-1"></i>';
     }
   }