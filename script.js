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

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in-view'));
  }

  if (!prefersReducedMotion) {
    const parallaxImage = document.querySelector('.hero-slide.is-active .hero-media-frame img');
    let ticking = false;

    const applyParallax = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      document.querySelectorAll('.hero-media-frame img').forEach((img) => {
        img.style.transform = `translateY(${Math.min(scrollY * 0.08, 40)}px)`;
      });
      document.querySelectorAll('.dot-pattern').forEach((el, i) => {
        const dir = i % 2 === 0 ? 1 : -1;
        el.style.transform = `translateY(${dir * Math.min(scrollY * 0.05, 24)}px)`;
      });
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(applyParallax);
        ticking = true;
      }
    }, { passive: true });

    applyParallax();
  }
});
