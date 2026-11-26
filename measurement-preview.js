import {calculateStoreMeasurement,measurementCatalog} from './measurement-engine.js';

const escapeHtml=(value='')=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
const titles={calculated:'测算完成',limited:'部分结果可算',missing:'需要补充资料'};
const pad=(label,value,body)=>`<label><span id="preview-measure-label-${value}">${escapeHtml(label)}</span>${body}</label>`;
const showNumber=value=>value==null?'—':value.replace(/^-?\d+/,whole=>whole.replace(/\B(?=(\d{3})+(?!\d))/g,','));

function editTemplate(template){
  return `<h2>${escapeHtml(template.title)}</h2><p class="help">${escapeHtml(template.summary)}</p>
    <form class="preview-measure-form" autocomplete="off" data-preview-measure-form>
      <fieldset><legend>统计期间</legend><div class="field-grid">
        ${pad('开始日期','startDate','<input type="date" name="startDate" aria-labelledby="preview-measure-label-startDate" required>')}
        ${pad('结束日期','endDate','<input type="date" name="endDate" aria-labelledby="preview-measure-label-endDate" required>')}
      </div><p class="help">北京时间，开始和结束日期均计入。</p></fieldset>
      <fieldset><legend>经营数据</legend><div class="field-grid">
        ${template.fields.map(({id,label,unit,help})=>pad(label,id,`
          <span class="preview-measure-input"><input type="text" name="${id}" inputmode="decimal" maxlength="16" autocomplete="off"
            aria-labelledby="preview-measure-label-${id}" aria-describedby="preview-measure-unit-${id} preview-measure-help-${id}">
          <span id="preview-measure-unit-${id}">${escapeHtml(unit)}</span></span><small id="preview-measure-help-${id}">${escapeHtml(help)}</small>`)).join('')}
      </div><p class="help">请填样例数字。缺项可留空，已知为零请输入 0。</p></fieldset>
      <p class="preview-measure-error" data-preview-measure-error role="alert" hidden></p>
      <button class="button primary" type="submit">开始测算</button>
    </form>`;
}

function methods(template){
  return `<p class="preview-measure-formula">${escapeHtml(template.formula)}</p>
    <ul class="preview-measure-conditions">${template.conditions.map(text=>`<li>${escapeHtml(text)}</li>`).join('')}</ul>`;
}

function resultMarkup(output,template){
  return `<div class="preview-measure-result-head"><div><h2>测算结果</h2><p class="help">${escapeHtml(output.period.startDate)} 至 ${escapeHtml(output.period.endDate)} · ${output.period.days} 天</p></div>
    <span class="pill">${titles[output.state]}</span></div>
    <dl class="preview-measure-values">${output.results.map(row=>`<div><dt>${escapeHtml(row.label)}</dt>
      <dd>${escapeHtml(showNumber(row.value))}${row.value==null?'':`<small>${escapeHtml(row.unit)}</small>`}</dd>
      ${row.reason?`<p>${escapeHtml(row.reason)}</p>`:''}</div>`).join('')}</dl>
    ${output.missing.length?`<p class="help">待补充 · ${escapeHtml(output.missing.map(id=>template.fields.find(field=>field.id===id)?.label || id).join('、'))}</p>`:''}
    <details><summary>核对公式与适用条件</summary>${methods(output)}</details>`;
}

export function mountMeasurementPreview(host){
  const {version,templates}=measurementCatalog;
  let template=templates[0];
  let period={};
  host.innerHTML=`<div class="surface preview-measure-select"><label for="preview-measure-template">测算模板</label>
    <select id="preview-measure-template">${templates.map(item=>`<option value="${item.id}">${escapeHtml(item.title)}</option>`).join('')}</select>
    <span class="help">示例公式 · ${escapeHtml(version)}</span></div>
    <div class="preview-measure-layout"><section class="surface preview-measure-card" data-preview-measure-editor></section>
      <div><section class="surface preview-measure-card" data-preview-measure-method></section>
      <section class="surface preview-measure-card" data-preview-measure-result tabindex="-1" hidden></section></div></div>`;
  const select=host.querySelector('#preview-measure-template');
  const editor=host.querySelector('[data-preview-measure-editor]');
  const method=host.querySelector('[data-preview-measure-method]');
  const result=host.querySelector('[data-preview-measure-result]');
  const clear=()=>{result.hidden=true;result.replaceChildren();method.hidden=false;};

  function show(){
    clear();
    editor.innerHTML=editTemplate(template);
    method.innerHTML='<h2>计算口径与适用条件</h2>'+methods(template);
    const form=editor.querySelector('form');
    for (const key of ['startDate','endDate']) form.elements[key].value=period[key] || '';
    const alert=form.querySelector('[data-preview-measure-error]');
    form.oninput=()=>{alert.hidden=true;clear();};
    form.onsubmit=event=>{
      event.preventDefault();
      const data=new FormData(form);
      period={startDate:data.get('startDate'),endDate:data.get('endDate')};
      const values={};
      for (const {id} of template.fields) {
        const value=String(data.get(id) || '').trim();
        if(value) values[id]=value;
      }
      try {
        const output=calculateStoreMeasurement({templateId:template.id,version,period,values});
        result.innerHTML=resultMarkup(output,template);method.hidden=true;result.hidden=false;alert.hidden=true;result.focus();
      } catch(error) {
        clear();alert.textContent=error.message;alert.hidden=false;
        if (error.field) form.elements.namedItem(error.field)?.focus();
      }
    };
  }
  select.onchange=()=>{
    const next=templates.find(item=>item.id===select.value);
    if (!next || next===template) return;
    const form=editor.querySelector('form');
    period={startDate:form.elements.startDate.value,endDate:form.elements.endDate.value};
    template=next;show();
  };
  show();
}
