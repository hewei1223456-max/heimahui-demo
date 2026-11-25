'use strict';

let previewPlacementId = '';
let previewPromotionPaused = false;

function mountPromotionRail(root, items, destination, reducedMotion) {
  if (!root) return;
  root.replaceChildren();
  root.hidden = !items.length;
  if (root.hidden) return;
  const multiple = items.length > 1;
  root.innerHTML = `<section class="promotion-rail" aria-label="订货会推广">
    <a class="promotion-hit"><span class="promotion-photo" aria-hidden="true"></span>
      <span class="promotion-copy"><small></small><strong></strong></span>${icon('diagonal',19)}</a>
    ${multiple ? `<div class="promotion-controls">
      <button type="button" data-promotion-pause aria-label="暂停自动轮播">${icon('pause',18)}</button>
      <button type="button" data-promotion-next aria-label="下一张订货会">${icon('chevron',19)}</button>
    </div><span class="sr-only" role="status" data-promotion-status></span>` : ''}
  </section>`;
  const rail = root.firstElementChild;
  const link = rail.querySelector('a');
  const plate = link.querySelector('.promotion-photo');
  const type = link.querySelector('small');
  const title = link.querySelector('strong');
  const pause = rail.querySelector('[data-promotion-pause]');
  const status = rail.querySelector('[data-promotion-status]');
  const controller = new AbortController();
  const listener = {signal:controller.signal};
  const covers = new Map();
  let current = Math.max(0, items.findIndex(item => item.id === previewPlacementId));
  let requested = current;
  let revision = 0, timer, animation, observer;
  let visible = false, hovered = false;

  function loadCover(item) {
    if (covers.has(item.image)) return covers.get(item.image);
    const promise = new Promise(resolve => {
      const image = new Image();
      image.alt = '';
      const wait = setTimeout(() => finish(null), 1800);
      function finish(ready) {
        clearTimeout(wait);
        image.onload = image.onerror = null;
        controller.signal.removeEventListener('abort', abort);
        resolve(ready);
      }
      const abort = () => finish(null);
      controller.signal.addEventListener('abort', abort, {once:true});
      image.onload = () => finish(image.naturalWidth ? image : null);
      image.onerror = abort;
      image.src = `assets/${item.image}.webp`;
    });
    covers.set(item.image,promise);
    return promise;
  }
  function apply(index, cover, announce = false) {
    const item = items[index];
    current = index;
    previewPlacementId = item.id;
    link.href = destination(item.id);
    link.dataset.fair = item.id;
    type.textContent = item.type + ' · 示例';
    type.dataset.paid = String(item.type === '商业推广');
    title.textContent = item.title;
    plate.replaceChildren(...(cover ? [cover] : []));
    if (announce && status) status.textContent = item.title;
  }
  function canRotate() {
    return multiple && visible && !document.hidden && !hovered && !previewPromotionPaused && !reducedMotion.matches &&
      !rail.contains(document.activeElement) && rail.isConnected;
  }
  function schedule() {
    clearTimeout(timer);
    if (canRotate()) timer = setTimeout(() => move(1, false), 6500);
  }
  async function move(delta, manual) {
    clearTimeout(timer);
    const index = requested = (requested + delta + items.length) % items.length;
    const turn = ++revision;
    const cover = await loadCover(items[index]);
    if (turn !== revision || controller.signal.aborted || !rail.isConnected) return;
    if (!manual && !canRotate()) { requested = current; return; }
    animation?.cancel();
    apply(index,cover,manual);
    if (!reducedMotion.matches && cover && typeof plate.animate === 'function')
      animation = plate.animate([{opacity:.68},{opacity:1}],{duration:220,easing:'ease-out'});
    schedule();
  }
  function syncPause() {
    if (!pause) return;
    pause.hidden = reducedMotion.matches;
    pause.setAttribute('aria-label', previewPromotionPaused ? '继续自动轮播' : '暂停自动轮播');
    pause.innerHTML = icon(previewPromotionPaused?'play':'pause',18);
    if (reducedMotion.matches) animation?.cancel();
    schedule();
  }
  apply(current,null);
  loadCover(items[current]).then(cover => {
    if (revision === 0 && !controller.signal.aborted && rail.isConnected) apply(current,cover);
  });
  if (multiple) {
    syncPause();
    rail.querySelector('[data-promotion-next]').onclick = () => move(1,true);
    pause.onclick = () => { previewPromotionPaused = !previewPromotionPaused; syncPause(); };
    rail.addEventListener('keydown',event => {
      if (!['ArrowRight','ArrowLeft'].includes(event.key)) return;
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1,true);
    },listener);
    rail.addEventListener('pointerenter',e => { hovered = e.pointerType === 'mouse'; schedule(); },listener);
    rail.addEventListener('pointerleave',() => { hovered = false; schedule(); },listener);
    rail.addEventListener('focusin',schedule,listener);
    rail.addEventListener('focusout',() => queueMicrotask(schedule),listener);
    document.addEventListener('visibilitychange',schedule,listener);
    reducedMotion.addEventListener?.('change',syncPause,listener);
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => { visible = entries[0].intersectionRatio >= .55; schedule(); },{threshold:[0,.55]});
      observer.observe(rail);
    } else { visible = true; schedule(); }
  }
  return () => { controller.abort(); clearTimeout(timer); animation?.cancel(); observer?.disconnect(); };
}
