document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.mobile-toggle');
  const nav = document.querySelector('.main-nav');

  toggle.addEventListener('click', () => {
    nav.classList.toggle('open');
    toggle.classList.toggle('active');
  });

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.classList.remove('active');
    });
  });

  const dots = document.querySelectorAll('.hero-carousel-controls .dot');
  const slides = document.querySelectorAll('.hero-slide');
  const prevArrow = document.querySelector('.carousel-arrow[aria-label="Previous slide"]');
  const nextArrow = document.querySelector('.carousel-arrow[aria-label="Next slide"]');
  let current = 0;
  let autoplayTimer;

  const goTo = (index) => {
    const total = slides.length;
    current = (index + total) % total;
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === current));
    dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
  };

  const startAutoplay = () => {
    clearInterval(autoplayTimer);
    autoplayTimer = setInterval(() => goTo(current + 1), 6000);
  };

  dots.forEach((dot, i) => dot.addEventListener('click', () => { goTo(i); startAutoplay(); }));
  prevArrow.addEventListener('click', () => { goTo(current - 1); startAutoplay(); });
  nextArrow.addEventListener('click', () => { goTo(current + 1); startAutoplay(); });

  if (slides.length) startAutoplay();
});
