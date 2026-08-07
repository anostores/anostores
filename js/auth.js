document.addEventListener("DOMContentLoaded", async () => {
  const loginForm = document.getElementById("login-form");
  const regForm = document.getElementById("register-form");

  await checkAdminPageProtection();

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

        let isBlocked = false;
        let userRole = 'user';

        const { data: profile } = await _supabase
          .from("profiles")
          .select("is_blocked, role")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profile) {
          isBlocked = profile.is_blocked || false;
          userRole = profile.role || 'user';
        } else {
          const { data: altProfile } = await _supabase
            .from("user_profiles")
            .select("is_blocked, role")
            .eq("id", data.user.id)
            .maybeSingle();
          if (altProfile) {
            isBlocked = altProfile.is_blocked || false;
            userRole = altProfile.role || 'user';
          }
        }

        if (isBlocked) {
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
        localStorage.setItem("ano_user_email", email);
        localStorage.setItem("ano_user_role", userRole);

        Swal.fire({
          icon: 'success',
          title: `أهلاً بك، ${userName}!`,
          text: 'تم تسجيل الدخول بنجاح.',
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          window.location.href = "/";
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
        const redirectUrl = window.location.origin + "/login";

        const { data, error } = await _supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: name,
              phone: phone
            }
          }
        });

        if (error) throw error;

        if (data && data.user) {
          await _supabase.from("profiles").upsert([{
            id: data.user.id,
            full_name: name,
            email: email,
            phone_number: phone,
            role: 'user',
            is_blocked: false
          }]);
        }

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

async function checkAdminPageProtection() {
  const currentPath = window.location.pathname;
  if (!currentPath.includes("admin")) return;

  if (typeof _supabase === "undefined") return;

  try {
    const { data: { session } } = await _supabase.auth.getSession();

    if (!session || !session.user) {
      window.location.href = "login?unauthorized=admin";
      return;
    }

    const { data: profile } = await _supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    const userRole = profile?.role || localStorage.getItem("ano_user_role") || 'user';

    if (userRole !== "admin" && userRole !== "super_admin") {
      window.location.href = "login?unauthorized=admin";
    }
  } catch (err) {
    console.error("Admin Protection Check Error:", err);
  }
}