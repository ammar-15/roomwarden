// Room Warden site script. Small on purpose: nav toggle, the live board, the workflow tabs and the contact form.

// The demo form posts to the Cloudflare Worker in /worker, which emails the request.
const FORM_ENDPOINT = "/api/contact";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Mobile nav
const toggle = document.querySelector(".nav-toggle");
const links = document.getElementById("nav-links");
if (toggle && links) {
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  links.addEventListener("click", (e) => {
    if (e.target.closest("a")) { links.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
  });
}

// Live room board: a few rooms move through the housekeeping cycle
const board = document.querySelector("[data-board]");
if (board && !reduceMotion) {
  const order = ["dirty", "cleaning", "clean", "ready"];
  const label = { dirty: "Dirty", cleaning: "Cleaning", clean: "Clean", ready: "Ready" };
  const said = { cleaning: "housekeeping started", clean: "marked clean", ready: "inspected, ready to sell", dirty: "checked out" };
  const rooms = [...board.querySelectorAll(".room[data-cycle]")];
  const ticker = board.querySelector(".ticker");
  const readyCount = board.querySelector("[data-ready]");
  const clock = board.querySelector("[data-clock]");
  let i = 0, minutes = 9 * 60 + 40;

  const fmt = (m) => {
    const h = Math.floor(m / 60) % 24, mm = String(m % 60).padStart(2, "0");
    return `${((h + 11) % 12) + 1}:${mm} ${h < 12 ? "AM" : "PM"}`;
  };

  setInterval(() => {
    if (document.hidden || !rooms.length) return;
    const room = rooms[i % rooms.length];
    i++;
    const next = order[(order.indexOf(room.dataset.s) + 1) % order.length];
    room.dataset.s = next;
    room.querySelector("span").textContent = label[next];
    room.classList.add("flash");
    setTimeout(() => room.classList.remove("flash"), 900);
    minutes += 3;
    if (clock) clock.textContent = fmt(minutes);
    if (ticker) ticker.innerHTML = `<b>Room ${room.querySelector("b").textContent}</b> ${said[next]}, just now`;
    if (readyCount) readyCount.textContent = board.querySelectorAll('.room[data-s="ready"]').length;
  }, 2600);
}

// Workflow tabs with a slow step-through
const wf = document.querySelector("[data-workflow]");
if (wf) {
  const tabs = [...wf.querySelectorAll('[role="tab"]')];
  const panels = [...wf.querySelectorAll('[role="tabpanel"]')];
  let current = 0, step = 0, timer = null, inView = false;

  const paint = () => {
    const panel = panels[current];
    const items = [...panel.querySelectorAll(".flow li")];
    const track = panel.querySelector(".track"), fill = panel.querySelector(".fill");
    const shown = reduceMotion ? items.length - 1 : step;
    items.forEach((li, n) => li.classList.toggle("on", n <= shown));
    panel.dataset.step = shown;
    panel.querySelectorAll("[data-states]").forEach((el) => { el.textContent = JSON.parse(el.dataset.states)[shown]; });
    panel.querySelectorAll("[data-keys]").forEach((el) => { el.dataset.s = JSON.parse(el.dataset.keys)[shown]; });
    if (!items.length || !track) return;
    const r = 18.4; // half the step circle
    const vertical = window.matchMedia("(max-width: 820px)").matches;
    const pos = (li) => vertical ? li.offsetTop + r : li.offsetLeft + r;
    const start = pos(items[0]), end = pos(items[items.length - 1]), at = pos(items[shown]) - start;
    if (vertical) {
      Object.assign(track.style, { left: r - 1 + "px", top: start + "px", width: "2px", height: end - start + "px" });
      Object.assign(fill.style, { left: r - 1 + "px", top: start + "px", width: "2px", height: at + "px" });
    } else {
      Object.assign(track.style, { top: r - 1 + "px", left: start + "px", height: "2px", width: end - start + "px" });
      Object.assign(fill.style, { top: r - 1 + "px", left: start + "px", height: "2px", width: at + "px" });
    }
  };
  const run = () => {
    clearInterval(timer);
    if (reduceMotion) return paint();
    let tick = 0;
    timer = setInterval(() => {
      if (!inView || document.hidden) return;
      const count = panels[current].querySelectorAll(".flow li").length;
      tick = (tick + 1) % (count + 2); // hold on the last step for a beat
      step = Math.min(tick, count - 1);
      paint();
    }, 2300);
  };
  const select = (n, focus) => {
    current = n; step = 0;
    tabs.forEach((t, k) => { t.setAttribute("aria-selected", String(k === n)); t.tabIndex = k === n ? 0 : -1; });
    panels.forEach((p, k) => { p.hidden = k !== n; });
    if (focus) tabs[n].focus();
    paint(); run();
  };
  tabs.forEach((t, k) => {
    t.addEventListener("click", () => select(k));
    t.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") select((k + 1) % tabs.length, true);
      if (e.key === "ArrowLeft") select((k - 1 + tabs.length) % tabs.length, true);
    });
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((es) => { inView = es[0].isIntersecting; }, { threshold: 0.3 }).observe(wf);
  } else { inView = true; }
  window.addEventListener("resize", paint);
  select(0);
}

// Contact form
const form = document.querySelector("form.lead");
if (form) {
  const status = form.querySelector(".form-status");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const btn = form.querySelector('button[type="submit"]');
    const name = (form.elements.name.value || "").trim().split(" ")[0];
    const done = () => {
      status.className = "form-status";
      status.textContent = `Thanks${name ? ", " + name : ""}. We got your request and we'll reach out to set up a time.`;
      status.hidden = false;
      form.reset();
    };
    if (!FORM_ENDPOINT) { done(); return; }
    btn.disabled = true; btn.textContent = "Sending...";
    try {
      const res = await fetch(FORM_ENDPOINT, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
      if (!res.ok) {
        let msg = "";
        try { msg = (await res.json()).error || ""; } catch (_) {}
        throw new Error(msg || "That didn't go through. Try again in a minute.");
      }
      done();
    } catch (err) {
      status.className = "form-status error";
      status.textContent = (err && err.message && err.message.length > 3) ? err.message : "That didn't go through. Check your connection and try again.";
      status.hidden = false;
    } finally {
      btn.disabled = false; btn.textContent = "Book a demo";
    }
  });
}

// Features tile: rooms move through the housekeeping cycle
const tileRooms = document.querySelector("[data-tile-rooms]");
if (tileRooms && !reduceMotion) {
  const order = ["dirty", "cleaning", "clean", "ready"];
  const label = { dirty: "Dirty", cleaning: "Cleaning", clean: "Clean", ready: "Ready" };
  const said = { dirty: "checked out", cleaning: "housekeeping started", clean: "marked clean", ready: "inspected, ready to sell" };
  const rooms = [...tileRooms.querySelectorAll("[data-cycle]")];
  const note = tileRooms.parentElement.querySelector(".ticker");
  let n = 0;
  setInterval(() => {
    if (document.hidden || !rooms.length) return;
    const r = rooms[n++ % rooms.length];
    const next = order[(order.indexOf(r.dataset.s) + 1) % order.length];
    r.dataset.s = next;
    r.querySelector("span").textContent = label[next];
    r.classList.add("flash");
    setTimeout(() => r.classList.remove("flash"), 900);
    if (note) note.innerHTML = `<b>Room ${r.querySelector("b").textContent}</b> ${said[next]}`;
  }, 2400);
}
