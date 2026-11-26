'use strict';
const { editions, nav, goods, fairs, stories, buyers, reviews, experts, expertStores, catalogFacets } = previewData;
const $ = (s) => document.querySelector(s);
const icons = {
  home:'<path d="M4 10.5 12 4l8 6.5V20H4z"/><path d="M9.5 20v-6h5v6"/>',
  bag:'<rect x="4" y="8" width="16" height="13" rx="2"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  compass:'<circle cx="12" cy="12" r="8.5"/><path d="m15.8 8.2-2 5.6-5.6 2 2-5.6z"/>',
  user:'<circle cx="12" cy="8" r="3.3"/><path d="M5 20v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/>',
  users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2m2-14a3 3 0 0 1 0 6m1 3a4 4 0 0 1 3 4v1"/>',
  search:'<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4 4"/>',
  message:'<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8m-8 3h6"/>',
  chevron:'<path d="m9 6 6 6-6 6"/>', down:'<path d="m6 9 6 6 6-6"/>', arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
  diagonal:'<path d="M6 18 18 6M9 6h9v9"/>',
  calendar:'<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 4v4m8-4v4M4 11h16"/>',
  bookmark:'<path d="M6 4h12v16l-6-4-6 4z"/>', filter:'<path d="M4 7h16M7 12h10m-7 5h4"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>', check:'<path d="m5 12 4 4L19 6"/>', minus:'<path d="M6 12h12"/>', plus:'<path d="M6 12h12m-6-6v12"/>',
  pause:'<path d="M9 5v14m6-14v14"/>', play:'<path d="m9 5 11 7-11 7z"/>',
  grid:'<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  chart:'<path d="M4 4v16h16M8 15l4-4 3 2 5-6"/>', book:'<path d="M12 6a8 8 0 0 0-8-1v14a8 8 0 0 1 8 1 8 8 0 0 1 8-1V5a8 8 0 0 0-8 1v14"/>',
};
const icon = (name, size = 22) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || ''}</svg>`;
const esc = (input = '') => String(input).replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
const photo = (name, alt, eager = false) => `<img src="assets/${name}.webp" alt="${esc(alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async">`;
const yuan = (value) => `¥${Number(value).toLocaleString('zh-CN')}`;
const storageKey = 'heimahui-public-preview-v1';
const shopDefaults = () => ({favorites:[], reads:[], intents:[], reports:[], diagnosis:{}, question:'', expert:0, expertStore:''});
const defaults = () => ({...shopDefaults(), currentOwnerId:'owner-01', ownerRecords:{}, messages:[], followups:[], decisions:{}, promotionPaused:false, promotionChoices:['F01']});
function readData() {
  try { return { ...defaults(), ...JSON.parse(localStorage.getItem(storageKey) || '{}') }; }
  catch { return defaults(); }
}
let records = readData();
const demoOwnerById = (id) => previewData.demoOwners.find(shop => shop.id === id);
const currentDemoOwner = () => demoOwnerById(records.currentOwnerId) || previewData.demoOwners[0];
function shopRecords() {
  const shop=currentDemoOwner();
  if (route.key!=='owner' || shop.id==='owner-01') return records;
  return records.ownerRecords[shop.id] ||= shopDefaults();
}
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(records)); }
  catch { return false; }
  return true;
}
const marketBatch = 4;
const state = { query:'', filters:{}, marketLimit:marketBatch, fairType:'', fairSeason:'', topic:'' };
const dialog = $('#sheet');
const queryFields = [
 ['city','产业带',catalogFacets.origins.flatMap(([,items])=>items)],
 ['style','风格',catalogFacets.styles],
 ['category','品类',catalogFacets.categories],
 ['price','拿货单价',catalogFacets.price.map(([label])=>label)],
 ['minimum','起批量',catalogFacets.minimum.map(([label])=>label)],
 ['status','供货状态',['现货','预售']],
];
const detailRoutes = {
  owner: new Set(['product','article','fair','fairs','messages','favorites','history','supplier','report']),
  supplier: new Set(['product','article','fair','fairs','messages','favorites','demand','supplier','conversation-peer']),
  operator: new Set(['product','article','fair','fairs','messages','history','review','demand','supplier','report']),
  supplierDesk: new Set(['product','fair','fairs','messages','supplier','demand','conversation-peer']),
  platformDesk: new Set(['article','fair','fairs','messages','review']),
};
function getRoute() {
  const [edition, page, id] = location.hash.replace(/^#\/?/, '').split('/');
  const key = Object.hasOwn(editions, edition) ? edition : 'owner';
  const current = editions[key];
  return { key, page:current.nav.includes(page) || detailRoutes[key].has(page) ? page : current.first, id };
}
let route = getRoute();
let renderedHash = '';
const scrolls = new Map();
const promotionTypes = {F01:'平台推荐', F02:'商业推广', F03:'平台推荐'};
const marketPromotions = fairs.map(item => ({...item,type:promotionTypes[item.id]}));
const promotionChoices = () => Array.isArray(records.promotionChoices) ? records.promotionChoices : ['F01'];
const activePromotions = () => records.promotionPaused ? [] : marketPromotions.filter(item => promotionChoices().includes(item.id));
let disposePromotionRail;
function updatePromotionRail() {
  disposePromotionRail?.();
  disposePromotionRail=mountPromotionRail($('#market-promotion-rail'),activePromotions(),id=>href('fair',id),reduceMotion);
}
const href = (page, id, key = route.key) => `#/${key}/${page}${id ? `/${id}` : ''}`;
const link = (page, label, arrow = 'chevron', id) => `<a class="text-link" href="${href(page,id)}">${label}${icon(arrow,17)}</a>`;
const button = (label, action, klass = 'button secondary', symbol = '', id = '') => `<button type="button" class="${klass}" data-action="${action}"${id ? ` data-id="${esc(id)}"` : ''}>${symbol ? icon(symbol,19) : ''}${label}</button>`;
const pill = (text) => `<span class="pill">${esc(text)}</span>`;
const head = (title, detail = '', action = '') => `<div class="page-heading"><div><h1>${title}</h1>${detail ? `<p>${detail}</p>` : ''}</div>${action}</div>`;
const heading = (title, extra = '', caption = '') => `<div class="section-heading"><div><h2>${title}</h2>${caption ? `<p>${caption}</p>` : ''}</div>${extra}</div>`;
const back = (page, text, id) => `<a class="back" href="${href(page,id)}">${icon('chevron',16)}${text}</a>`;
const empty = (title, description, action = '') => `<div class="empty">${icon('search',27)}<h2>${title}</h2><p>${description}</p>${action}</div>`;
function go(page, id) {
  if (location.hash === href(page,id)) render();
  else location.hash = href(page,id);
}
let toastTimeout;
function toast(message) {
  const status = $('#toast');
  status.innerText = message;
  status.hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { status.hidden = true; }, 3200);
}
function openDialog(title, body, kind = '') {
  dialog.dataset.sheetKind=kind;
  $('#sheet-content').innerHTML = `<div class="sheet-top"><h2 id="sheet-title" tabindex="-1">${title}</h2><button type="button" class="icon-button" data-action="close" aria-label="关闭">${icon('close')}</button></div>${body}`;
  if (!dialog.open) dialog.showModal();
}
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
const marketTitle = () => ['supplier','supplierDesk'].includes(route.key) ? '货源广场' : '找货源';
function navItems(withIcons = false, compact = false) {
  const current = ({ product:'market', fairs:'market', fair:'market', supplier:'market', article:'info', favorites:'profile', messages:'profile', 'conversation-peer':'profile', demand:'buyers', review:'operations', history:'diagnosis', report:'diagnosis' })[route.page] || route.page;
  return editions[route.key].nav.map((key) => {
    const [label, symbol] = nav[key];
    const shown = key === 'market' ? marketTitle() : key === 'overview' ?
      (route.key === 'supplierDesk' ? editions.supplierDesk.label : '运营总览') : label;
    const short = compact && route.key === 'supplierDesk' ? ({overview:'运营后台',events:'活动推广'})[key] : undefined;
    return `<a href="${href(key)}"${key === current ? ' aria-current="page"' : ''}${short ? ` aria-label="${shown}"` : ''}>${withIcons ? icon(symbol,23) : ''}<span>${short || shown}</span></a>`;
  }).join('');
}
function renderShell() {
  const edition = editions[route.key];
  const isDesk = route.key.endsWith('Desk');
  document.body.classList.toggle('is-console',isDesk);
  $('#top').innerHTML = `<div class="top-inner">
    <a class="brand" href="${href(edition.first)}"><img src="assets/mark.svg" alt="" width="38" height="38"><span>黑马汇</span></a>
    ${isDesk ? `<span class="top-context">${edition.label}</span>` : `<nav class="desktop-nav" aria-label="主导航">${navItems()}</nav>`}
    <div class="top-actions"><button type="button" class="icon-button top-search" data-action="search" aria-label="搜索货源">${icon('search')}</button>
      <a class="icon-button top-message" aria-label="消息" href="${href('messages')}">${icon('message')}</a>
      <button type="button" data-action="editions" class="edition-button" aria-label="切换演示身份，当前${edition.label}"><span class="edition-mark"></span><span>${edition.label}</span>${icon('down',14)}</button></div>
  </div>`;
  $('#mobile-nav').innerHTML = navItems(true,true);
  $('#foot').innerHTML = `<div><a class="brand foot-brand" href="${href(edition.first)}"><img src="assets/mark.svg" alt="" width="29" height="29"><span>黑马汇</span></a><p>交互演示 · 内容及业务记录均为样例</p></div>${button(`查看五个版本${icon('diagonal',16)}`,'editions','text-link')}`;
}
function productCard(item) {
  const favorite = shopRecords().favorites.includes(item.id);
  return `<article class="product-card"><a class="product-link" href="${href('product',item.id)}">
    <div class="product-image" data-product-photo="${item.id}">${photo(item.image,`${item.title}款式示意`)}<span class="stock-tag ${item.status === '预售' ? 'preorder' : ''}">${item.status}</span></div>
    <div class="product-data"><div class="product-origin">${item.city} <span>·</span> ${item.style}</div>
      <h3>${item.title}</h3><div class="product-line"><strong>${yuan(item.price)}</strong><span> / 件</span><span>${item.minimum} 件起</span></div>
    </div></a><button type="button" class="save-button${favorite ? ' active' : ''}" data-action="favorite" data-id="${item.id}" aria-label="${favorite ? '取消收藏' : '收藏'}${item.title}" aria-pressed="${favorite}">${icon('bookmark',19)}</button></article>`;
}
function storyCard(item) {
  return `<article class="story-card"><a href="${href('article',item.id)}"><div class="story-image">${photo(item.image,'')}</div>
    <div class="story-copy"><span class="eyebrow">${item.topic}</span><h3>${item.title}</h3><p>${item.intro}</p><span class="story-arrow">${icon('arrow',19)}</span></div></a></article>`;
}
function info() {
  const topics = ['', '组货笔记','经营方法','产业带观察'];
  const results = stories.filter((item) => !state.topic || item.topic === state.topic);
  const third = route.key === 'supplier' ? ['buyers','找客户','查看店主拿货需求','users'] : ['diagnosis','店铺诊断','整理门店经营问题','compass'];
  const shortcuts = [
    ['market',route.key === 'supplier' ? '货源广场' : '筛选货源','按产业带、风格与拿货条件','bag'],
    ['fairs','订货会广场','查看样例场次与看样意向','calendar'],
    third,
  ];
  const consultation=editions[route.key].nav.includes('diagnosis');
  return `<section class="brand-stage" aria-label="黑马汇选货">
      <div class="brand-stage-copy">
        <h1>好货，值得细选。</h1>
        <p class="stage-intro">女装店主的选货与经营工作台</p>
        <div class="stage-actions"><a class="button stage-button" href="${href('market')}">开始找货${icon('arrow',18)}</a>
          ${consultation?`<a class="stage-secondary" href="${href('diagnosis','expert')}">经营专家咨询${icon('chevron',16)}</a>`:''}</div>
      </div>
      <figure class="brand-stage-art">${photo('lookbook-journal','同一衣架上陈列的灰橄榄、砂白与焦茶色女装搭配',true)}
        <figcaption class="stage-label">示例女装货盘</figcaption></figure>
    </section>
    <div class="journal-wrap">
      <section class="utility-line" aria-label="常用经营入口">
        ${shortcuts.map(([path,title,description,symbol]) => `<a href="${href(path)}"><span class="utility-icon">${icon(symbol,22)}</span><span><strong>${title}</strong><small>${description}</small></span>${icon('chevron',17)}</a>`).join('')}
      </section>
      <section class="section assortment">${heading('本期选品',link('market','查看全部货源','arrow'),'面向换季陈列的四种款式。')}
        <div class="product-grid home-products">${goods.slice(0,4).map(productCard).join('')}</div>
      </section>
      <section class="section editorial">${heading('经营手记')}
        <div class="segments" aria-label="资讯频道">${topics.map((topic) => `<button type="button" class="segment${state.topic === topic ? ' selected' : ''}" data-action="topic" data-id="${topic}" aria-pressed="${state.topic === topic}">${topic || '全部资讯'}</button>`).join('')}</div>
        ${state.topic ? `<div class="story-grid">${results.map(storyCard).join('')}</div>` : `<div class="journal-grid">${storyCard(stories[0])}<div class="journal-side">${stories.slice(1).map((item) => listLink('article',item.title,item.topic,'book',item.id)).join('')}<a class="journal-fair" href="${href('fair','F01')}"><span>样例场次 · 杭州</span><strong>冬季货盘开放日</strong>${icon('diagonal',19)}</a></div></div>`}
      </section>
    </div>`;
}
function matches(item, filters = state.filters) {
  const query = state.query.trim().toLowerCase();
  if (query && ![item.title,item.id,item.category,item.supplier,item.city,item.style,...item.styleTags].join(' ').toLowerCase().includes(query)) return false;
  return queryFields.every(([key]) => {
    const chosen = filters[key] || [];
    if (!chosen.length) return true;
    if (key === 'style') return chosen.some(style=>item.styleTags.includes(style));
    if (key === 'category') return chosen.includes(item.catalogCategory);
    if (key === 'price' || key === 'minimum')
      return catalogFacets[key].some(([label,min,max]) => chosen.includes(label) && item[key]>=min &&
        (max===undefined || (key==='price'?item[key]<max:item[key]<=max)));
    return chosen.includes(item[key]);
  });
}
function market() {
  const found = goods.filter(item=>matches(item));
  const count = Object.values(state.filters).flat().length;
  const filters = button(`筛选${count ? ` · ${count}` : ''}`,'filters','button secondary','filter');
  const actions = route.key === 'supplierDesk' ?
    `<div class="market-head-actions"><a class="button secondary" href="${href('stock')}">${icon('chart',19)}查看我的货源数据</a>${filters}</div>` : filters;
  return `${head(marketTitle(),'按门店风格、价格带与拿货条件筛选。',actions)}
    <form class="search-bar" data-form="market"><label class="sr-only" for="market-query">搜索款名、款号、品类和厂家</label>${icon('search',21)}<input type="search" id="market-query" name="query" value="${esc(state.query)}" placeholder="搜款名或厂家"><button type="submit" class="button primary">搜索</button></form>
    ${count ? `<div class="active-filters">${Object.entries(state.filters).flatMap(([key,values]) => values.map((value) => `<button type="button" class="segment selected" data-action="remove-filter" data-group="${key}" data-id="${esc(value)}" aria-label="移除${esc(value)}">${esc(value)}${icon('close',14)}</button>`)).join('')}${button('清空','clear-filters','text-link')}</div>` : ''}
    <div id="market-promotion-rail" hidden></div>
    <section class="section market-section">${heading('在看货源',link('fairs','订货会广场','diagonal'),`${found.length} 款示例货源`)}
      ${found.length ? `<div class="product-grid" id="market-products">${found.slice(0,state.marketLimit).map(productCard).join('')}</div>
        <p class="sr-only" id="market-progress" role="status"></p><div class="market-more" ${found.length<=state.marketLimit?'hidden':''}>${marketMore(found.length)}</div>` :
        empty('没有找到匹配的款','试着去掉一项筛选，或换一个搜索词。',button('重置搜索与筛选','reset-market'))}</section>`;
}
function marketMore(total) {
  const available=Math.min(total-state.marketLimit,marketBatch);
  return available>0 ? `<button type="button" class="button secondary" data-action="more-market" aria-controls="market-products">继续浏览 ${available} 款${icon('down',17)}</button>` : '';
}
function appendMarket() {
  const grid=$('#market-products'), pager=$('.market-more');
  if (!grid || !pager) return;
  const found=goods.filter(item=>matches(item)), start=state.marketLimit;
  const next=found.slice(start,start+marketBatch);
  if (!next.length) return;
  state.marketLimit=start+next.length;
  grid.insertAdjacentHTML('beforeend',next.map(productCard).join(''));
  grid.children[start].querySelector('a').focus({preventScroll:true});
  pager.innerHTML=marketMore(found.length);
  pager.hidden=state.marketLimit>=found.length;
  $('#market-progress').textContent=state.marketLimit>=found.length
    ? `已显示全部 ${found.length} 款` : `已显示 ${state.marketLimit} 款，共 ${found.length} 款`;
}
function missing(destination,name) {
  return `<section class="section">${empty(`找不到此${name}`,'这条示例可能已移除，或链接有误。',`<a class="button secondary" href="${href(destination)}">返回列表</a>`)}</section>`;
}
function product() {
  const item = goods.find((one) => one.id === route.id);
  if (!item) return missing('market','货源');
  const favorite = shopRecords().favorites.includes(item.id);
  const owner = ['owner','operator'].includes(route.key);
  const index = goods.indexOf(item);
  return `${back('market','返回货源列表')}<div class="detail-grid">
    <div class="detail-image" data-product-photo="${item.id}">${photo(item.image,`${item.title}款式示意`,true)}</div>
    <article class="detail-content"><div class="badge-row">${pill(item.status)}${pill(item.style)}<span class="muted">款号 ${item.id}</span></div>
      <h1>${item.title}</h1><p>${item.fits}</p><p class="detail-price"><strong>${yuan(item.price)}</strong><span> / 件 · 示例拿货价</span></p>
      <dl class="detail-data"><div><dt>厂家</dt><dd><a href="${href('supplier',item.id)}">${item.supplier}${icon('chevron',14)}</a></dd></div><div><dt>产地</dt><dd>${item.city}</dd></div><div><dt>起批</dt><dd>${item.minimum} 件</dd></div><div><dt>预计发货</dt><dd>${item.dispatch}</dd></div></dl>
      ${owner ? `<div class="quantity-line"><label for="quantity">试拿数量</label><div class="stepper">${button('','quantity-minus','','minus')}<input id="quantity" type="number" min="1" max="999" value="${item.minimum}" inputmode="numeric" aria-label="试拿数量" aria-describedby="trial-note">${button('','quantity-plus','','plus')}</div><output id="estimate">${yuan(item.minimum * item.price)}</output></div><p class="trial-note" id="trial-note" role="status" hidden></p>` : ''}
      <div class="button-row">${owner ? button('复制试拿清单','copy-trial','button primary')+inquiryAction(item.id,'一对一咨询','button secondary') : ''}
        <button type="button" class="button secondary" data-action="favorite" data-id="${item.id}" aria-pressed="${favorite}">${icon('bookmark',19)}${favorite ? '已收藏' : '收藏'}</button></div></article></div>
    <section class="section">${heading('继续选款',link('market','更多货源'))}<div class="product-grid">${goods.slice(index+1).concat(goods.slice(0,index)).slice(0,4).map(productCard).join('')}</div></section>`;
}
function supplierPage() {
  const item = goods.find((one) => one.id === route.id);
  if (!item) return missing('market','厂家');
  const list = goods.filter((one) => one.supplier === item.supplier);
  const canContact = ['owner','operator'].includes(route.key);
  return `${back('product','返回款式详情',item.id)}${head(item.supplier,`${item.city} · 厂家展示样例`)}
    <div class="surface stack"><h2>供货信息</h2><p>起批、发货和供货状态按款式展示。</p><div class="button-row">${canContact ? inquiryAction(item.id,'发起咨询') : ''}${button('查看联系名片','contact-card')}</div></div>
    <section class="section">${heading('在架款式')}<div class="product-grid">${list.map(productCard).join('')}</div></section>`;
}
function fairCard(item) {
  return `<article class="fair-card"><a href="${href('fair',item.id)}"><div class="fair-image">${photo(item.image,'')}</div><div class="story-copy"><div class="eyebrow">${item.type} · ${item.season}</div><h3>${item.title}</h3><p>${item.city} · ${item.date}</p><span class="story-arrow">${icon('arrow',19)}</span></div></a></article>`;
}
function fairList() {
  const typeOptions = ['', '内部订货会','市场展会','行业展会'];
  const seasonOptions = ['', '春夏订货会','春季订货会','秋冬订货会','冬季订货会'];
  const found = fairs.filter((item) => (!state.fairType || state.fairType === item.type) && (!state.fairSeason || state.fairSeason === item.season));
  return `${back('market','返回货源')}${head('订货会广场','按活动类型和季节组合查看场次。')}
    <form class="surface pick-row" data-form="fairs"><label>活动类型<select name="type">${typeOptions.map((value) => `<option ${value === state.fairType ? 'selected' : ''} value="${value}">${value || '全部类型'}</option>`).join('')}</select></label><label>季节<select name="season">${seasonOptions.map((value) => `<option ${value === state.fairSeason ? 'selected' : ''} value="${value}">${value || '全部季节'}</option>`).join('')}</select></label><button type="submit" class="button primary">应用条件</button>${button('重置','clear-fairs')}</form>
    <section class="section">${found.length ? `<div class="story-grid">${found.map(fairCard).join('')}</div>` : empty('当前没有对应场次','调整活动类型或季节后再看。',button('重置条件','clear-fairs'))}</section>`;
}
function fair() {
  const item = fairs.find((one) => one.id === route.id);
  if (!item) return missing('fairs','活动');
  const registered = shopRecords().intents.includes(item.id);
  const canRegister = ['owner','operator'].includes(route.key);
  return `${back('fairs','订货会广场')}<div class="detail-grid fair-detail">
    <div class="detail-image">${photo(item.image,`${item.title}活动示意`,true)}</div><article class="detail-content">
      <div class="badge-row">${pill(item.type)}${pill(item.season)}${pill('示例场次')}</div><h1>${item.title}</h1><p>${item.description}</p>
      <dl class="detail-data"><div><dt>时间</dt><dd>${item.year} 年 ${item.date}</dd></div><div><dt>城市</dt><dd>${item.city}</dd></div><div><dt>主办方</dt><dd>${item.organizer}</dd></div>${canRegister ? `<div><dt>我的意向</dt><dd>${registered ? '已登记' : '未登记'}</dd></div>` : ''}</dl>
      ${canRegister ? `<div class="button-row">${button(registered ? '取消意向' : '登记意向','intent',`button ${registered ? 'secondary' : 'primary'}`,registered ? 'check' : 'calendar',item.id)}</div>` : ''}</article></div>`;
}
function article() {
  const item = stories.find((one) => one.id === route.id);
  if (!item) return missing('info','资讯');
  const saved = shopRecords().reads.includes(item.id);
  return `${back('info','返回资讯')}<article class="article-detail"><div class="eyebrow">${item.topic} · 黑马汇示例编辑部</div><h1>${item.title}</h1><p class="article-lede">${item.intro}</p>
    <div class="article-image">${photo(item.image,'',true)}</div>${item.paragraphs.map((part) => `<p>${part}</p>`).join('')}${button(saved ? '已收藏' : '收藏资讯','read-save','button secondary','bookmark',item.id)}</article>`;
}

