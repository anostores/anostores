/* ==========================================
   ANO Store - Maintenance Booking Engine
   With Strict Login Barrier & Hybrid Routing
   ========================================== */

   document.addEventListener("DOMContentLoaded", async () => {
    const maintenanceForm = document.getElementById("maintenance-booking-form");
  
    // ضبط الحد الأدنى لتاريخ الزيارة بداية من اليوم
    const dateInput = document.getElementById("preferred-date");
    if (dateInput) {
      const today = new Date().toISOString().split("T")[0];
      dateInput.min = today;
    }
  
    // التعبئة التلقائية لبيانات المستخدم المسجل
    await autoFillMaintenanceUser();
  
    if (maintenanceForm) {
      maintenanceForm.addEventListener("submit", async (e) => {
        e.preventDefault();
  
        // 🔒 فحص إلزام تسجيل الدخول الشديد قبل إرسال طلب الصيانة
        const { data: { session } } = await _supabase.auth.getSession();
  
        const isLocalOrGithub = window.location.protocol === 'file:' || 
                                window.location.pathname.endsWith('.html') || 
                                window.location.hostname.includes('github.io');
        const loginPath = isLocalOrGithub ? "login.html" : "/login";
  
        if (!session || !session.user) {
          Swal.fire({
            title: 'تسجيل الدخول مطلوب!',
            html: `
              <div class="text-center py-2">
                <div class="d-inline-flex align-items-center justify-content-center bg-danger bg-opacity-10 text-danger rounded-circle p-3 mb-3">
                  <i class="fa-solid fa-lock fa-3x"></i>
                </div>
                <h5 class="fw-bold text-dark mb-2">عفواً، لا يمكنك حجز الصيانة كـ زائر!</h5>
                <p class="text-muted small m-0">يرجى تسجيل الدخول أولاً لتأكيد الحجز ومتابعة حالة صيانة جهازك في حسابك.</p>
              </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#e60023',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'تسجيل الدخول الآن 🔑',
            cancelButtonText: 'تراجع'
          }).then((res) => {
            if (res.isConfirmed) {
              window.location.href = loginPath;
            }
          });
          return;
        }
  
        const submitBtn = document.getElementById("btn-submit-maintenance");
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>جاري الإرسال...';
  
        const payload = {
          client_name: document.getElementById("client-name").value.trim(),
          client_phone: document.getElementById("client-phone").value.trim(),
          client_email: session.user.email,
          device_model: document.getElementById("device-model").value.trim(),
          branch_location: document.getElementById("branch-location").value,
          preferred_date: document.getElementById("preferred-date").value,
          preferred_time: document.getElementById("preferred-time").value,
          issue_description: document.getElementById("issue-description").value.trim(),
          status: "pending"
        };
  
        try {
          const { data, error } = await _supabase
            .from("maintenance_requests")
            .insert([payload]);
  
          if (error) throw error;
  
          Swal.fire({
            icon: "success",
            title: "تم إرسال طلب الحجز بنجاح!",
            text: "تم تسجيل طلبك، وسيقوم فريق الدعم بمراجعته وتأكيد الميعاد معك. ينورنا زيارتك!",
            confirmButtonColor: "#e60023",
            confirmButtonText: "موافق"
          });
  
          maintenanceForm.reset();
          await autoFillMaintenanceUser();
        } catch (err) {
          console.error("Error submitting maintenance request:", err);
          Swal.fire({
            icon: "error",
            title: "عذراً، حدث خطأ!",
            text: "تعذر إرسال الطلب، يرجى التأكد من الاتصال بالإنترنت وإعادة المحاولة.",
            confirmButtonColor: "#e60023",
            confirmButtonText: "حسناً"
          });
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane me-2"></i> إرسال طلب حجز الصيانة';
        }
      });
    }
  });
  
  /* التعبئة التلقائية لبيانات العميل المسجل */
  async function autoFillMaintenanceUser() {
    if (typeof _supabase === "undefined") return;
  
    const { data: { session } } = await _supabase.auth.getSession();
    if (session && session.user) {
      const { data: profiles } = await _supabase.from("user_profiles").select("*").eq("id", session.user.id);
      const profile = profiles && profiles.length > 0 ? profiles[0] : null;
  
      const nameInput = document.getElementById("client-name");
      const phoneInput = document.getElementById("client-phone");
  
      if (nameInput) nameInput.value = profile?.full_name || session.user.user_metadata?.full_name || "";
      if (phoneInput) phoneInput.value = profile?.phone || session.user.user_metadata?.phone || "";
    }
  }