/* ==========================================
   ANO Store - Reset Password Engine
   ========================================== */

   document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("new-password-form");
  
    if (!form) return;
  
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
  
      const pass = document.getElementById("new-password-input").value;
      const confirmPass = document.getElementById("confirm-password-input").value;
      const btn = document.getElementById("btn-save-new-password");
  
      if (pass !== confirmPass) {
        Swal.fire({
          icon: 'warning',
          title: 'كلمات السر غير متطابقة',
          text: 'يرجى التأكد من كتابة نفس كلمة السر في الخانتين.',
          confirmButtonColor: '#e60023'
        });
        return;
      }
  
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>جاري حفظ كلمة السر...';
  
      try {
        if (typeof _supabase === "undefined") {
          throw new Error("Supabase is not configured properly!");
        }
  
        // تحديث كلمة السر للمستخدم الجاري الموثق من رابط الإيميل
        const { error } = await _supabase.auth.updateUser({ password: pass });
  
        if (error) throw error;
  
        Swal.fire({
          icon: 'success',
          title: 'تم تحديث كلمة السر بنجاح!',
          text: 'تم حفظ كلمة السر الجديدة، يمكنك الآن تسجيل الدخول بحسابك.',
          confirmButtonColor: '#e60023'
        }).then(() => {
          const isLocalOrGithub = window.location.protocol === 'file:' || 
                                  window.location.pathname.endsWith('.html') || 
                                  window.location.hostname.includes('github.io');
          window.location.href = isLocalOrGithub ? "login.html" : "/login";
        });
  
      } catch (err) {
        console.error("Reset Password Error:", err);
        Swal.fire({
          icon: 'error',
          title: 'فشل تحديث كلمة السر',
          text: err.message || 'انتهت صلاحية الرابط، يرجى طلب رابط جديد لإعادة التعيين.',
          confirmButtonColor: '#e60023'
        });
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'حفظ كلمة السر الجديدة <i class="fa-solid fa-circle-check ms-1"></i>';
      }
    });
  });