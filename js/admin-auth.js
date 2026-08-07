/* ==========================================
   ANO Store - Admin Auth Engine (Clean & 500 Safe)
   ========================================== */

   document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("admin-login-form");
    const regForm = document.getElementById("admin-register-form");
    const resetForm = document.getElementById("admin-reset-password-form");
  
    // 1. تسجيل الدخول
    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
  
        const email = document.getElementById("admin-login-email").value.trim();
        const password = document.getElementById("admin-login-password").value;
        const rememberMe = document.getElementById("admin-remember-me")?.checked;
        const btn = document.getElementById("btn-admin-login");
  
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>جاري التحقق...';
  
        try {
          const { data, error } = await _supabase.auth.signInWithPassword({
            email: email,
            password: password
          });
  
          if (error) throw error;
  
          const { data: adminData, error: adminErr } = await _supabase
            .from("admin_users")
            .select("*")
            .eq("email", email);
  
          const adminRecord = adminData && adminData.length > 0 ? adminData[0] : null;
  
          if (adminErr || !adminRecord || !adminRecord.is_approved) {
            Swal.fire({
              icon: 'warning',
              title: 'الحساب بانتظار الموافقة!',
              text: 'حسابك مسجل ولكن لم يتم اعتماده بعد من السوبر أدمن (iamhondv@gmail.com).',
              confirmButtonColor: '#e60023'
            });
            _supabase.auth.signOut();
            return;
          }
  
          // إنشاء أو مزامنة بروفايل الأدمن كعميل عادي ليتمكن من التسوق
          if (data.user) {
            await _supabase.from("user_profiles").upsert([{
              id: data.user.id,
              full_name: adminRecord.full_name || 'أدمن المتجر',
              phone: '01111757936',
              is_blocked: false,
              updated_at: new Date()
            }], { onConflict: 'id' });
          }
  
          if (rememberMe) {
            localStorage.setItem("ano_admin_remember", "true");
          } else {
            sessionStorage.setItem("ano_admin_session", "active");
          }
  
          const isLocalServer = window.location.hostname === '127.0.0.1' || 
                                window.location.hostname === 'localhost' || 
                                window.location.protocol === 'file:' || 
                                window.location.pathname.endsWith('.html');
  
          Swal.fire({
            icon: 'success',
            title: 'أهلاً بك في cPanel!',
            text: `مرحباً بك، الصلاحية: ${adminRecord.role === 'super_admin' ? 'Super Admin' : 'Admin'}`,
            timer: 1200,
            showConfirmButton: false
          }).then(() => {
            window.location.href = isLocalServer ? "admin-dashboard.html" : "/admin-dashboard";
          });
  
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'خطأ في تسجيل الدخول',
            text: 'البريد أو كلمة المرور غير صحيحة.',
            confirmButtonColor: '#e60023'
          });
        } finally {
          btn.disabled = false;
          btn.innerHTML = 'دخول cPanel <i class="fa-solid fa-right-to-bracket ms-1"></i>';
        }
      });
    }
  
    // 2. طلب حساب أدمن جديد (معالج ومعزز لتجنب خطأ 500)
    if (regForm) {
      regForm.addEventListener("submit", async (e) => {
        e.preventDefault();
  
        const name = document.getElementById("admin-reg-name").value.trim();
        const email = document.getElementById("admin-reg-email").value.trim();
        const password = document.getElementById("admin-reg-password").value;
        const btn = document.getElementById("btn-admin-register");
  
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>جاري الإرسال...';
  
        try {
          const isSuperAdmin = (email === 'iamhondv@gmail.com');
  
          // إدراج البيانات أولاً في admin_users بأسلوب آمن
          const { error: dbErr } = await _supabase.from("admin_users").upsert([
            { 
              email: email, 
              full_name: name, 
              is_approved: isSuperAdmin, 
              role: (isSuperAdmin ? 'super_admin' : 'admin') 
            }
          ], { onConflict: 'email' });
  
          if (dbErr) console.warn("Admin record note:", dbErr);
  
          // إجراء عملية إنشاء الحساب بـ Auth
          const { error: authErr } = await _supabase.auth.signUp({
            email: email,
            password: password,
            options: { data: { full_name: name } }
          });
  
          if (authErr && !authErr.message.includes("User already registered")) {
            throw authErr;
          }
  
          Swal.fire({
            icon: 'success',
            title: 'تم إرسال الطلب بنجاح!',
            text: 'تم تسجيل طلبك وإرساله للوحة السوبر أدمن (iamhondv@gmail.com) للمراجعة والموافقة.',
            confirmButtonColor: '#e60023'
          }).then(() => {
            regForm.reset();
            const loginTab = document.getElementById("pills-admin-login-tab");
            if (loginTab) loginTab.click();
          });
  
        } catch (err) {
          console.error("Admin Registration Error:", err);
          Swal.fire({
            icon: 'error',
            title: 'فشل إرسال الطلب',
            text: err.message || 'حدث خطأ غير متوقع أثناء معالجة البيانات.',
            confirmButtonColor: '#e60023'
          });
        } finally {
          btn.disabled = false;
          btn.innerHTML = 'إرسال الطلب للسوبر أدمن <i class="fa-solid fa-paper-plane ms-1"></i>';
        }
      });
    }
  
    // 3. استعادة كلمة السر
    if (resetForm) {
      resetForm.addEventListener("submit", async (e) => {
        e.preventDefault();
  
        const email = document.getElementById("admin-reset-email").value.trim();
        const btn = document.getElementById("btn-reset-password");
  
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>جاري الإرسال...';
  
        try {
          const isLocalServer = window.location.hostname === '127.0.0.1' || 
                                window.location.hostname === 'localhost' || 
                                window.location.protocol === 'file:' || 
                                window.location.pathname.endsWith('.html');
  
          const redirectPath = isLocalServer 
            ? `${window.location.origin}/reset-password.html`
            : `${window.location.origin}/reset-password`;
  
          const { error } = await _supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectPath,
          });
  
          if (error) throw error;
  
          Swal.fire({
            icon: 'success',
            title: 'تم إرسال الرابط!',
            text: 'تم إرسال رابط إعادة تعيين كلمة السر إلى بريدك الإلكتروني بنجاح.',
            confirmButtonColor: '#e60023'
          }).then(() => {
            const modalEl = document.getElementById('resetPasswordModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
            resetForm.reset();
          });
  
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'فشل إرسال الرابط',
            text: err.message || 'تأكد من كتابة البريد الإلكتروني بشكل صحيح.',
            confirmButtonColor: '#e60023'
          });
        } finally {
          btn.disabled = false;
          btn.innerHTML = 'إرسال رابط إعادة التعيين <i class="fa-solid fa-paper-plane ms-1"></i>';
        }
      });
    }
  });