function profile() {
  const title = route.key === 'supplier' ? '厂家工作区' : '我的黑马汇';
  const active=route.key==='owner' ? currentDemoOwner() : null;
  const choose=active ? button('切换示例门店','demo-owners','button secondary','users') : '';
  return `${head(title, active ? esc(active.shop)+' · '+esc(active.city)+' · '+esc(active.style)+' · 示例门店' : '演示操作保存在当前浏览器。', choose)}
    <div class="surface list">${listLink('favorites','收藏与选货清单',`${shopRecords().favorites.length} 款货源 · ${shopRecords().reads.length} 篇资讯`,'bookmark')}
    ${listLink('messages','一对一咨询',`${previewInquiries().length} 个示例会话`,'message')}
    ${route.key === 'owner' ? listLink('history','店铺诊断历史',`${shopRecords().reports.length} 份示例报告`,'compass') : button('查看联系名片','contact-card','list-button','user')}
    ${button('重置当前浏览器的演示记录','reset','list-button','close')}</div>`;
}
function listLink(page,title,desc,symbol='chevron',id) {
  return `<a class="list-item" href="${href(page,id)}"><span class="list-icon">${icon(symbol)}</span><span><strong>${title}</strong><small>${desc}</small></span>${icon('chevron',17)}</a>`;
}
function favorites() {
  const savedGoods = goods.filter((item) => shopRecords().favorites.includes(item.id));
  const savedStories = stories.filter((item) => shopRecords().reads.includes(item.id));
  return `${back('profile','返回我的')}${head('收藏与选货清单')}
    ${savedGoods.length || savedStories.length ? `<section class="section">${heading('已收藏货源')}<div class="product-grid">${savedGoods.map(productCard).join('')}</div></section>
      <section class="section">${heading('已收藏资讯')}<div class="story-grid">${savedStories.map(storyCard).join('')}</div></section>` :
    empty('还没有收藏','逛逛货源或资讯，收藏后会在这里出现。',`<a class="button primary" href="${href('market')}">去找货源</a>`)}`;
}
const demoFactoryProduct = 'HM2601';
const demoBuyerSide = () => route.key === 'owner' || route.key === 'operator';

