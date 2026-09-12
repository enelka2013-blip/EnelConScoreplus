/* ============================================================
   ระบบความดีเอเนล - app.js
   ระบบบันทึกและจัดการคะแนนความดีของนักเรียน (LocalStorage)
   ============================================================ */

(function () {
  "use strict";

  /* ---------- ค่าคงที่ ---------- */
  const KEY_USERS = "enel_good_users_v1";
  const KEY_AWARDS = "enel_good_awards_v1";
  const KEY_SESSION = "enel_good_session_v1";

  const ADMIN_USERNAME = "SKSUPAWIT";
  const ADMIN_PASSWORD = "-SKSUPAWIT-";

  const CATEGORIES = [
    "ช่วยเหลือผู้อื่น",
    "จิตอาสา",
    "ความรับผิดชอบ",
    "วินัย",
    "ความซื่อสัตย์",
    "รักษาความสะอาด",
    "อื่น ๆ",
  ];

  const GRADES = ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"];

  /* ---------- ตัวช่วยจัดการ LocalStorage ---------- */
  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(KEY_USERS)) || [];
    } catch (e) {
      return [];
    }
  }
  function saveUsers(users) {
    localStorage.setItem(KEY_USERS, JSON.stringify(users));
  }
  function getAwards() {
    try {
      return JSON.parse(localStorage.getItem(KEY_AWARDS)) || [];
    } catch (e) {
      return [];
    }
  }
  function saveAwards(awards) {
    localStorage.setItem(KEY_AWARDS, JSON.stringify(awards));
  }
  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(KEY_SESSION)) || null;
    } catch (e) {
      return null;
    }
  }
  function saveSession(session) {
    localStorage.setItem(KEY_SESSION, JSON.stringify(session));
  }
  function clearSession() {
    localStorage.removeItem(KEY_SESSION);
  }

  function uid(prefix) {
    return (
      prefix +
      "_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, function (c) {
      return (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
          c
        ] || c
      );
    });
  }

  function formatDateTime(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleString("th-TH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return iso;
    }
  }

  /* ---------- คำนวณคะแนน / อันดับ ---------- */
  function computeTotal(userId) {
    return getAwards()
      .filter((a) => a.studentId === userId)
      .reduce((sum, a) => sum + Number(a.score || 0), 0);
  }

  function computeRankTable() {
    const users = getUsers();
    const ranked = users
      .map((u) => ({ id: u.id, total: computeTotal(u.id) }))
      .sort((a, b) => b.total - a.total);
    const rankMap = {};
    ranked.forEach((r, idx) => {
      rankMap[r.id] = idx + 1;
    });
    return rankMap;
  }

  /* ---------- Toast แจ้งเตือน ---------- */
  function toast(message, type) {
    type = type || "success";
    const container = document.getElementById("toastContainer");
    const id = uid("toast");
    const el = document.createElement("div");
    el.className =
      "toast align-items-center text-white bg-" +
      (type === "success" ? "primary" : type) +
      " border-0";
    el.id = id;
    el.setAttribute("role", "alert");
    el.innerHTML =
      '<div class="d-flex"><div class="toast-body">' +
      escapeHtml(message) +
      '</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>';
    container.appendChild(el);
    const t = new bootstrap.Toast(el, { delay: 3000 });
    t.show();
    el.addEventListener("hidden.bs.toast", () => el.remove());
  }

  /* ---------- สลับหน้าจอ ---------- */
  const views = {
    login: document.getElementById("view-login"),
    register: document.getElementById("view-register"),
    admin: document.getElementById("view-admin"),
    student: document.getElementById("view-student"),
  };

  function showView(name) {
    Object.keys(views).forEach((k) => views[k].classList.add("hidden"));
    views[name].classList.remove("hidden");
    document.getElementById("navAuthLinks").classList.toggle(
      "hidden",
      name === "admin" || name === "student"
    );
    document
      .getElementById("navUserLinks")
      .classList.toggle("hidden", !(name === "admin" || name === "student"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- Boot: ตรวจ session ---------- */
  function boot() {
    const session = getSession();
    if (session && session.role === "admin") {
      renderAdminDashboard();
      showView("admin");
    } else if (session && session.role === "student") {
      const user = getUsers().find((u) => u.id === session.userId);
      if (user) {
        renderStudentDashboard(user);
        showView("student");
      } else {
        clearSession();
        showView("login");
      }
    } else {
      showView("login");
    }
  }

  /* ============================================================
     ล็อกอิน / สมัครสมาชิก
     ============================================================ */
  const loginForm = document.getElementById("loginForm");
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;

    // ผู้ดูแลระบบ
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      saveSession({ role: "admin" });
      toast("เข้าสู่ระบบผู้ดูแลสำเร็จ");
      renderAdminDashboard();
      showView("admin");
      loginForm.reset();
      return;
    }

    // นักเรียน (ใช้ Gmail เป็น Username)
    const users = getUsers();
    const user = users.find(
      (u) => u.email.toLowerCase() === username.toLowerCase()
    );
    if (user && user.password === password) {
      saveSession({ role: "student", userId: user.id });
      toast("ยินดีต้อนรับ " + user.firstName);
      renderStudentDashboard(user);
      showView("student");
      loginForm.reset();
      return;
    }

    document.getElementById("loginError").classList.remove("hidden");
    setTimeout(
      () => document.getElementById("loginError").classList.add("hidden"),
      3500
    );
  });

  document.getElementById("goToRegister").addEventListener("click", (e) => {
    e.preventDefault();
    populateGradeOptions();
    showView("register");
  });
  document.getElementById("goToLoginFromRegister").addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      showView("login");
    }
  );

  function populateGradeOptions() {
    const sel = document.getElementById("regGrade");
    if (sel.options.length > 1) return;
    GRADES.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = g;
      sel.appendChild(opt);
    });
  }

  const registerForm = document.getElementById("registerForm");
  registerForm.addEventListener("submit", function (e) {
    e.preventDefault();
    document.getElementById("registerError").classList.add("hidden");

    const email = document.getElementById("regEmail").value.trim();
    const prefix = document.getElementById("regPrefix").value.trim();
    const firstName = document.getElementById("regFirstName").value.trim();
    const lastName = document.getElementById("regLastName").value.trim();
    const grade = document.getElementById("regGrade").value;
    const birthdate = document.getElementById("regBirthdate").value;
    const password = document.getElementById("regPassword").value;
    const password2 = document.getElementById("regPassword2").value;

    if (!/^[^\s@]+@gmail\.com$/i.test(email)) {
      showRegisterError("กรุณากรอก Gmail ให้ถูกต้อง (ต้องลงท้ายด้วย @gmail.com)");
      return;
    }
    if (!prefix || !firstName || !lastName || !grade || !birthdate) {
      showRegisterError("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }
    if (password.length < 4) {
      showRegisterError("รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร");
      return;
    }
    if (password !== password2) {
      showRegisterError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }

    const users = getUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      showRegisterError("Gmail นี้ถูกใช้สมัครสมาชิกแล้ว");
      return;
    }

    const newUser = {
      id: uid("stu"),
      email,
      prefix,
      firstName,
      lastName,
      grade,
      birthdate,
      password,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    saveUsers(users);
    toast("สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ");
    registerForm.reset();
    showView("login");
  });

  function showRegisterError(msg) {
    const el = document.getElementById("registerError");
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  /* ---------- ออกจากระบบ ---------- */
  document.querySelectorAll(".btn-logout").forEach((btn) => {
    btn.addEventListener("click", function () {
      clearSession();
      showView("login");
      toast("ออกจากระบบแล้ว", "secondary");
    });
  });

  /* ============================================================
     Dashboard ผู้ดูแลระบบ
     ============================================================ */
  function renderAdminDashboard() {
    const users = getUsers();
    const awards = getAwards();

    document.getElementById("statTotalScore").textContent = awards
      .reduce((s, a) => s + Number(a.score || 0), 0)
      .toLocaleString("th-TH");
    document.getElementById("statTotalAwards").textContent =
      awards.length.toLocaleString("th-TH");
    document.getElementById("statTotalMembers").textContent =
      users.length.toLocaleString("th-TH");

    populateStudentSelect();
    renderHistoryTable();
    renderMembersTable();
  }

  function populateStudentSelect() {
    const sel = document.getElementById("awardStudent");
    const users = getUsers().slice().sort((a, b) =>
      (a.firstName + a.lastName).localeCompare(b.firstName + b.lastName, "th")
    );
    sel.innerHTML = '<option value="">-- เลือกนักเรียน --</option>';
    users.forEach((u) => {
      const opt = document.createElement("option");
      opt.value = u.id;
      opt.textContent =
        u.prefix + u.firstName + " " + u.lastName + " (" + u.grade + ")";
      sel.appendChild(opt);
    });
  }

  // สร้างตัวเลือกหมวดหมู่ความดี (ใช้ทั้งฟอร์มเพิ่มคะแนน)
  function populateCategoryOptions() {
    const sel = document.getElementById("awardCategory");
    if (sel.options.length > 1) return;
    CATEGORIES.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      sel.appendChild(opt);
    });
  }
  populateCategoryOptions();

  const awardForm = document.getElementById("awardForm");
  awardForm.addEventListener("submit", function (e) {
    e.preventDefault();
    document.getElementById("awardError").classList.add("hidden");

    const studentId = document.getElementById("awardStudent").value;
    const category = document.getElementById("awardCategory").value;
    const reason = document.getElementById("awardReason").value.trim();
    const score = Number(document.getElementById("awardScore").value);
    const note = document.getElementById("awardNote").value.trim();

    if (!studentId || !category || !reason) {
      document.getElementById("awardError").textContent =
        "กรุณาเลือกนักเรียน ประเภท และกรอกเหตุผล";
      document.getElementById("awardError").classList.remove("hidden");
      return;
    }
    if (!score || score < 1 || score > 100) {
      document.getElementById("awardError").textContent =
        "คะแนนต้องอยู่ระหว่าง 1 - 100";
      document.getElementById("awardError").classList.remove("hidden");
      return;
    }

    const awards = getAwards();
    awards.push({
      id: uid("awd"),
      studentId,
      category,
      reason,
      score,
      note,
      datetime: new Date().toISOString(),
    });
    saveAwards(awards);
    awardForm.reset();
    toast("บันทึกคะแนนความดีสำเร็จ");
    renderAdminDashboard();
  });

  function renderHistoryTable() {
    const awards = getAwards()
      .slice()
      .sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    const users = getUsers();
    const userMap = {};
    users.forEach((u) => (userMap[u.id] = u));

    const tbody = document.getElementById("historyTableBody");
    tbody.innerHTML = "";

    if (awards.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="text-center text-muted py-4">ยังไม่มีประวัติการให้คะแนนความดี</td></tr>';
      return;
    }

    awards.forEach((a) => {
      const u = userMap[a.studentId];
      const studentName = u
        ? u.prefix + u.firstName + " " + u.lastName
        : "(ไม่พบข้อมูลนักเรียน)";
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" +
        formatDateTime(a.datetime) +
        "</td><td>" +
        escapeHtml(studentName) +
        '</td><td><span class="category-pill">' +
        escapeHtml(a.category) +
        '</span></td><td>' +
        escapeHtml(a.reason) +
        (a.note ? '<br><small class="text-muted">หมายเหตุ: ' + escapeHtml(a.note) + "</small>" : "") +
        '</td><td class="fw-bold text-primary">+' +
        a.score +
        '</td><td><button class="btn btn-sm btn-outline-danger btn-delete-award" data-id="' +
        a.id +
        '"><i class="fa-solid fa-trash"></i></button></td>';
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".btn-delete-award").forEach((btn) => {
      btn.addEventListener("click", function () {
        confirmAction(
          "ลบรายการคะแนนความดี",
          "คุณต้องการลบรายการคะแนนนี้ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้",
          () => {
            const id = btn.getAttribute("data-id");
            const remaining = getAwards().filter((a) => a.id !== id);
            saveAwards(remaining);
            toast("ลบรายการคะแนนแล้ว", "secondary");
            renderAdminDashboard();
          }
        );
      });
    });
  }

  function renderMembersTable() {
    const users = getUsers().slice().sort((a, b) =>
      (a.firstName + a.lastName).localeCompare(b.firstName + b.lastName, "th")
    );
    const tbody = document.getElementById("membersTableBody");
    tbody.innerHTML = "";

    if (users.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="text-center text-muted py-4">ยังไม่มีสมาชิกนักเรียน</td></tr>';
      return;
    }

    users.forEach((u) => {
      const total = computeTotal(u.id);
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" +
        escapeHtml(u.prefix + u.firstName + " " + u.lastName) +
        "</td><td>" +
        escapeHtml(u.email) +
        "</td><td>" +
        escapeHtml(u.grade) +
        '</td><td class="fw-bold text-primary">' +
        total.toLocaleString("th-TH") +
        '</td><td><button class="btn btn-sm btn-outline-danger btn-delete-member" data-id="' +
        u.id +
        '"><i class="fa-solid fa-user-xmark"></i></button></td>';
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".btn-delete-member").forEach((btn) => {
      btn.addEventListener("click", function () {
        confirmAction(
          "ลบสมาชิก",
          "การลบสมาชิกจะลบประวัติคะแนนความดีของนักเรียนคนนี้ทั้งหมดด้วย ต้องการดำเนินการต่อหรือไม่?",
          () => {
            const id = btn.getAttribute("data-id");
            saveUsers(getUsers().filter((u) => u.id !== id));
            saveAwards(getAwards().filter((a) => a.studentId !== id));
            toast("ลบสมาชิกแล้ว", "secondary");
            renderAdminDashboard();
          }
        );
      });
    });
  }

  /* ---------- สำรองข้อมูล (Export JSON) ---------- */
  document.getElementById("btnExportBackup").addEventListener("click", () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      users: getUsers(),
      awards: getAwards(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "enel-good-system-backup.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("ดาวน์โหลดไฟล์สำรองข้อมูลสำเร็จ");
  });

  /* ---------- ล้างข้อมูลทั้งหมด ---------- */
  document.getElementById("btnClearAllData").addEventListener("click", () => {
    confirmAction(
      "ล้างข้อมูลทั้งหมด",
      "การดำเนินการนี้จะลบข้อมูลสมาชิกและประวัติคะแนนความดีทั้งหมดอย่างถาวร คุณแน่ใจหรือไม่?",
      () => {
        saveUsers([]);
        saveAwards([]);
        toast("ล้างข้อมูลทั้งหมดเรียบร้อยแล้ว", "danger");
        renderAdminDashboard();
      }
    );
  });

  /* ---------- Modal ยืนยันการทำงาน (ใช้ร่วมกันทุกจุด) ---------- */
  let confirmCallback = null;
  const confirmModalEl = document.getElementById("confirmModal");
  const confirmModal = new bootstrap.Modal(confirmModalEl);

  function confirmAction(title, message, onConfirm) {
    document.getElementById("confirmModalTitle").textContent = title;
    document.getElementById("confirmModalBody").textContent = message;
    confirmCallback = onConfirm;
    confirmModal.show();
  }

  document.getElementById("btnConfirmYes").addEventListener("click", () => {
    if (typeof confirmCallback === "function") confirmCallback();
    confirmCallback = null;
    confirmModal.hide();
  });

  /* ============================================================
     Dashboard นักเรียน
     ============================================================ */
  function renderStudentDashboard(user) {
    const total = computeTotal(user.id);
    const rankMap = computeRankTable();
    const rank = rankMap[user.id] || "-";
    const totalMembers = getUsers().length;
    const myAwards = getAwards()
      .filter((a) => a.studentId === user.id)
      .sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

    document.getElementById("studentDisplayName").textContent =
      user.prefix + user.firstName + " " + user.lastName;
    document.getElementById("studentGrade").textContent = user.grade;
    document.getElementById("studentTotalScore").textContent =
      total.toLocaleString("th-TH");
    document.getElementById("studentRank").textContent =
      rank + " / " + totalMembers;
    document.getElementById("studentAwardCount").textContent =
      myAwards.length.toLocaleString("th-TH");

    const tbody = document.getElementById("studentHistoryBody");
    tbody.innerHTML = "";
    if (myAwards.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="text-center text-muted py-4">ยังไม่มีประวัติความดี เริ่มทำความดีวันนี้เลย!</td></tr>';
      return;
    }
    myAwards.forEach((a) => {
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" +
        formatDateTime(a.datetime) +
        '</td><td><span class="category-pill">' +
        escapeHtml(a.category) +
        "</span></td><td>" +
        escapeHtml(a.reason) +
        (a.note
          ? '<br><small class="text-muted">หมายเหตุ: ' +
            escapeHtml(a.note) +
            "</small>"
          : "") +
        '</td><td class="fw-bold text-primary">+' +
        a.score +
        "</td>";
      tbody.appendChild(tr);
    });
  }

  /* ---------- เริ่มระบบ ---------- */
  document.addEventListener("DOMContentLoaded", boot);
})();
