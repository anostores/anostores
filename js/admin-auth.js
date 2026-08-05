/* ==========================================
   ANO Store - Admin Auth Engine
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("admin-login-form");
  const regForm = document.getElementById("admin-register-form");

  // 1. تسجيل الدخول
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("admin-login-email").value.trim();
      const password = document.getElementById("admin-login-password").value;
      const rememberMe = document.getElementById("admin-remember-me").checked;
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

        // حفظ خيار "تذكرني"
        if (rememberMe) {
          localStorage.setItem("ano_admin_remember", "true");
        } else {
          sessionStorage.setItem("ano_admin_session", "active");
        }

        Swal.fire({
          icon: 'success',
          title: 'أهلاً بك في cPanel!',
          text: `مرحباً بك، الصلاحية: ${adminRecord.role === 'super_admin' ? 'Super Admin' : 'Admin'}`,
          timer: 1200,
          showConfirmButton: false
        }).then(() => {
          window.location.href = "dashboard.html";
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

  // 2. طلب حساب أدمن جديد
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
        // إنشاء الحساب بـ Auth
        const { data, error } = await _supabase.auth.signUp({
          email: email,
          password: password,
          options: { data: { full_name: name } }
        });

        if (error) throw error;

        // إدراج طلب الانضمام في جدول admin_users (غير معتمد)
        await _supabase.from("admin_users").upsert([
          { email: email, full_name: name, is_approved: (email === 'iamhondv@gmail.com'), role: 'admin' }
        ], { onConflict: 'email' });

        Swal.fire({
          icon: 'success',
          title: 'تم إرسال الطلب بنجاح!',
          text: 'تم تسجيل طلبك وإرساله للوحة السوبر أدمن (iamhondv@gmail.com) للمراجعة والموافقة.',
          confirmButtonColor: '#e60023'
        }).then(() => {
          regForm.reset();
          document.getElementById("pills-admin-login-tab").click();
        });

      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'فشل إرسال الطلب',
          text: err.message || 'حدث خطأ أثناء إرسال البيانات.',
          confirmButtonColor: '#e60023'
        });
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'إرسال الطلب للسوبر أدمن <i class="fa-solid fa-paper-plane ms-1"></i>';
      }
    });
  }
});