function inquiryTarget(id) {
  const product = goods.find(item => item.id === id);
  const buyer = buyers.find(item => item.id === id);
  if (product) return { product, ownerAccountId: currentDemoOwner().id, factoryProduct: goods.find(item => item.supplier === product.supplier) };
  if (buyer) return { buyer, ownerAccountId: buyer.id, factoryProduct: goods.find(item => item.id === demoFactoryProduct) };
  return null;
}

function inquiryId(ownerAccountId, factoryProductId) {
  return `${ownerAccountId}~${factoryProductId}`;
}

function previewInquiries() {
  if (route.key === 'platformDesk') return [];
  const buyerSide = demoBuyerSide();
  const threads = new Map();
  records.messages.forEach(message => {
    const source = inquiryTarget(message.id);
    const ownerAccountId = message.ownerAccountId || source?.buyer?.id || 'owner-01';
    const factoryProductId = message.factoryProductId || source?.factoryProduct.id;
    if (!factoryProductId || (buyerSide ? ownerAccountId !== currentDemoOwner().id : factoryProductId !== demoFactoryProduct)) return;
    const factoryProduct = goods.find(item => item.id === factoryProductId);
    const buyer = buyers.find(item => item.id === ownerAccountId);
    const account = buyer ? null : demoOwnerById(ownerAccountId);
    if (!factoryProduct || (!buyer && !account)) return;
    const id = inquiryId(ownerAccountId, factoryProductId);
    const thread = threads.get(id) || { id, ownerAccountId, factoryProduct, buyer, account, messages: [] };
    thread.messages.push(message);
    threads.delete(id);
    threads.set(id, thread);
  });
  return [...threads.values()].reverse();
}

