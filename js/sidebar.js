/*
 * Sidebar behaviour
 * -----------------
 * 1. Highlights the table-of-contents link for the section in view.
 * 2. On mobile, opens/closes the contents list with the "Contents" button
 *    and closes it again after a link is chosen.
 */
(function () {
  var sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  var links = sidebar.querySelectorAll('.toc a');
  var menuButton = sidebar.querySelector('.sidebar__menu-btn');

  // ---------- 1. Active section highlight ----------

  function setActive(id) {
    links.forEach(function (link) {
      link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
    });
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, {
      // A section counts as "current" when it crosses a band near the top of the screen.
      rootMargin: '-20% 0px -70% 0px'
    });

    document.querySelectorAll('.content .section[id]').forEach(function (section) {
      observer.observe(section);
    });
  }

  // ---------- 2. Mobile menu ----------

  function setOpen(open) {
    sidebar.classList.toggle('sidebar--open', open);
    if (menuButton) menuButton.setAttribute('aria-expanded', String(open));
  }

  if (menuButton) {
    menuButton.addEventListener('click', function () {
      setOpen(!sidebar.classList.contains('sidebar--open'));
    });
  }

  links.forEach(function (link) {
    link.addEventListener('click', function () { setOpen(false); });
  });
})();
