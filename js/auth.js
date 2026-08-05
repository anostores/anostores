/* ==========================================
   ANO Store - Auth & Email Verification Script
   With Strict Block Check & Clean URL Support
   ========================================== */

   document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const regForm = document.getElementById("register-form");
  
    // 1. تسجيل الدخول بـ Supabase Auth مع فحص الحظر
    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
  
        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;
        const submitBtn = document.getElementById("btn-login-submit");
  
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>جاري التحقق...';
  
        try {
          const { data, error } = await _supabase.auth.signInWithPassword({
            email: email,
            password: password
          });
  
          if (error) throw error;
  
          // 1.1 التأكد من تفعيل البريد الإلكتروني
          if (data.user && !data.user.email_confirmed_at) {
            Swal.fire({
              icon: 'warning',
              title: 'حسابك غير مفعل!',
              text: 'يرجى فتح بريدك الإلكتروني والضغط على رابط التفعيل أولاً للتمكن من الدخول.',
              confirmButtonColor: '#e60023',
              confirmButtonText: 'حسناً'
            });
            _supabase.auth.signOut();
            return;
          }
  
          // 1.2 الفحص الصارم لحالة حظر الحساب بـ user_profiles
          const { data: profile } = await _supabase
            .from("user_profiles")
            .select("is_blocked")
            .eq("id", data.user.id)
            .maybeSingle();
  
          if (profile && profile.is_blocked) {
            Swal.fire({
              icon: 'error',
              title: 'الحساب محظور!',
              text: 'عفواً، تم حظر حسابك من قبل إدارة المتجر. يرجى التواصل مع الدعم الفني.',
              confirmButtonColor: '#e60023'
            });
            _supabase.auth.signOut();
            return;
          }
  
          const userName = data.user.user_metadata?.full_name || email.split("@")[0];
          localStorage.setItem("ano_user_name", userName);
  
          const isLocalServer = window.location.hostname === '127.0.0.1' || 
                                window.location.hostname === 'localhost' || 
                                window.location.protocol === 'file:' || 
                                window.location.pathname.endsWith('.html');
  
          Swal.fire({
            icon: 'success',
            title: `أهلاً بك، ${userName}!`,
            text: 'تم تسجيل الدخول بنجاح.',
            timer: 1500,
            showConfirmButton: false
          }).then(() => {
            window.location.href = isLocalServer ? "index.html" : "/";
          });
  
        } catch (err) {
          console.error("Login Error:", err);
          Swal.fire({
            icon: 'error',
            title: 'فشل تسجيل الدخول',
            text: 'البريد الإلكتروني أو كلمة المرور غير صحيحة، أو أن الحساب غير مفعّل.',
            confirmButtonColor: '#e60023'
          });
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'تسجيل الدخول';
        }
      });
    }
  
    // 2. إنشاء حساب جديد وإرسال رابط التفعيل
    if (regForm) {
      regForm.addEventListener("submit", async (e) => {
        e.preventDefault();
  
        const name = document.getElementById("reg-name").value.trim();
        const email = document.getElementById("reg-email").value.trim();
        const phone = document.getElementById("reg-phone").value.trim();
        const password = document.getElementById("reg-password").value;
        const submitBtn = document.getElementById("btn-register-submit");
  
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>جاري إنشاء الحساب...';
  
        try {
          const { data, error } = await _supabase.auth.signUp({
            email: email,
            password: password,
            options: {
              data: {
                full_name: name,
                phone: phone
              }
            }
          });
  
          if (error) throw error;
  
          Swal.fire({
            icon: 'success',
            title: 'تم إرسال رابط التفعيل!',
            text: `تم إنشاء حسابك بنجاح. يرجى الذهاب إلى البريد (${email}) والضغط على رابط التفعيل لتنشيط دخولك.`,
            confirmButtonColor: '#e60023',
            confirmButtonText: 'فهمت ذلك'
          }).then(() => {
            regForm.reset();
            const loginTabBtn = document.getElementById("pills-login-tab");
            if (loginTabBtn) loginTabBtn.click();
          });
  
        } catch (err) {
          console.error("Register Error:", err);
          Swal.fire({
            icon: 'error',
            title: 'حدث خطأ في التسجيل',
            text: err.message || 'عذراً، تعذر إنشاء الحساب. تأكد من صحة البيانات.',
            confirmButtonColor: '#e60023'
          });
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'إنشاء حساب جديد وتأكيد البريد';
        }
      });
    }
  });