function inquiryAction(id, initialLabel, klass = 'button primary') {
  const target = inquiryTarget(id);
  const existingId = target && inquiryId(target.ownerAccountId, target.factoryProduct.id);
  return existingId && previewInquiries().some(thread => thread.id === existingId)
    ? `<a class="${klass}" data-demo-resume-inquiry href="${href('messages',existingId)}">${icon('message',19)}继续咨询</a>`
    : button(initialLabel,'compose',klass,'message',id);
}

function previewPeerName(thread) {
  return demoBuyerSide() ? thread.factoryProduct.supplier : thread.buyer?.name || thread.account?.shop;
}

function messagesPage() {
  const threads = previewInquiries();
  const thread = threads.find(item => item.id === route.id);
  if (route.id && !thread) return missing('messages','咨询');
  if (thread) {
    const buyerSide = demoBuyerSide();
    const person = buyerSide ? href('supplier',thread.factoryProduct.id) : thread.buyer
      ? href('demand',thread.buyer.id) : href('conversation-peer',thread.id);
    const profile = `<a class="button secondary" data-demo-conversation-peer href="${person}">${buyerSide ? '查看厂家主页' : '查看店铺主页'}${icon('chevron',17)}</a>`;
    const history = thread.messages.map(message => {
      const sentByOwner = message.sender ? message.sender === 'owner' : message.direction === '店主询货';
      const mine = sentByOwner === buyerSide;
      return `<article class="preview-message${mine ? ' mine' : ''}"><small>${mine ? '我' : '对方'}</small><p>${esc(message.text)}</p></article>`;
    }).join('');
    return `${back('messages','返回咨询列表')}<div class="preview-thread-heading">${head(esc(previewPeerName(thread)),'',profile)}</div>
      <section class="surface stack preview-conversation"><div class="preview-message-log" role="log" aria-label="咨询消息" tabindex="0">${history}</div>
      <form class="stack" data-form="compose" data-thread="${thread.id}"><label for="preview-reply">发消息</label><textarea id="preview-reply" name="text" rows="3" maxlength="500" required></textarea><div class="sheet-actions"><button class="button primary" type="submit">保存示例留言${icon('arrow',18)}</button></div></form></section>`;
  }
  const discovery = demoBuyerSide() ? 'market' : route.key === 'supplierDesk' ? 'follow' : 'buyers';
  return `${head('一对一咨询','演示消息保存在当前浏览器。')}
    ${route.key === 'platformDesk' ? empty('暂无授权工单会话','平台工作台通过审核队列与对应工单处理业务。',`<a class="button primary" href="${href('business')}">打开审核队列</a>`) : threads.length ? `<div class="surface list">${threads.map(thread => listLink('messages',esc(previewPeerName(thread)),esc(thread.messages.at(-1).text),'message',thread.id)).join('')}</div>` :
    empty('暂无咨询记录','从款式详情或客户需求页发起一对一咨询。',`<a class="button primary" href="${href(discovery)}">去${demoBuyerSide() ? '找货源' : '找客户'}</a>`)}`;
}

