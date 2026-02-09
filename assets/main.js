const filterButtons = document.querySelectorAll("[data-filter]");
const portfolioItems = document.querySelectorAll("[data-category]");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;

    filterButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    portfolioItems.forEach((item) => {
      if (filter === "all" || item.dataset.category.includes(filter)) {
        item.style.display = "grid";
      } else {
        item.style.display = "none";
      }
    });
  });
});
