const version = 'store-metrics.v1';
const dayMs = 86400000;
const fields = {
  netSales: { id: 'netSales', label: '退货后净销售额', unit: '元', allowNegative: true, help: '统计期间实销金额扣除退款和折让。税费处理与销售成本一致，可填退货冲销形成的负数。' },
  costOfGoodsSold: { id: 'costOfGoodsSold', label: '已售商品成本', unit: '元', help: '同期已售商品按成本计价，扣除已退商品冲回的成本。按成本净额填报。' },
  variableExpenses: { id: 'variableExpenses', label: '销售相关变动费用', unit: '元', help: '选择随成交变化的提成、平台扣点、履约及退换等同期净支出。已计入商品成本的项目勿重复填写。' },
  fixedCosts: { id: 'fixedCosts', label: '固定经营成本', unit: '元', help: '按统计期间分摊租金、底薪等固定费用。预付、押金和还债造成的现金支出单独核对。' },
  openingInventoryCost: { id: 'openingInventoryCost', label: '期初库存成本', unit: '元', help: '开始日前的账面库存成本，范围和计价方法与期末及已售商品成本一致。' },
  closingInventoryCost: { id: 'closingInventoryCost', label: '期末库存成本', unit: '元', help: '结束日结账时的库存成本，使用同期成本账，避免使用吊牌价或零售价。' },
  normalDailyDemand: { id: 'normalDailyDemand', label: '正常日需求', unit: '件/天', help: '同一款色码且无缺货干扰时的日均需求，按期间观察或明确的基准情景填报。' },
  normalLeadTimeDays: { id: 'normalLeadTimeDays', label: '正常到货时间', unit: '天', help: '从发出补货到可售库存入账的平常日历天数。' },
  highDailyDemand: { id: 'highDailyDemand', label: '高需求情景的日需求', unit: '件/天', help: '根据本款的波峰记录或明确情景填报，应大于等于正常日需求。' },
  longLeadTimeDays: { id: 'longLeadTimeDays', label: '长交期情景的到货时间', unit: '天', help: '根据本供应链较慢的到货记录或明确情景填报，应大于等于正常到货时间。' }
};

function rounded(numerator, denominator) {
  const magnitude = numerator < 0n ? -numerator : numerator;
  const value = magnitude / denominator + (magnitude % denominator * 2n >= denominator ? 1n : 0n);
  return numerator < 0n ? -value : value;
}

function decimal(hundredths) {
  const magnitude = hundredths < 0n ? -hundredths : hundredths;
  return `${hundredths < 0n ? '-' : ''}${magnitude / 100n}.${String(magnitude % 100n).padStart(2, '0')}`;
}

const roundUp = (numerator, denominator) => (numerator + denominator - 1n) / denominator;
const unavailable = reason => ({ value: null, reason });
const grossProfit = values => values.netSales - values.costOfGoodsSold;
const contributionProfit = values => grossProfit(values) - values.variableExpenses;
const salesRate = (profit, netSales) => netSales > 0n
  ? decimal(rounded(profit * 10000n, netSales))
  : unavailable('退货后净销售额须大于零，当前期间无法给出利润率。');
const inventorySum = values => values.openingInventoryCost + values.closingInventoryCost;

const grossFields = ['netSales', 'costOfGoodsSold'];
const contributionFields = [...grossFields, 'variableExpenses'];
const inventoryFields = ['openingInventoryCost', 'closingInventoryCost'];
const normalDemand = ['normalDailyDemand', 'normalLeadTimeDays'];
const stressDemand = ['highDailyDemand', 'longLeadTimeDays'];
const samePeriod = '金额使用同一门店、渠道、起止日期和税费口径，起止日期均计入期间。';
const contributionRate = {
  id: 'contributionMarginRate', label: '贡献毛利率', unit: '%', requires: contributionFields,
  calculate: values => salesRate(contributionProfit(values), values.netSales)
};

