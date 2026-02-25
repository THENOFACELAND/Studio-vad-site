// =========================
// STUDIO VAD COACHING - JS
// =========================

// Menu mobile
const burger = document.querySelector('[data-burger]');
const mobilePanel = document.querySelector('[data-mobilepanel]');

if (burger && mobilePanel) {
  burger.addEventListener('click', () => {
    const open = mobilePanel.getAttribute('data-open') === 'true';
    mobilePanel.setAttribute('data-open', String(!open));
    mobilePanel.style.display = open ? 'none' : 'block';
  });

  // Par défaut: caché (évite flash)
  mobilePanel.style.display = 'none';
}

// Active link nav (selon page)
const path = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('a[data-nav]').forEach(a => {
  const target = a.getAttribute('href');
  if (target === path) a.classList.add('active');
});

// Reveal on scroll
const reveals = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('show');
  });
}, { threshold: 0.14 });

reveals.forEach(el => io.observe(el));

// Carousel photos (auto) - support multiple carousels on a page
const carousels = document.querySelectorAll('[data-carousel]');
carousels.forEach((carousel) => {
  const track = carousel.querySelector('[data-carousel-track]');
  const dots = Array.from(carousel.querySelectorAll('[data-carousel-dots] .dot'));
  const slides = track ? Array.from(track.children) : [];
  const interval = Number(carousel.getAttribute('data-interval')) || 3600;
  let index = 0;
  let timer = null;

  const setSlide = (nextIndex) => {
    if (!slides.length || !track) return;
    index = (nextIndex + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
  };

  const stop = () => {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  };

  const start = () => {
    if (slides.length < 2) return;
    stop();
    timer = setInterval(() => setSlide(index + 1), interval);
  };

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      setSlide(Number(dot.getAttribute('data-slide')) || 0);
      start();
    });
  });

  carousel.addEventListener('mouseenter', stop);
  carousel.addEventListener('mouseleave', start);
  carousel.addEventListener('touchstart', stop, { passive: true });
  carousel.addEventListener('touchend', start);

  setSlide(0);
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) start();
});

// =========================
// Calculateur (TDEE + macros)
// =========================
const calcForm = document.querySelector('[data-calc-form]');
if (calcForm) {
  const outTdee = document.querySelector('[data-out-tdee]');
  const outCals = document.querySelector('[data-out-cals]');
  const outP = document.querySelector('[data-out-pro]');
  const outC = document.querySelector('[data-out-carb]');
  const outF = document.querySelector('[data-out-fat]');

  function mifflinStJeor({ sex, weight, height, age }) {
    // weight kg, height cm
    const base = (10 * weight) + (6.25 * height) - (5 * age);
    return sex === 'male' ? base + 5 : base - 161;
  }

  function round(n) { return Math.round(n); }

  function calculate() {
    const sex = calcForm.sex.value;
    const weight = Number(calcForm.weight.value);
    const height = Number(calcForm.height.value);
    const age = Number(calcForm.age.value);
    const activity = Number(calcForm.activity.value);
    const goal = calcForm.goal.value;

    // Sécurité anti-n’importe-quoi
    if (!weight || !height || !age || weight <= 0 || height <= 0 || age <= 0) return;

    const bmr = mifflinStJeor({ sex, weight, height, age });
    const tdee = bmr * activity;

    let targetCalories = tdee;
    if (goal === 'cut') targetCalories = tdee * 0.85;     // -15%
    if (goal === 'bulk') targetCalories = tdee * 1.10;    // +10%

    // Macros simples et efficaces:
    // Protéines: 2g/kg (cut & maintien), 1.8g/kg (bulk)
    const proteinG = (goal === 'bulk') ? (1.8 * weight) : (2.0 * weight);
    // Lipides: 0.9g/kg (cut/maintien) ; 1.0g/kg (bulk)
    const fatG = (goal === 'bulk') ? (1.0 * weight) : (0.9 * weight);

    const proteinCals = proteinG * 4;
    const fatCals = fatG * 9;
    const carbCals = Math.max(0, targetCalories - proteinCals - fatCals);
    const carbG = carbCals / 4;

    if (outTdee) outTdee.textContent = `${round(tdee)} kcal`;
    if (outCals) outCals.textContent = `${round(targetCalories)} kcal`;
    if (outP) outP.textContent = `${round(proteinG)} g`;
    if (outC) outC.textContent = `${round(carbG)} g`;
    if (outF) outF.textContent = `${round(fatG)} g`;
  }

  calcForm.addEventListener('input', calculate);
  calcForm.addEventListener('submit', (e) => {
    e.preventDefault();
    calculate();
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  });

  // init
  calculate();
}


