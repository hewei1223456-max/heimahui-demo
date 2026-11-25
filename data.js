'use strict';

const previewData = (() => {
  const editions = {
    owner: { label: '店主版', group: '移动前台', first: 'info', nav: ['info', 'market', 'diagnosis', 'profile'] },
    supplier: { label: '厂家版', group: '移动前台', first: 'buyers', nav: ['info', 'market', 'buyers', 'profile'] },
    operator: { label: '平台管理版', group: '移动前台', first: 'operations', nav: ['info', 'market', 'diagnosis', 'buyers', 'operations'] },
    supplierDesk: { label: '厂家经营后台', group: '网页后台', first: 'overview', nav: ['overview', 'stock', 'follow', 'events', 'company'] },
    platformDesk: { label: '平台管理后台', group: '网页后台', first: 'overview', nav: ['overview', 'business', 'knowledge', 'promotion', 'audit'] },
  };

  const nav = {
    info: ['资讯', 'home'], market: ['找货源', 'bag'], diagnosis: ['店铺诊断', 'compass'], profile: ['我的', 'user'],
    buyers: ['找客户', 'users'], operations: ['平台管理', 'grid'], overview: ['经营总览', 'chart'],
    stock: ['货源与内容', 'bag'], follow: ['客户与回访', 'users'], events: ['订货会与推广', 'calendar'], company: ['企业与服务', 'user'],
    business: ['业务运营', 'grid'], knowledge: ['专家与知识', 'book'], promotion: ['渠道与推广', 'calendar'], audit: ['数据与审计', 'chart'],
  };

  const goods = [
    { id: 'HM2601', title: '苔灰宽松翻领夹克', supplier: '杭州北巷样品间', city: '杭州', style: '通勤极简', category: '外套', price: 168, minimum: 3, status: '现货', image: 'lookbook-jacket', dispatch: '2–3 天', fits: '直肩宽松，便于搭针织打底和直筒裤。适合换季主推位。' },
    { id: 'HM2602', title: '雾绿垂感直筒裤', supplier: '杭州北巷样品间', city: '杭州', style: '通勤极简', category: '裤装', price: 118, minimum: 2, status: '现货', image: 'lookbook-trousers', dispatch: '1–2 天', fits: '中高腰，裤管留量适中。建议与夹克做成通勤套搭。' },
    { id: 'HM2603', title: '砂白宽领肌理衬衫', supplier: '广州序里样品间', city: '广州', style: '自然休闲', category: '衬衫', price: 96, minimum: 2, status: '现货', image: 'lookbook-shirt', dispatch: '1–2 天', fits: '织纹细腻，单穿或当作薄外搭均可。陈列时建议保留领口留白。' },
    { id: 'HM2604', title: '焦糖轻针织开衫', supplier: '濮院原织样品间', city: '濮院', style: '法式简约', category: '针织', price: 138, minimum: 3, status: '预售', image: 'lookbook-cardigan', dispatch: '5–7 天', fits: '暖调显色，轻薄易叠穿。批次色差和补货节奏可随询货确认。' },
    { id: 'HM2605', title: '橄榄灰压褶半裙', supplier: '广州序里样品间', city: '广州', style: '法式简约', category: '裙装', price: 128, minimum: 2, status: '现货', image: 'lookbook-skirt', dispatch: '2–3 天', fits: '中长裙摆，适合与短针织和平底鞋搭配陈列。' },
    { id: 'HM2606', title: '岩灰短夹克两件套', supplier: '杭州北巷样品间', city: '杭州', style: '通勤极简', category: '套装', price: 258, minimum: 5, status: '预售', image: 'lookbook-set', dispatch: '7–10 天', fits: '上衣裤装同色，适合完整套陈。补货时先确认上下装尺码组合。' },
    { id: 'HM2607', title: '浅驼束腰中长风衣', supplier: '平湖度里样品间', city: '平湖', style: '自然休闲', category: '外套', price: 298, minimum: 5, status: '现货', image: 'lookbook-coat', dispatch: '2–3 天', fits: '单排扣配束带，季节跨度长。试拿时可验证长度与目标身高的适配。' },
    { id: 'HM2608', title: '烟棕收腰连衣裙', supplier: '广州序里样品间', city: '广州', style: '法式简约', category: '裙装', price: 228, minimum: 3, status: '现货', image: 'lookbook-dress', dispatch: '2–3 天', fits: '低饱和调，适合以配饰拆分日常与聚会搭配。' },
  ];

  const fairs = [
    { id: 'F01', title: '冬季货盘开放日', organizer: '北巷样品间', type: '内部订货会', season: '冬季订货会', city: '杭州', date: '12 月 06–07 日', year: '2026', image: 'shop', description: '以通勤外套与轻针织为主，现场集中看样和讨论补货节奏。适合冬季中段需要少量补款的门店。' },
    { id: 'F02', title: '濮院早春针织看样会', organizer: '原织样品间', type: '市场展会', season: '春季订货会', city: '嘉兴', date: '12 月 12–13 日', year: '2026', image: 'texture', description: '围绕早春打底、开衫和叠穿组合。样例场次支持意向登记。' },
    { id: 'F03', title: '南方女装春夏面料选品周', organizer: '序里样品间', type: '行业展会', season: '春夏订货会', city: '广州', date: '12 月 18–20 日', year: '2026', image: 'rack', description: '聚焦春夏轻薄面料与小单多款货盘。店主可以先整理拟看品类。' },
  ];

  const stories = [
    { id: 'A01', topic: '组货笔记', title: '一件外套，怎样搭出三组能卖的货？', intro: '先定客群与价格带，再用三种穿着场景验证搭配。', image: 'lookbook-journal', paragraphs: ['先选一件足够代表门店风格的外套作为主款。围绕通勤、周末和温差三个场景分别选内搭与下装。尽量复用鞋包与配色，减少为搭配额外备货。', '把三套搭配放到同一个陈列点，记录顾客先摸哪件、成套试穿率和单件成交分布。用一周数据决定补货时是加深主款，还是补齐更常被搭走的配款。'] },
    { id: 'A02', topic: '经营方法', title: '小单试拿，先把这三个条件问清', intro: '把起批、混批和补货拆开问，才能判断试错成本。', image: 'rack', paragraphs: ['第一是达到起批的计算单位。件、手和包对单款现金占用的影响不同。第二是混批是否按款、按色、按尺码计算。第三是补单从确认到实际发货所需的时间。', '条件问清之后再排尺码，不确定的物流费用保留待确认。每次试拿记录款号、计划数量、店内搭配和一周后复评时间。'] },
    { id: 'A03', topic: '产业带观察', title: '换季针织补货，稳住两类核心款', intro: '把当季好卖款与过渡期叠穿款分开跟进。', image: 'knit', paragraphs: ['换季时优先看一周在售款的试穿和实际出货。已经找到稳定客群的畅销色适合验证小批补货，单次补单深度取决于交期与销售窗口。', '选择过渡期针织时优先评估叠穿与色系兼容性。调整货架后观察连带和尺码需求，保持小步试错。'] },
  ];

  const buyers = [
    { id: 'B01', name: '桥西独立女装店', city: '杭州', mode: '街区独立店', style: '通勤极简', budget: '¥100–200 / 件', needs: '找羊毛混纺外套和通勤直筒裤，优先 2–3 件起拿，支持补单。' },
    { id: 'B02', name: '微雨买手集合店', city: '苏州', mode: '买手店', style: '法式简约', budget: '¥110–230 / 件', needs: '准备小量试拿针织和半裙，关注腰线、手感与配色。' },
    { id: 'B03', name: '缓行社区女装店', city: '宁波', mode: '社区店', style: '自然休闲', budget: '¥80–160 / 件', needs: '需要到货快、容易搭配的衬衫和打底层，现货优先。' },
  ];

  const reviews = [
    { id: 'RV-041', name: '早春针织专题推荐', type: '资讯内容', by: '原织样品间', notes: '示例提案介绍早春针织的面料和叠穿组合。初审需核对内容来源与展示范围。' },
    { id: 'RV-042', name: '冬季货盘开放日补充场', type: '订货会', by: '北巷样品间', notes: '示例补充场。核对举办时间及意向登记字段后再提交。' },
  ];

  const experts = [
    { label: '组货专家', detail: '价格带、货盘结构与上新节奏', question: '如何在不加大库存的情况下搭一组换季货？' },
    { label: '大店专家', detail: '大店案例与可试动作', question: '如何把成熟的大店陈列方法缩小到一面墙试验？' },
    { label: '数据测算专家', detail: '库存、毛利和经营测算', question: '如何设定试拿的复盘指标和库存止损条件？' },
    { label: '服务专家', detail: '试穿服务和客户回访', question: '如何设计试穿后的有用反馈和回访记录？' },
    { label: '装修建议专家', detail: '店铺动线与陈列改造', question: '如何判断进门第一组陈列是否有效？' },
  ];

  return { editions, nav, goods, fairs, stories, buyers, reviews, experts };
})();