const templates = [
  {
    id: 'gross-margin', title: '毛利', summary: '看本期净销售扣除已售商品成本后留下多少。',
    formula: '毛利额 = 退货后净销售额 − 已售商品成本。毛利率 = 毛利额 ÷ 退货后净销售额 × 100%。',
    fields: grossFields,
    outputs: [
      { id: 'grossProfit', label: '毛利额', unit: '元', requires: grossFields, calculate: values => decimal(grossProfit(values)) },
      { id: 'grossMarginRate', label: '毛利率', unit: '%', requires: grossFields, calculate: values => salesRate(grossProfit(values), values.netSales) }
    ],
    conditions: [samePeriod, '毛利额仅扣除已售商品成本，后续仍需覆盖提成、租金等经营费用。']
  },
  {
    id: 'contribution-margin', title: '贡献毛利', summary: '看本期卖出的货在扣除商品成本与变动费用后，能承担多少固定费用。',
    formula: '贡献毛利额 = 退货后净销售额 − 已售商品成本 − 销售相关变动费用。贡献毛利率 = 贡献毛利额 ÷ 退货后净销售额 × 100%。',
    fields: contributionFields,
    outputs: [
      { id: 'contributionProfit', label: '贡献毛利额', unit: '元', requires: contributionFields, calculate: values => decimal(contributionProfit(values)) },
      contributionRate
    ],
    conditions: [samePeriod, '销售相关变动费用按渠道核对，固定经营费用单独核算。']
  },
  {
    id: 'break-even', title: '保本销售额', summary: '按本期贡献毛利率，测算覆盖本期固定经营成本需要的净销售额。',
    formula: '贡献毛利额 = 退货后净销售额 − 已售商品成本 − 销售相关变动费用。保本净销售额 = 固定经营成本 ÷（贡献毛利额 ÷ 退货后净销售额），向上取到分。',
    fields: [...contributionFields, 'fixedCosts'],
    outputs: [
      contributionRate,
      { id: 'breakEvenSales', label: '保本净销售额', unit: '元', requires: [...contributionFields, 'fixedCosts'], calculate(values) {
        const contribution = contributionProfit(values);
        return values.netSales > 0n && contribution > 0n
          ? decimal(roundUp(values.fixedCosts * values.netSales, contribution))
          : unavailable('正净销售额和正贡献毛利率是测算保本销售额的前提。');
      } }
    ],
    conditions: [samePeriod, '适用于产品及渠道结构、变动费率和固定成本相近的销售情景。', '保本销售额使用未舍入的贡献毛利率。现金收付、库存备货和账期另行测算。']
  },
  {
    id: 'inventory-turnover', title: '库存周转', summary: '用同期成本账估算库存占用和周转。',
    formula: '平均库存成本 =（期初库存成本 ＋ 期末库存成本）÷ 2。周转次数 = 已售商品成本 ÷ 平均库存成本。周转天数 = 平均库存成本 ÷ 已售商品成本 × 期间天数。',
    fields: ['costOfGoodsSold', ...inventoryFields],
    outputs: [
      { id: 'averageInventoryCost', label: '平均库存成本', unit: '元', requires: inventoryFields,
        calculate: values => decimal(rounded(inventorySum(values), 2n)) },
      { id: 'inventoryTurns', label: '库存周转次数', unit: '次', requires: ['costOfGoodsSold', ...inventoryFields], calculate(values) {
        const inventory = inventorySum(values);
        return inventory > 0n ? decimal(rounded(values.costOfGoodsSold * 200n, inventory))
          : unavailable('平均库存成本须大于零，无法计算周转次数。');
      } },
      { id: 'inventoryDays', label: '库存周转天数', unit: '天', requires: ['costOfGoodsSold', ...inventoryFields], calculate(values, days) {
        return values.costOfGoodsSold > 0n ? decimal(rounded(inventorySum(values) * BigInt(days) * 100n, values.costOfGoodsSold * 2n))
          : unavailable('已售商品成本须大于零，无法计算周转天数。');
      } }
    ],
    conditions: [samePeriod, '期初与期末两点平均属于估算。季节性补货和期间库存波动大时，需用更多时点复核。']
  },
  {
    id: 'safety-stock', title: '安全库存', summary: '估算本款在高需求与长交期一起出现时，比正常补货多需要多少件。',
    formula: '安全库存 = 高日需求 × 长交期 − 正常日需求 × 正常交期，向上取整件。',
    fields: [...normalDemand, ...stressDemand],
    outputs: [
      { id: 'normalLeadDemand', label: '正常交期需求', unit: '件', requires: normalDemand,
        calculate: values => decimal(rounded(values.normalDailyDemand * values.normalLeadTimeDays, 100n)) },
      { id: 'stressLeadDemand', label: '高需求长交期需求', unit: '件', requires: stressDemand,
        calculate: values => decimal(rounded(values.highDailyDemand * values.longLeadTimeDays, 100n)) },
      { id: 'safetyStock', label: '安全库存', unit: '件', requires: [...normalDemand, ...stressDemand],
        calculate: values => String(roundUp(values.highDailyDemand * values.longLeadTimeDays - values.normalDailyDemand * values.normalLeadTimeDays, 10000n)) }
    ],
    conditions: ['使用同一款色码和补货范围，日期用于记录所依据的观察期间。', '高需求和长交期为填报情景。结果应结合剩余销售窗口、在途与补货能力复核。']
  }
];

