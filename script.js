document.addEventListener("DOMContentLoaded", () => {
  const menu = document.querySelector(".menu");
  const links = document.querySelector(".navlinks");
  if (menu) {
    menu.onclick = () => {
      links.classList.toggle("open");
      menu.setAttribute("aria-expanded", links.classList.contains("open"));
    };
  }

  const current = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".navlinks a").forEach((a) => {
    if (a.getAttribute("href") === current) a.classList.add("active");
    a.onclick = () => links?.classList.remove("open");
  });

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("show");
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((x) => obs.observe(x));

  document.querySelectorAll("[data-year]").forEach((x) => {
    x.textContent = new Date().getFullYear();
  });

  // Contact form → Express API
  const form = document.querySelector("#contactForm");
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const msgEl = document.querySelector("#msg");
      const btn = form.querySelector('button[type="submit"]');
      const originalBtn = btn ? btn.textContent : "";

      const data = {
        name: form.name?.value?.trim() || form.querySelector('[name="name"]')?.value?.trim(),
        email: form.email?.value?.trim() || form.querySelector('[name="email"]')?.value?.trim(),
        message: form.message?.value?.trim() || form.querySelector('[name="message"]')?.value?.trim(),
      };

      if (btn) {
        btn.disabled = true;
        btn.textContent = "Sending...";
      }
      if (msgEl) msgEl.textContent = "";

      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();

        if (json.success) {
          if (msgEl) {
            msgEl.style.color = "#34d399";
            msgEl.textContent = json.message || "Message sent successfully!";
          }
          form.reset();
        } else {
          if (msgEl) {
            msgEl.style.color = "#f87171";
            msgEl.textContent = json.error || "Failed to send message.";
          }
        }
      } catch (err) {
        if (msgEl) {
          msgEl.style.color = "#f87171";
          msgEl.textContent = "Server not running. Open via Express (npm start) or try again.";
        }
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = originalBtn;
        }
      }
    };
  }
});