function conversationPeerPage() {
  const thread = previewInquiries().find(item => item.id === route.id);
  if (!thread?.account || demoBuyerSide()) return missing('messages','店铺');
  const { shop, name, city, style } = thread.account;
  return `${back('messages','返回本次咨询',thread.id)}${head(esc(shop),'示例店铺')}
    <div class="surface stack form-layout"><dl class="detail-data">${[['经营者',name],['城市',city],['风格',style]].filter(([,value]) => value).map(([label,value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></div>`;
}
function currentExpert() {
  const expert=experts[shopRecords().expert] || experts[0];
  const store=expert.label==='大店专家'?expertStores.find(item=>item.id===shopRecords().expertStore):null;
  return {expert,store};
}
function diagnosis() {
  const values = shopRecords().diagnosis;
  const reportMode = route.id !== 'expert';
  const {expert,store} = currentExpert();
  return `${head(reportMode?'店铺诊断':'经营专家咨询','',link('history','历史记录'))}
    <nav class="diag-tabs" aria-label="经营工具">
      <a href="${href('diagnosis')}"${reportMode?' aria-current="page"':''}>店铺诊断</a>
      <a href="${href('diagnosis','expert')}"${!reportMode?' aria-current="page"':''}>经营专家咨询</a>
    </nav>
    ${reportMode ? `<form data-form="diagnosis" class="surface stack form-layout">
      <div><h2>门店基本信息</h2><p>网页演示请填样例信息。</p></div><div class="field-grid">
      <label>经营城市<input name="city" maxlength="32" placeholder="例如 杭州" value="${esc(values.city)}" required></label>
      <label>店型<select name="type" required><option value="">选择店型</option>${['社区店','商场店','独立临街店','买手店','区域大店'].map((type) => `<option${values.type === type ? ' selected' : ''}>${type}</option>`).join('')}</select></label>
      <label>门店面积（㎡）<input type="number" name="area" min="1" max="99999" value="${esc(values.area)}" placeholder="例如 80" required></label>
      <label>主要客群<input name="audience" maxlength="48" value="${esc(values.audience)}" placeholder="例如 周边上班族" required></label></div>
      <label>想解决的问题<textarea name="problem" maxlength="300" rows="3" placeholder="例如 新款试穿不少，实际售出偏少" required>${esc(values.problem)}</textarea></label>
      <div class="button-row"><button class="button primary" type="submit">生成示例诊断${icon('arrow',18)}</button>${button('填入一组示例','example-diagnosis')}</div></form>` :
    `<div class="consult-workspace">
      <section class="consult-context"><h2>${store?esc(store.name):expert.label}</h2>
        <p>${store?'大店案例 · 方法角色':expert.detail}</p>
        ${button(store?'换一家门店':'选择专家',store?'expert-stores':'experts','button secondary','chevron')}
        ${store?'':button('浏览大店专家','expert-stores','text-link','arrow')}
      </section>
      <section class="consult-composer"><label for="expert-question">你想解决什么经营问题？</label>
        <textarea id="expert-question" maxlength="1000" rows="5" placeholder="${esc(expert.question)}">${esc(shopRecords().question)}</textarea>
        <div class="consult-actions">${button('使用示例问题','example-question','text-link')}${button('查询资料','expert-material','button secondary','book')}${button('保存草稿','save-question','button primary')}</div>
        <p class="help">公开演示可选专家、查资料和保存问题。</p>
      </section></div>`}`;
}
function historyPage() {
  return `${head('诊断历史','当前浏览器中的示例报告。')}
    ${shopRecords().reports.length ? `<div class="surface list">${shopRecords().reports.slice().reverse().map((item) => listLink('report',`${esc(item.city)} · ${esc(item.type)}`,esc(item.problem),'compass',item.id)).join('')}</div>` :
    empty('还没有诊断报告','填写店铺资料，即可检查示例报告的结构。',`<a class="button primary" href="${href('diagnosis')}">去填写门店资料</a>`)}`;
}
function report() {
  const item = shopRecords().reports.find((one) => one.id === route.id);
  if (!item) return missing('history','报告');
  const stock = /库存|囤货|滞销|补货|上新/.test(item.problem);
  const finding = stock ? '先分清畅销缺货与滞销压货。' : '先确定问题发生在进店、试穿，还是试穿之后。';
  const action = stock ? '按款记录近 7 天销量、现有库存与补货交期。只挑一组稳定好销款做小批补单。' : '选一组主推款连续观察 7 天，每天记录进店、试穿和成交数，再决定改陈列还是改搭配。';
  return `${back('history','返回诊断历史')}${head('店铺诊断报告',`${esc(item.city)} · ${esc(item.type)} · ${esc(item.area)}㎡`)}
    <div class="surface stack form-layout"><div class="badge-row">${pill('规则示例')}${pill('根据演示字段整理')}</div><h2>${finding}</h2>
    <p>你填写的问题是「${esc(item.problem)}」。当前信息没有客流、销量和库存周期，报告先给出可验证的检查动作。</p>
    <h3>一周内可以试</h3><p>${action}</p><h3>复盘指标</h3><p>${stock ? '记录 7 天动销变化、库存周转天数和到货及时性。' : '比较调整前后的试穿率与试穿成交率，记录同档期的客流差异。'}</p></div>`;
}
function buyerList() {
  return `${head('找客户','按经营场景了解门店需求。',pill('样例需求'))}
    <div class="story-grid buyer-grid">${buyers.map((item) => `<article class="surface stack buyer-card">
    <div class="badge-row">${pill(item.city)}${pill(item.style)}</div><h2>${item.name}</h2><p>${item.needs}</p><span class="muted">${item.mode} · ${item.budget}</span>${link('demand','查看需求','diagonal',item.id)}</article>`).join('')}</div>`;
}
function demand() {
  const item = buyers.find((one) => one.id === route.id);
  if (!item) return missing('buyers','需求');
  return `${back(route.key === 'supplierDesk' ? 'follow' : 'buyers','返回找客户')}${head(item.name,`${item.city} · ${item.mode}`)}
    <div class="surface stack form-layout"><div class="badge-row">${pill(item.style)}${pill(item.budget)}</div><h2>拿货需求</h2><p>${item.needs}</p>
      <div class="button-row">${!demoBuyerSide() ? inquiryAction(item.id,'发起示例咨询') : ''}${button('记入回访','followup','button secondary','calendar',item.id)}</div></div>`;
}
function reviewList() {
  return `<div class="surface list">${reviews.map((item) => listLink('review',item.name,`${item.type} · ${item.by} · ${records.decisions[item.id] || '待审核'}`,'grid',item.id)).join('')}</div>`;
}
function operations() {
  const pending = reviews.filter((item) => !records.decisions[item.id]).length;
  return `${head('平台管理','移动审核、推广状态与业务巡检。',pill('样例数据'))}
    <section>${heading('待处理事项','',`${pending} 条示例任务待审核`)}${reviewList()}</section>
    <section class="section">${heading('快捷管理')}<div class="surface list">${button(`${records.promotionPaused ? '恢复' : '暂停'}找货页活动展示`,'pause-promotion','list-button','calendar')}${listLink('fairs','查看订货会广场','确认公开活动展示','calendar')}</div></section>`;
}
function review() {
  const item = reviews.find((one) => one.id === route.id);
  if (!item) return missing('operations','任务');
  const status = records.decisions[item.id];
  return `${back(route.key === 'platformDesk' ? 'business' : 'operations','返回审核队列')}${head(item.name,`${item.id} · ${item.type} · ${item.by}`)}
    <div class="surface stack form-layout"><div class="badge-row">${pill(status || '待审核')}${pill('样例业务')}</div><p>${item.notes}</p>
      ${status ? '<p class="help">这次示例审核结果已保存在当前浏览器。</p>' :
      `<div class="button-row">${button('示例通过','approve','button primary','check',item.id)}${button('示例退回','reject','button secondary','close',item.id)}</div>`}</div>`;
}
function promotionDesk() {
  return `<section class="surface stack promotion-desk"><div class="promotion-desk-heading">
    <div><h2>找货页投放</h2><p>${records.promotionPaused ? '频道已暂停' : `当前展示 ${activePromotions().length} 场`}</p></div>
    ${button(records.promotionPaused ? '恢复展示' : '暂停展示','pause-promotion','button secondary','calendar')}
  </div><div class="promotion-desk-list">${marketPromotions.map(item=>{
    const selected=promotionChoices().includes(item.id);
    return `<div class="promotion-desk-row"><div><p>${item.type} · 示例</p><h3>${item.title}</h3><p>${item.city} · ${item.date}</p></div>
      <button class="button secondary" type="button" data-action="toggle-placement" data-id="${item.id}" aria-pressed="${selected}"
        aria-label="${selected ? '移除' : '展示'}${item.title}">${selected?'移除展示':'加入展示'}</button></div>`;
  }).join('')}</div><a class="text-link" href="${href('market',null,'owner')}">查看找货页${icon('diagonal',17)}</a></section>`;
}
function desk() {
  const platform = route.key === 'platformDesk';
  const supplierGoods = goods.filter(item => item.supplier === '杭州北巷样品间');
  const supplierProductIds = new Set(supplierGoods.map(item => item.id));
  const productInquiries = records.messages.filter(m => supplierProductIds.has(m.id) && m.direction === '店主询货');
  const supplierMessages = records.messages.filter(m => supplierProductIds.has(m.id) || m.id.startsWith('B'));
  const data = platform ? [
    ['在架样例货源',goods.length],['示例活动',fairs.length],['待审核任务',reviews.filter((item) => !records.decisions[item.id]).length],
  ] : [['本厂样例货源',supplierGoods.length],['示例咨询',supplierMessages.length],['回访记录',records.followups.length]];
  const rows = platform ? [
    ['样例货源',goods.length],['意向记录',shopRecords().intents.length],['示例留言',records.messages.length],['示例审核',Object.keys(records.decisions).length],
  ] : [['在架款式',data[0][1]],['收到询货',supplierMessages.filter((m) => m.direction === '店主询货').length],['主动联系',supplierMessages.filter((m) => m.direction === '厂家主动咨询').length],['已记回访',records.followups.length]];
  const byPage = {
    stock: () => `<div class="metric-grid"><article class="surface metric"><span>本厂样例货源</span><strong>${supplierGoods.length}</strong></article>
      <article class="surface metric"><span>示例询货记录</span><strong>${productInquiries.length}</strong></article></div>
      <section class="section">${heading('本厂款式',link('market','返回货源广场'))}<div class="product-grid">${supplierGoods.map(productCard).join('')}</div></section>`,
    follow: () => `${records.followups.length ? `<div class="surface list">${records.followups.slice().reverse().map((item) => `<div class="list-item"><span class="list-icon">${icon('calendar')}</span><span><strong>${esc(item.name)}</strong><small>${esc(item.text)}</small></span>${pill('计划跟进')}</div>`).join('')}</div>` : empty('暂无已记回访','切换至厂家前台，在客户需求中记入示例回访。',`<a class="button primary" href="${href('buyers',null,'supplier')}">打开厂家前台</a>`)}`,
    events: () => `<div class="story-grid">${fairs.filter((item) => item.id === 'F01').map(fairCard).join('')}</div>`,
    company: () => `<div class="surface stack form-layout"><h2>杭州北巷样品间</h2><p>示例主体。经营数据和记录由当前演示中的操作产生。</p>${button('查看联系名片','contact-card','button secondary','user')}</div>`,
    business: reviewList,
    knowledge: () => `<div class="surface list">${experts.map((item, index) => button(`${item.label} <span class="muted">${item.detail}</span>`,'desk-expert','list-button','book',String(index))).join('')}</div>`,
    promotion: promotionDesk,
    audit: () => `<div class="surface list">${rows.map(([label,value]) => `<div class="list-item"><span class="list-icon">${icon('chart')}</span><span><strong>${label}</strong><small>当前浏览器演示与样例记录</small></span><strong>${value}</strong></div>`).join('')}</div>`,
  };
  if (route.page !== 'overview' && byPage[route.page]) return `${head(route.page === 'stock' ? '我的货源数据' : nav[route.page][0],`${editions[route.key].label} · 示例数据`)}${byPage[route.page]()}`;
  const maximum = Math.max(1,...rows.map((row) => row[1]));
  return `${head(platform ? '运营总览' : editions.supplierDesk.label,platform ? '审核任务与业务活动 · 样例环境' : '杭州北巷样品间 · 样例环境',pill('演示环境'))}
    <div class="metric-grid">${data.map(([label,value]) => `<article class="surface metric"><span>${label}</span><strong>${value}</strong></article>`).join('')}</div>
    <div class="desk-grid"><section class="surface stack"><div><h2>${platform ? '运营活动' : '获客与回访'}</h2><p>样例及当前浏览器产生的记录</p></div>
      <div class="bar-chart">${rows.map(([label,value]) => `<div><span>${label}</span><meter min="0" max="${maximum}" value="${value}" aria-label="${label}">${value}</meter><strong>${value}</strong></div>`).join('')}</div></section>
    <section class="surface stack"><h2>${platform ? '待处理与巡检' : '工作入口'}</h2><div class="list">${platform ?
    listLink('business','打开审核队列',`${data[2][1]} 条待审核`,'grid')+listLink('promotion','渠道与推广','管理示例活动的展示','calendar') :
    listLink('follow','查看客户与回访',`${data[2][1]} 条回访记录`,'users')+listLink('stock','管理样例货源',`${data[0][1]} 款当前在架`,'bag')}</div></section></div>`;
}

