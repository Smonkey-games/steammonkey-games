const menuButton = document.getElementById('menuButton');
const nav = document.getElementById('siteNav');
const navClose = document.getElementById('navClose');
const scrim = document.getElementById('navScrim');

function setNav(open) {
  nav.classList.toggle('open', open);
  nav.setAttribute('aria-hidden', String(!open));
  menuButton.setAttribute('aria-expanded', String(open));
  scrim.hidden = !open;
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) navClose.focus();
  else menuButton.focus();
}

menuButton.addEventListener('click', () => setNav(true));
navClose.addEventListener('click', () => setNav(false));
scrim.addEventListener('click', () => setNav(false));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && nav.classList.contains('open')) setNav(false);
});
