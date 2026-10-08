// Static UI translations only. Content language comes from the published Workspace.
const labels={ja:{home:'記事一覧'},en:{home:'Articles'}};
function select(language){const lang=language==='en'?'en':'ja';document.documentElement.lang=lang;for(const e of document.querySelectorAll('[data-space-label]'))e.textContent=labels[lang][e.dataset.spaceLabel];for(const e of document.querySelectorAll('[data-space-language]'))e.setAttribute('aria-pressed',String(e.dataset.spaceLanguage===lang));try{localStorage.setItem('space-example-language',lang);}catch{}}
let initial='ja';try{initial=localStorage.getItem('space-example-language')??'ja';}catch{}
select(initial);
for(const button of document.querySelectorAll('[data-space-language]'))button.addEventListener('click',()=>select(button.dataset.spaceLanguage));