function freezeTree(value) {
  Object.values(value).filter(item => item !== null && typeof item === 'object').forEach(freezeTree);
  return Object.freeze(value);
}

export const measurementCatalog = freezeTree({ version, templates: templates.map(template => ({
  ...template, fields: template.fields.map(id => fields[id]),
  outputs: template.outputs.map(({ id, label, unit }) => ({ id, label, unit }))
})) });

function measurementError(status, code, message, field) {
  return Object.assign(new Error(message), { status, code, ...(field ? { field } : {}) });
}

function keysAllowed(value, allowed) {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null) && Object.keys(value).every(key => allowed.includes(key));
}

function periodDay(value, field) {
  const time = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith('0000-')
    ? Date.parse(value + 'T00:00:00+08:00') : NaN;
  if (!Number.isFinite(time) || new Date(time + 8 * 3600000).toISOString().slice(0, 10) !== value)
    throw measurementError(400, 'MEASUREMENT_PERIOD_INVALID', '请输入有效的北京时间日历日期。', field);
  return time;
}

function parseDecimal(value, id) {
  const pattern = fields[id].allowNegative ? /^-?\d{1,12}(?:\.\d{1,2})?$/ : /^\d{1,12}(?:\.\d{1,2})?$/;
  if (typeof value !== 'string' || !pattern.test(value))
    throw measurementError(400, 'MEASUREMENT_VALUE_INVALID', '请输入有效的十进制数字，最多 12 位整数与 2 位小数。', id);
  const [whole, decimalPart = ''] = value.replace(/^-/, '').split('.');
  const hundredths = BigInt(whole) * 100n + BigInt(decimalPart.padEnd(2, '0'));
  return value.startsWith('-') ? -hundredths : hundredths;
}

export function calculateStoreMeasurement(input) {
  if (!keysAllowed(input, ['templateId', 'version', 'period', 'values']))
    throw measurementError(400, 'MEASUREMENT_REQUEST_INVALID', '测算请求仅接收模板版本、统计期间和字段值。');
  const template = templates.find(item => item.id === input.templateId);
  if (!template) throw measurementError(400, 'MEASUREMENT_TEMPLATE_INVALID', '请选择已登记的测算模板。', 'templateId');
  if (input.version !== version)
    throw measurementError(409, 'MEASUREMENT_VERSION_CONFLICT', '请刷新模板并使用当前公式版本。', 'version');
  if (!keysAllowed(input.period, ['startDate', 'endDate']))
    throw measurementError(400, 'MEASUREMENT_PERIOD_INVALID', '请提交北京时间的起止日期。', 'period');
  const { startDate, endDate } = input.period;
  const days = (periodDay(endDate, 'endDate') - periodDay(startDate, 'startDate')) / dayMs + 1;
  if (days < 1 || days > 366)
    throw measurementError(400, 'MEASUREMENT_PERIOD_INVALID', '起止日期应构成 1 至 366 天的统计期间。', 'endDate');
  if (!keysAllowed(input.values, template.fields))
    throw measurementError(400, 'MEASUREMENT_VALUES_INVALID', '请只提交该模板登记的字段值。', 'values');

  const values = Object.fromEntries(template.fields.map(id => {
    const raw = Object.hasOwn(input.values, id) ? input.values[id] : null;
    return [id, raw === '' || raw == null ? null : parseDecimal(raw, id)];
  }));
  for (const [higher, lower] of [[stressDemand[0], normalDemand[0]], [stressDemand[1], normalDemand[1]]]) {
    if (typeof values[higher] === 'bigint' && typeof values[lower] === 'bigint' && values[higher] < values[lower])
      throw measurementError(400, 'MEASUREMENT_SCENARIO_INVALID', '高需求或长交期情景须大于等于相应的正常情景。', higher);
  }
  const missing = template.fields.filter(id => values[id] === null);
  const results = template.outputs.map(({ id, label, unit, requires, calculate }) => {
    const absent = requires.filter(field => values[field] === null);
    const result = absent.length ? unavailable('缺少' + absent.map(field => fields[field].label).join('、') + '。') : calculate(values, days);
    return { id, label, unit, ...(typeof result === 'string' ? { value: result } : result) };
  });
  return { templateId: template.id, version, period: { startDate, endDate, days },
    state: missing.length ? 'missing' : results.some(result => result.value === null) ? 'limited' : 'calculated',
    results, missing, formula: template.formula, conditions: template.conditions };
}
