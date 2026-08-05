/* ==========================================
   ANO Store - Maintenance Booking Script
   ========================================== */

   document.addEventListener("DOMContentLoaded", () => {
    const maintenanceForm = document.getElementById("maintenance-booking-form");
  
    // ضبط الحد الأدنى لتاريخ الزيارة بداية من اليوم
    const dateInput = document.getElementById("preferred-date");
    if (dateInput) {
      const today = new Date().toISOString().split("T")[1];
      dateInput.min = today;
    }
  
    if (maintenanceForm) {
      maintenanceForm.addEventListener("submit", async (e) => {
        e.preventDefault();
  
        const submitBtn = document.getElementById("btn-submit-maintenance");
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>جاري الإرسال...';
  
        const payload = {
          client_name: document.getElementById("client-name").value.trim(),
          client_phone: document.getElementById("client-phone").value.trim(),
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
            text: "تم تسجيل طلبك، وسيقوم الأدمن بمراجعته وتأكيد الميعاد معك. ينورنا زيارتك!",
            confirmButtonColor: "#e60023",
            confirmButtonText: "موافق"
          });
  
          maintenanceForm.reset();
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