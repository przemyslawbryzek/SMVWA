// User dropdown menu in the sidebar.
(function () {
  const trigger = document.getElementById('user-menu-trigger');
  const menu    = document.getElementById('user-menu');
  if (!trigger || !menu) { return; }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('hidden');
  });

  document.addEventListener('click', () => menu.classList.add('hidden'));
}());
