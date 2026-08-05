/* ==========================================================================
   ANO Store - Live Product Builder Engine
   With Cumulative Multi-Image Upload, Main Image Selection & 400 Error Handling
   ========================================================================== */

   let currentEditProductId = null;
   let uploadedFilesBase64 = []; // مصفوفة الصور التراكمية
   let mainImageIndex = 0;       // مؤشر الصورة الرئيسية المعتمدة
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
       .replace(/\s+/g, '-')          
       .replace(/[^\w\u0600-\u06FF\-]+/g, '') 
       .replace(/\-\-+/g, '-')         
       .replace(/^-+/, '')             
       .replace(/-+$/, '');            
   }
   
   /* جلب بيانات المنتج في حالة التعديل */
   async function loadProductDetails(id) {
     try {
       const { data: p, error } = await _supabase.from('products').select('*').eq('id', id).single();
       if (error || !p) throw new Error('تعذر جلب بيانات المنتج من قاعدة البيانات المباشرة');
   
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
       document.getElementById('inputSpecs').value = typeof p.specs === 'string' ? p.specs : JSON.stringify(p.specs || '');
       document.getElementById('inputDescription').value = p.description || '';
   
       if (p.images && Array.isArray(p.images) && p.images.length > 0) {
         uploadedFilesBase64 = [...p.images];
         mainImageIndex = 0;
       }
   
       renderVirtualPreview();
   
     } catch (err) {
       showChicNotification('❌ ' + err.message, 'error');
     }
   }
   
   /* ربط الأحداث للتفاعل الفوري ودعم رفع الصور التراكمي (+) */
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
   
     // زر (+) إضافة المزيد من الصور دون مسح القديم
     const fileInput = document.getElementById('inputImageFile');
     if (fileInput) {
       fileInput.addEventListener('change', function (e) {
         const files = Array.from(e.target.files);
         if (files.length === 0) return;
   
         let loadedCount = 0;
   
         files.forEach((file) => {
           const reader = new FileReader();
           reader.onload = function (evt) {
             uploadedFilesBase64.push(evt.target.result);
             loadedCount++;
   
             if (loadedCount === files.length) {
               renderVirtualPreview();
               showChicNotification(`تمت إضافة ${files.length} صور جديدة.`, 'info');
             }
           };
           reader.readAsDataURL(file);
         });
   
         // تصفير الحقل لتسميح رفع أحدث الملفات مرة أخرى
         fileInput.value = '';
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
   
   /* دالة المعاينة الحية اللحظية (Live Preview) وشبكة اختيار الصورة الرئيسية */
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
   
     // تصحيح مؤشر الصورة الرئيسية إذا تم حذف عناصر
     if (mainImageIndex >= uploadedFilesBase64.length) {
       mainImageIndex = Math.max(0, uploadedFilesBase64.length - 1);
     }
   
     let activeMainImg = (uploadedFilesBase64.length > 0) 
       ? uploadedFilesBase64[mainImageIndex] 
       : (urlImg || placeholderSvg);
   
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
       mainImgEl.src = activeMainImg;
       mainImgEl.onerror = function() { this.src = placeholderSvg; };
     }
   
     // رسم شبكة اختيار وتقسيم الصور المرفوعة تحت قسم التحميل
     const thumbsGrid = document.getElementById('sidebar-image-thumbs-grid');
     if (thumbsGrid) {
       thumbsGrid.innerHTML = '';
       if (uploadedFilesBase64.length === 0) {
         thumbsGrid.innerHTML = '<div class="text-muted fs-9 text-center w-100 py-2">لا توجد صور مرفوعة بعد. استخدم زر (+) لإضافة صور.</div>';
       } else {
         uploadedFilesBase64.forEach((url, idx) => {
           const isMain = idx === mainImageIndex;
           const thumbCard = document.createElement('div');
           thumbCard.className = `position-relative rounded border p-1 bg-white ${isMain ? 'border-danger border-2' : ''}`;
           thumbCard.style.width = '65px';
           thumbCard.style.height = '65px';
   
           thumbCard.innerHTML = `
             <img src="${url}" class="w-100 h-100 object-fit-contain rounded cursor-pointer" onclick="selectMainImage(${idx})">
             ${isMain ? '<span class="badge bg-danger position-absolute top-0 start-0 fs-9 px-1">رئيسية</span>' : ''}
             <button type="button" class="btn btn-sm btn-danger position-absolute bottom-0 end-0 p-0 rounded-circle d-flex align-items-center justify-content-center" style="width:18px; height:18px; font-size:10px;" onclick="removeUploadedImage(${idx})" title="حذف الصورة">×</button>
           `;
           thumbsGrid.appendChild(thumbCard);
         });
       }
     }
   
     // رسم الصور في كارت المعاينة اليساري
     const galleryWrapper = document.getElementById('vGalleryThumbsWrapper');
     if (galleryWrapper) {
       galleryWrapper.innerHTML = '';
   
       let galleryArray = [...uploadedFilesBase64];
       if (galleryArray.length === 0 && urlImg) {
         galleryArray.push(urlImg);
       }
       if (galleryText) {
         const additionalImgs = galleryText.split('\n').map(u => u.trim()).filter(Boolean);
         galleryArray = [...new Set([...galleryArray, ...additionalImgs])];
       }
       if (galleryArray.length === 0) {
         galleryArray.push(placeholderSvg);
       }
   
       galleryArray.forEach((url, idx) => {
         const imgThumb = document.createElement('img');
         imgThumb.src = url;
         imgThumb.className = `gallery-thumb-item ${idx === mainImageIndex ? 'active border border-2 border-danger' : ''}`;
         imgThumb.onerror = function() { this.src = placeholderSvg; };
         imgThumb.onclick = function() {
           mainImageIndex = idx;
           renderVirtualPreview();
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
   
   function selectMainImage(index) {
     mainImageIndex = index;
     renderVirtualPreview();
   }
   
   function removeUploadedImage(index) {
     uploadedFilesBase64.splice(index, 1);
     if (mainImageIndex >= uploadedFilesBase64.length) {
       mainImageIndex = Math.max(0, uploadedFilesBase64.length - 1);
     }
     renderVirtualPreview();
   }
   
   /* حفظ المنتج ونشره بمرونة مع الحماية من خطأ HTTP 400 */
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
     
     let finalImagesArr = [...uploadedFilesBase64];
   
     // جعل الصورة الرئيسية المختارة في أول المصفوفة
     if (finalImagesArr.length > 0) {
       const mainImg = finalImagesArr.splice(mainImageIndex, 1)[0];
       finalImagesArr.unshift(mainImg);
     } else if (urlImg) {
       finalImagesArr.push(urlImg);
     } else {
       finalImagesArr.push('https://via.placeholder.com/300?text=ANO+STORE');
     }
   
     const galleryText = document.getElementById('inputGalleryUrls').value.trim();
     if (galleryText) {
       const extra = galleryText.split('\n').map(u => u.trim()).filter(Boolean);
       finalImagesArr = [...new Set([...finalImagesArr, ...extra])];
     }
   
     const specsText = document.getElementById('inputSpecs').value.trim();
     let advancedSpecsObj = {};
     if (specsText) {
       specsText.split('\n').filter(Boolean).forEach(line => {
         const parts = line.split(':');
         if (parts.length >= 2) {
           advancedSpecsObj[parts[0].trim()] = parts.slice(1).join(':').trim();
         }
       });
     }
   
     const btn = document.getElementById('saveProductLiveBtn');
     btn.disabled = true;
     btn.innerHTML = 'جاري الحفظ والنشر... <span class="spinner-border spinner-border-sm me-1"></span>';
   
     // تجهيز حمولة البيانات الأساسية لتفادي خطأ 400
     const payload = {
       title: title,
       price: price,
       original_price: origPrice,
       category_slug: document.getElementById('selectCategory').value,
       brand: document.getElementById('inputBrand').value.trim(),
       stock_status: document.getElementById('selectStockStatus').value,
       images: finalImagesArr,
       specs: specsText,
       advanced_specs: advancedSpecsObj,
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
   
       // علاج تلقائي عند ظهور خطأ 400 بسبب الحقول الإضافية
       if (res.error) {
         delete payload.advanced_specs;
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
         const isLocal = window.location.protocol === 'file:' || window.location.pathname.endsWith('.html');
         window.location.href = isLocal ? "admin-dashboard.html" : "admin-dashboard.html";
       }, 1500);
   
     } catch (err) {
       console.error("Save Error:", err);
       showChicNotification('❌ تعذر الحفظ: ' + (err.message || 'تأكد من البيانات وسعة الصور المرفوعة'), 'error');
     } finally {
       btn.disabled = false;
       btn.innerHTML = 'حفظ ونشر المنتج <i class="fa-solid fa-circle-check ms-1"></i>';
     }
   }