function filterGroupMarkup(key,label,options) {
  const groups=key==='city'?catalogFacets.origins:[['',options]];
  const choices=items=>items.map(option=>`<label><input type="checkbox" name="${key}" value="${esc(option)}"${state.filters[key]?.includes(option)?' checked':''}><span>${esc(option)}</span></label>`).join('');
  return `<fieldset data-filter-group="${key}"${key==='city'?'':' hidden'}><legend>${label}</legend>
    ${key==='price'?'<p class="filter-unit">批发单价 · 元/件</p>':key==='minimum'?'<p class="filter-unit">单款起订量 · 件</p>':''}
    ${groups.map(([region,items])=>`<div class="filter-option-group">${region?`<h3>${region}</h3>`:''}<div class="check-list">${choices(items)}</div></div>`).join('')}</fieldset>`;
}
function readFilters(values) {
  return Object.fromEntries(queryFields.map(([key,,options])=>[key,values.getAll(key).filter(value=>options.includes(value))]));
}
function syncFilterSummary() {
  const form=dialog.querySelector('[data-form="filters"]');
  if (!form) return;
  const filters=readFilters(new FormData(form));
  dialog.querySelectorAll('[data-filter-count]').forEach(count=>{
    const selected=filters[count.dataset.filterCount].length;
    count.hidden=!selected;
    count.textContent=selected||'';
  });
  const matched=goods.filter(item=>matches(item,filters)).length;
  form.querySelector('[data-filter-result]').textContent=`${matched} 款`;
}
function openFilters() {
  const rail=queryFields.map(([key,label])=>`<button type="button" data-action="filter-group" data-id="${key}" aria-pressed="${key==='city'}">${label}<span data-filter-count="${key}" hidden></span></button>`).join('');
  openDialog('筛选货源',`<form data-form="filters" class="filter-form">
    <div class="filter-body"><nav class="filter-rail" aria-label="筛选条件">${rail}</nav><div class="filter-options">${queryFields.map(args=>filterGroupMarkup(...args)).join('')}</div></div>
    <div class="sheet-actions">${button('清除选择','clear-sheet','text-link')}<button type="submit" class="button primary">查看结果 <span data-filter-result></span>${icon('arrow',18)}</button></div></form>`,'filters');
  syncFilterSummary();
}
function chooseExperts() {
  const list=experts.map((item,index)=>`<button type="button" class="expert-choice" data-action="${item.label==='大店专家'?'expert-stores':'choose-expert'}" data-id="${index}">
    <span><strong>${item.label}</strong><small>${item.label==='大店专家'?'从八家门店里选择':item.detail}</small></span>
    ${icon(index!==Number(shopRecords().expert)||item.label==='大店专家'?'chevron':'check',18)}</button>`).join('');
  openDialog('选择经营专家',`<div class="expert-directory">${list}</div>`,'experts');
}
function chooseExpertStore() {
  rememberQuestion();
  save();
  const cards=expertStores.map(({id,name})=>`<button type="button" class="expert-store" data-action="choose-store" data-id="${id}" aria-pressed="${shopRecords().expertStore===id}">
    <strong>${esc(name)}</strong>${icon(shopRecords().expertStore===id?'check':'chevron',17)}</button>`).join('');
  openDialog('大店专家',`<div class="expert-stores"><p>选择一家门店的案例方向。</p><div class="expert-store-grid">${cards}</div>
    ${button('查看全部专家','experts','text-link','chevron')}</div>`,'experts');
  $('#sheet-title').focus({preventScroll:true});
}
function chooseEdition() {
  const groups = ['移动前台','网页后台'].map((group) => `<div class="edition-group"><h3>${group}</h3>${Object.entries(editions).filter(([,entry]) => entry.group === group).map(([key,entry]) => `<a class="edition-choice" href="${href(entry.first,null,key)}" ${route.key === key ? 'aria-current="true"' : ''}><span>${entry.label}</span>${icon(route.key === key ? 'check' : 'chevron',17)}</a>`).join('')}</div>`);
  openDialog('选择演示身份',`<p class="muted">查看各身份的日常工作。操作限于当前浏览器的样例空间。</p>${groups.join('')}`);
}
function globalSearch() {
  openDialog('搜索货源',`<form class="stack" data-form="global-search"><label for="global-query">输入款名、款号或厂家</label><input id="global-query" type="search" name="query" value="${esc(state.query)}" autofocus><div class="sheet-actions"><button type="submit" class="button primary">搜索${icon('arrow',18)}</button></div></form>`);
}
function compose(id) {
  const target = inquiryTarget(id);
  if (!target) return;
  const { product, buyer, ownerAccountId, factoryProduct } = target;
  const roomId = inquiryId(ownerAccountId, factoryProduct.id);
  if (previewInquiries().some(thread => thread.id === roomId)) { go('messages',roomId); return; }
  const title = product ? product.supplier : buyer.name;
  const sample = product ? `你好，想了解 ${id} 的混批条件和补货时间。` : '你好，我们有可小量试拿的样例货盘，想了解你的具体拿货条件。';
  openDialog(`联系${esc(title)}`,`<form data-form="compose" data-id="${id}" class="stack"><p>${product ? `${product.title} · ${product.id}` : '厂家主动咨询 · 示例'}</p><label for="message-text">咨询内容</label><textarea name="text" id="message-text" rows="4" maxlength="500" required>${sample}</textarea><p class="help">只保存为演示记录，请使用样例文字。</p><div class="sheet-actions"><button type="submit" class="button primary">保存示例留言${icon('arrow',18)}</button></div></form>`);
}
function followup(id) {
  const buyer = buyers.find((item) => item.id === id);
  if (!buyer) return;
  openDialog('记入回访',`<form class="stack" data-form="followup" data-id="${id}"><p>${buyer.name} · 示例</p><label for="next-step">下一步</label><textarea name="text" id="next-step" rows="3" maxlength="300" required placeholder="例如 两天后确认试拿偏好"></textarea><div class="sheet-actions"><button class="button primary" type="submit">保存计划</button></div></form>`);
}
function trialQuantity() {
  const field = $('#quantity');
  const quantity=field?.valueAsNumber;
  return Number.isSafeInteger(quantity) && quantity>=1 && quantity<=Number(field.max) ? quantity : null;
}
function updateEstimate() {
  const item = goods.find((one) => one.id === route.id);
  if (!item || !$('#estimate')) return;
  const count=trialQuantity(), below=count!==null&&count<item.minimum;
  $('#estimate').textContent=count===null?'—':below?'待确认':yuan(item.price*count);
  const note=$('#trial-note');
  note.textContent=count===null?'请输入 1 至 999 的整数件数。':below?`低于 ${item.minimum} 件起批量，可先询问是否支持试拿。`:'';
  note.hidden=!note.textContent;
}
async function copyTrial() {
  const item = goods.find((one) => one.id === route.id);
  if (!item) return;
  const quantity = trialQuantity();
  if (quantity===null) { updateEstimate(); $('#quantity').focus(); return; }
  const countLine=quantity<item.minimum?`计划试拿 ${quantity} 件，低于起批量，货款待确认`:
    `计划试拿 ${quantity} 件 × ${yuan(item.price)}，货款估算 ${yuan(quantity * item.price)}`;
  const lines = `黑马汇 · 示例试拿清单\n${item.title}（${item.id}）\n厂家：${item.supplier}\n${item.status}，${item.minimum} 件起，预计 ${item.dispatch} 发货\n${countLine}\n请确认混批、补货与运费。`;
  try {
    await navigator.clipboard.writeText(lines);
    if (route.page==='product'&&route.id===item.id) toast('已复制试拿清单');
  } catch {
    if (route.page!=='product'||route.id!==item.id) return;
    openDialog('试拿清单',`<p>可长按或选中文本后复制。</p><label class="sr-only" for="copy-list">完整试拿清单</label><textarea class="copy-text" id="copy-list" readonly rows="7">${esc(lines)}</textarea>`);
    $('#copy-list').select();
  }
}
function toggle(list,id) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list,id];
}
function readDiagnosis() {
  const form = $('[data-form="diagnosis"]');
  if (form) shopRecords().diagnosis = Object.fromEntries(new FormData(form));
}
function rememberQuestion() {
  const field = $('#expert-question');
  if (field) shopRecords().question = field.value;
}
function deskKnowledge(index) {
  const item = experts[index];
  if (!item) return;
  openDialog(item.label,`<div class="stack"><p>${item.detail}</p><div class="surface stack"><h3>可尝试的示例问题</h3><p>${item.question}</p></div><a class="button primary" href="${href('diagnosis',null,'owner')}">打开店铺诊断${icon('arrow',18)}</a></div>`);
}
const views = {
  info, market, product, supplier:supplierPage, article, fairs:fairList, fair, profile, favorites, messages:messagesPage, 'conversation-peer':conversationPeerPage, diagnosis,
  history:historyPage, report, buyers:buyerList, demand, operations, review, overview:desk, stock:desk, follow:desk, events:desk,
  company:desk, business:desk, knowledge:desk, promotion:desk, audit:desk,
};
function render({stage = false} = {}) {
  renderShell();
  const main = $('#main');
  const isDesk = route.key.endsWith('Desk');
  main.className = `page page-${route.page}${isDesk ? ' desk' : ''}`;
  main.toggleAttribute('data-stage-motion',stage);
  const markup = (views[route.page] || info)();
  main.innerHTML = isDesk
    ? `<aside class="desk-sidebar"><nav class="desktop-nav" aria-label="后台导航">${navItems(true)}</nav></aside><div class="desk-body">${markup}</div>`
    : markup;
  document.title = `${$('.page h1')?.textContent || '女装选货与经营'} · 黑马汇`;
  $('.stepper [data-action="quantity-minus"]')?.setAttribute('aria-label','减少数量');
  $('.stepper [data-action="quantity-plus"]')?.setAttribute('aria-label','增加数量');
  const messageLog = $('.preview-message-log');
  if (messageLog) messageLog.scrollTop = messageLog.scrollHeight;
  updatePromotionRail();
}
const actions = {
  close: () => dialog.close(),
  search: globalSearch,
  editions: chooseEdition,
  'demo-owners': () => openDialog('切换示例门店',`<div class="surface list">${previewData.demoOwners.map(shop =>
    `<button type="button" class="list-item demo-owner-option" data-action="select-demo-owner" data-id="${shop.id}" aria-pressed="${shop.id===currentDemoOwner().id}">
      <span class="list-icon">${icon('user')}</span><span><strong>${esc(shop.shop)}</strong><small>${esc(shop.city)} · ${esc(shop.style)}</small></span>${icon(shop.id===currentDemoOwner().id?'check':'chevron',17)}</button>`).join('')}</div>`),
  'select-demo-owner': (id) => {
    const next=demoOwnerById(id);
    if (!next || route.key!=='owner') return;
    records.currentOwnerId=id;
    save();
    dialog.close();
    render();
    $('[data-action="demo-owners"]')?.focus({preventScroll:true});
  },
  filters: openFilters,
  'clear-sheet': () => {
    dialog.querySelectorAll('input[type="checkbox"]').forEach(field=>{field.checked=false;});
    syncFilterSummary();
  },
  'filter-group': (id) => {
    dialog.querySelectorAll('[data-action="filter-group"]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.id===id)));
    dialog.querySelectorAll('[data-filter-group]').forEach(group=>{group.hidden=group.dataset.filterGroup!==id;});
    dialog.querySelector('.filter-options').scrollTop=0;
  },
  'remove-filter': (id,trigger) => { const { group } = trigger.dataset; state.filters[group] = (state.filters[group] || []).filter((value) => value !== id); state.marketLimit=marketBatch; render(); },
  'clear-filters': () => { state.filters = {}; state.marketLimit=marketBatch; render(); },
  'reset-market': () => { state.filters = {}; state.query = ''; state.marketLimit=marketBatch; render(); },
  'more-market':appendMarket,
  'clear-fairs': () => { state.fairType = ''; state.fairSeason = ''; render(); },
  topic: (id) => { state.topic = id || ''; render(); },
  favorite: (id) => {
    shopRecords().favorites = toggle(shopRecords().favorites,id);
    const selected = shopRecords().favorites.includes(id);
    const persisted=save();
    const previous = $('#quantity')?.value;
    render();
    if (previous !== undefined && $('#quantity')) { $('#quantity').value = previous; updateEstimate(); }
    document.querySelector(`[data-action="favorite"][data-id="${id}"]`)?.focus({preventScroll:true});
    toast(!persisted ? '更改已保留在本次浏览' : selected ? '已收藏此款' : '已取消收藏');
  },
  'read-save': (id) => { shopRecords().reads = toggle(shopRecords().reads,id); save(); render(); toast(shopRecords().reads.includes(id) ? '已收藏资讯' : '已取消收藏'); },
  intent: (id) => {
    const item = fairs.find((one) => one.id === id);
    const scheduled = shopRecords().intents.includes(id);
    if (!item) return;
    openDialog(scheduled ? '取消意向' : '登记意向',`<div class="stack"><p>${item.title} · ${item.city} · ${item.date}</p><p class="help">此操作记录在当前浏览器的示例空间。</p><div class="sheet-actions">${button(scheduled ? '确认取消' : '确认登记','confirm-intent','button primary','calendar',id)}</div></div>`);
  },
  'confirm-intent': (id) => { shopRecords().intents = toggle(shopRecords().intents,id); save(); dialog.close(); render(); toast(shopRecords().intents.includes(id) ? '已记录示例意向' : '已取消示例意向'); },
  'quantity-minus': () => { const field = $('#quantity'); field.stepDown(); updateEstimate(); },
  'quantity-plus': () => { const field = $('#quantity'); field.stepUp(); updateEstimate(); },
  'copy-trial': copyTrial,
  compose,
  followup,
  'contact-card': () => openDialog('联系名片','<div class="stack"><p>该样例主体没有公开微信号或二维码。</p><p>体验沟通请从对应款式或需求发起一对一咨询。</p></div>'),
  'example-diagnosis': () => { shopRecords().diagnosis = {city:'杭州',type:'独立临街店',area:'80',audience:'周边上班族',problem:'新款试穿不少，实际售出偏少。'}; save(); render(); },
  'example-question': () => { $('#expert-question').value = currentExpert().expert.question; rememberQuestion(); save(); $('#expert-question').focus(); },
  'save-question': () => { rememberQuestion(); const persisted = save(); toast(persisted ? '经营问题草稿已保存在此浏览器' : '浏览器无法保存，输入保留在当前页面'); },
  experts: () => {
    rememberQuestion(); save();
    chooseExperts();
    $('#sheet-title').focus({preventScroll:true});
  },
  'expert-stores': chooseExpertStore,
  'choose-expert': (id) => {
    if (!experts[Number(id)] || experts[Number(id)].label==='大店专家') return;
    shopRecords().expert=Number(id);
    save();
    dialog.close();
    render();
    $('.consult-context button')?.focus({preventScroll:true});
  },
  'choose-store': (id) => {
    if (!expertStores.some(store=>store.id===id)) return;
    shopRecords().expert=experts.findIndex(expert=>expert.label==='大店专家');
    shopRecords().expertStore=id;
    save();
    dialog.close();
    render();
    $('.consult-context button')?.focus({preventScroll:true});
  },
  'expert-material': () => {
    rememberQuestion(); save();
    const store=currentExpert().store;
    openDialog(store?`${esc(store.name)} · 案例资料`:'可查阅的经营资料',`${store?'<p class="filter-unit">该店案例资料在公开演示中暂未发布。可先查阅通用经营资料。</p>':''}<div class="list">${stories.map((item) => listLink('article',item.title,item.topic,'book',item.id)).join('')}</div>`);
  },
  'desk-expert': (id) => deskKnowledge(Number(id)),
  'pause-promotion': () => { records.promotionPaused = !records.promotionPaused; save(); render(); toast(records.promotionPaused ? '示例展示已暂停' : '示例展示已恢复'); },
  'toggle-placement': (id) => {
    if (!Object.hasOwn(promotionTypes,id)) return;
    records.promotionChoices = toggle(promotionChoices(),id);
    const persisted=save();
    render();
    document.querySelector(`[data-action="toggle-placement"][data-id="${id}"]`)?.focus({preventScroll:true});
    if (!persisted) toast('展示设置已保留在本次浏览');
  },
  approve: (id) => saveDecision(id,'审核通过'),
  reject: (id) => openDialog('退回修改',`<form class="stack" data-form="reject" data-id="${id}"><label for="reject-note">退回原因</label><textarea id="reject-note" name="reason" rows="3" maxlength="300" required></textarea><div class="sheet-actions"><button class="button primary" type="submit">确认示例退回</button></div></form>`),
  reset: () => openDialog('重置演示记录',`<div class="stack"><p>会清除当前浏览器保存的收藏、留言、诊断、审核与回访样例。</p><div class="sheet-actions">${button('确认重置','confirm-reset','button primary')}</div></div>`),
  'confirm-reset': () => { records = defaults(); save(); dialog.close(); render(); toast('已重置演示记录'); },
};
function saveDecision(id,status) {
  if (!reviews.some((item) => item.id === id) || records.decisions[id]) return;
  records.decisions[id] = status;
  save();
  if (dialog.open) dialog.close();
  render();
  toast(`已记录示例结果：${status}`);
}
const forms = {
  market: (values) => { state.query = values.get('query') || ''; state.marketLimit=marketBatch; render(); },
  'global-search': (values) => {
    state.query = values.get('query') || '';
    state.marketLimit=marketBatch;
    dialog.close();
    if (!editions[route.key].nav.includes('market')) location.hash = href('market',null,'owner');
    else go('market');
  },
  filters: (values) => {
    state.filters = readFilters(values);
    state.marketLimit=marketBatch;
    dialog.close(); render();
    $('[data-action="filters"]')?.focus({preventScroll:true});
  },
  fairs: (values) => { state.fairType = values.get('type'); state.fairSeason = values.get('season'); render(); },
  diagnosis: (values) => {
    const data = Object.fromEntries(values);
    if (!data.city.trim() || !data.audience.trim() || !data.problem.trim()) { toast('请填写有效的门店信息'); return; }
    shopRecords().diagnosis = data;
    const id = `D${Date.now().toString(36).toUpperCase()}`;
    shopRecords().reports.push({...data,id});
    save();
    go('report',id);
  },
  compose: (values,form) => {
    if (!form.isConnected || form.dataset.sending) return;
    const text = values.get('text').trim();
    if (!text) { toast('请输入咨询内容'); return; }
    const thread = form.dataset.thread ? previewInquiries().find(item => item.id === form.dataset.thread) : null;
    const target = form.dataset.thread ? thread : inquiryTarget(form.dataset.id);
    if (!target) return;
    const { ownerAccountId, factoryProduct } = target;
    const roomId = inquiryId(ownerAccountId,factoryProduct.id);
    form.dataset.sending = 'true';
    if (!thread && previewInquiries().some(item => item.id === roomId)) {
      if (dialog.open) dialog.close();
      go('messages',roomId);
      return;
    }
    const sender = demoBuyerSide() ? 'owner' : 'supplier';
    const id = form.dataset.id || (sender === 'owner' ? factoryProduct.id : thread.buyer?.id || factoryProduct.id);
    const title = sender === 'owner' ? factoryProduct.supplier : target.buyer?.name || target.account?.shop;
    const direction = thread ? (sender === 'owner' ? '店主回复' : '厂家回复') : sender === 'owner' ? '店主询货' : '厂家主动咨询';
    records.messages.push({ id,title,text,direction,sender,ownerAccountId,factoryProductId:factoryProduct.id });
    const saved = save();
    if (dialog.open) dialog.close();
    go('messages',roomId);
    if (thread) requestAnimationFrame(() => $('#preview-reply')?.focus({preventScroll:true}));
    toast(saved ? '已保存示例留言' : '消息已保留在本次浏览');
  },
  followup: (values,form) => {
    const buyer = buyers.find((item) => item.id === form.dataset.id);
    const text = values.get('text').trim();
    if (!buyer || !text) { toast('请输入下一步'); return; }
    records.followups.push({id:buyer.id,name:buyer.name,text});
    save(); dialog.close(); toast('已保存示例回访计划');
  },
  reject: (values,form) => {
    const reason = values.get('reason').trim();
    if (!reason) { toast('请输入退回原因'); return; }
    saveDecision(form.dataset.id,`退回修改 · ${reason}`);
  },
};
document.addEventListener('click',(event) => {
  const target = event.target.closest('[data-action]');
  if (target) actions[target.dataset.action]?.(target.dataset.id,target);
  const anchor = event.target.closest('a[href^="#/"]');
  if (anchor && dialog.open) dialog.close();
  if (event.target.closest('.skip')) { event.preventDefault(); $('#main').focus(); }
});
document.addEventListener('submit',(event) => {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  forms[form.dataset.form]?.(new FormData(form),form);
});
document.addEventListener('input',(event) => {
  if (event.target.id === 'quantity') updateEstimate();
  if (event.target.id === 'expert-question') { rememberQuestion(); save(); }
  if (event.target.closest('[data-form="diagnosis"]')) { readDiagnosis(); save(); }
  if (event.target.closest('[data-form="filters"]')) syncFilterSummary();
});
history.scrollRestoration = 'manual';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const galleries = new Set(['info','market','favorites','supplier']);
let pageMotion;
let photoMotion;
let navigationRevision = 0;
function findProductImage(productId) {
  const boxes = $('#main').querySelectorAll('[data-product-photo]');
  for (const box of boxes) {
    if (box.dataset.productPhoto === productId) return box.querySelector('img');
  }
  return null;
}
function showRoute(next,sharedPhoto = false) {
  const previous = route;
  route = next;
  renderedHash = href(route.page,route.id);
  render({stage:route.page === 'info' && previous.page !== 'info'});
  const main = $('#main');
  const returned = route.page==='market' && previous.key===route.key && previous.page==='product' &&
    findProductImage(previous.id)?.closest('a');
  (returned||main).focus({preventScroll:true});
  window.scrollTo(0,scrolls.get(renderedHash) || 0);
  pageMotion?.cancel();
  if (!sharedPhoto && typeof main.animate === 'function' && !reduceMotion.matches && (previous.page !== route.page || previous.key !== route.key)) {
    pageMotion = main.animate(
      [{opacity:.84,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],
      {duration:180,easing:'cubic-bezier(.22,.76,.28,1)'},
    );
  }
}
reduceMotion.addEventListener?.('change', () => {
  if (reduceMotion.matches) {
    pageMotion?.cancel();
    photoMotion?.skipTransition();
  }
});
window.addEventListener('hashchange',() => {
  const version = ++navigationRevision;
  photoMotion?.skipTransition();
  document.querySelector('[data-photo-transition]')?.removeAttribute('data-photo-transition');
  scrolls.set(renderedHash,window.scrollY);
  const next = getRoute();
  const returning = route.page === 'product' && galleries.has(next.page);
  const opening = next.page === 'product' && galleries.has(route.page);
  const productId = returning ? route.id : opening ? next.id : null;
  const previousImage = next.key === route.key && productId ? findProductImage(productId) : null;
  if (!previousImage?.complete || !previousImage.naturalWidth || reduceMotion.matches || typeof document.startViewTransition !== 'function') {
    showRoute(next);
    return;
  }
  previousImage.setAttribute('data-photo-transition','');
  const transition = document.startViewTransition(() => {
    if (version !== navigationRevision) return;
    showRoute(next,true);
    findProductImage(productId)?.setAttribute('data-photo-transition','');
  });
  photoMotion = transition;
  transition.ready.catch(() => {});
  const cleanup = () => {
    if (photoMotion !== transition) return;
    photoMotion = null;
    document.querySelector('[data-photo-transition]')?.removeAttribute('data-photo-transition');
  };
  transition.finished.then(cleanup,cleanup);
});
window.addEventListener('storage',event => {
  if (event.key !== storageKey) return;
  const before = activePromotions().map(item=>item.id).join();
  records = readData();
  if (route.page === 'market' && before !== activePromotions().map(item=>item.id).join()) updatePromotionRail();
});
renderedHash = href(route.page,route.id);
render({stage:route.page === 'info'});
