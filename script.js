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
  const prevArrow = document.querySelector('.carousel-arrow[aria-label="Previous slide"]');
  const nextArrow = document.querySelector('.carousel-arrow[aria-label="Next slide"]');
  let current = 0;

  const setActive = (index) => {
    dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
    current = index;
  };

  dots.forEach((dot, i) => dot.addEventListener('click', () => setActive(i)));
  prevArrow.addEventListener('click', () => setActive((current - 1 + dots.length) % dots.length));
  nextArrow.addEventListener('click', () => setActive((current + 1) % dots.length));
});
