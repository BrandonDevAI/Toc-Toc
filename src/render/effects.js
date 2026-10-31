// Reinicia una animación CSS aunque ya se esté reproduciendo.
export function playEffect(node, className) {
  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
  node.addEventListener('animationend', () => node.classList.remove(className), { once: true });
}
