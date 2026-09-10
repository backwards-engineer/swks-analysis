import fs from 'node:fs/promises';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const dir='outputs/swks_20261020'; await fs.mkdir(dir,{recursive:true});
const data=JSON.parse(await fs.readFile('model_data.json','utf8'));
const wb=Workbook.create();
const names=['Overview','Assumptions','Forecast','Annual','Quarterly','Audit','Source data','ReadMe'];
const sheets=Object.fromEntries(names.map(n=>[n,wb.worksheets.add(n)]));
const navy='#193B61',blue='#0000FF',green='#008000',fmt='#,##0.0;(#,##0.0);"-"',pct='0.0%;(0.0%);"-"';
function col(n){let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s}
function val(s,a,v){s.getRange(a).values=[[v]]}
function form(s,a,v){s.getRange(a).formulas=[[v]];s.getRange(a).format.font.color=v.includes('!')?green:'#111111'}
function base(s,endCol,endRow,title){s.showGridLines=false;s.getRange(`A1:${endCol}${endRow}`).format.font={name:'Arial',size:10,color:'#182C40'};s.getRange(`A1:B${endRow}`).format.columnWidth=2.5;s.getRange(`C1:C${endRow}`).format.columnWidth=34;s.getRange(`D1:${endCol}${endRow}`).format.columnWidth=14;s.getRange(`C1:${endCol}${endRow}`).format.rowHeight=20;s.getRange(`D5:${endCol}${endRow}`).setNumberFormat(fmt);val(s,'C2',title);s.getRange('C2').format.font={size:15,bold:true,color:navy};s.getRange(`C3:${endCol}3`).format.borders={bottom:{style:'thin',color:navy}};s.freezePanes.freezeRows(5);s.freezePanes.freezeColumns(3)}
function band(s,r,end){s.getRange(`C${r}:${end}${r}`).format={fill:navy,font:{color:'#FFFFFF',bold:true},rowHeight:23}}
function ratio(s,address,a,b){form(s,address,`=IF(AND(ISNUMBER(${a}),ISNUMBER(${b}),(${b})<>0),(${a})/(${b}),"n.a.")`);s.getRange(address).setNumberFormat(pct);s.getRange(address).format.font.italic=true}
const src=sheets['Source data'];src.showGridLines=false;
const headers=['Metric','Fiscal year','Quarter','Period type','Start date','End date','Value ($M / per share)','Taxonomy / table','Filed','Source URL','','Location / basis'];
src.getRange('A1:L1').values=[headers];src.getRange('A1:L1').format={fill:navy,font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},rowHeight:30,wrapText:true};
const records=data.records, lookup=new Map();
src.getRange(`A2:L${records.length+1}`).values=records.map((r,i)=>{lookup.set([r.metric,r.year,r.quarter,r.type].join('|'),i+2);return [r.metric,r.year,r.quarter,r.type,r.start,r.end,r.value,r.tag,r.filed,r.source,null,r.detail]});
src.getRange(`A2:L${records.length+1}`).format.font={name:'Arial',size:10};src.getRange(`G2:G${records.length+1}`).setNumberFormat('#,##0.000;(#,##0.000);"-"');src.getRange(`G2:G${records.length+1}`).format.font.color=blue;
for(const [c,w] of [['A',25],['B',12],['C',9],['D',12],['E',13],['F',13],['G',21],['H',48],['I',13],['J',95],['K',3],['L',105]])src.getRange(`${c}1:${c}${records.length+1}`).format.columnWidth=w;
src.freezePanes.freezeRows(1);src.freezePanes.freezeColumns(1);src.tables.add(`A1:J${records.length+1}`,true,'FinancialSources');
function key(m,y,q,t){return lookup.get([m,y,q,t].join('|'))}
function ref(m,y,q,t){const r=key(m,y,q,t);return r?`'Source data'!G${r}`:null}
function annual(m,y){return ref(m,y,4,data.instant.includes(m)?'I':'A')}
const additive=new Set(data.metrics.filter(m=>!data.instant.includes(m)&&!['Diluted EPS','Diluted shares','Dividend per share'].includes(m)));
function qexpr(m,y,q){let r=ref(m,y,q,data.instant.includes(m)?'I':'Q');if(r)return r;
 if(q===1)return ref(m,y,q,'YTD');
 if(!additive.has(m))return null;
 let now=q===4?annual(m,y):ref(m,y,q,'YTD'),prev=ref(m,y,q-1,'YTD')||(q===2?ref(m,y,1,'Q'):null);
 if(now&&prev)return `${now}-${prev}`;
 if(now&&q===4){const parts=[1,2,3].map(q=>qexpr(m,y,q));if(parts.every(Boolean))return `${now}-(${parts.join('+')})`}
 return null}
const rows={6:'Revenue',9:'COGS',10:'Gross profit',13:'R&D',14:'SG&A',15:'Operating expenses',16:'Operating income',19:'Pretax income',20:'Income tax',21:'Net income',24:'Diluted EPS',25:'Diluted shares',28:'Cash',29:'Receivables',30:'Inventory',31:'Current assets',32:'PP&E',33:'Goodwill',34:'Intangibles',35:'Assets',37:'Accounts payable',38:'Current liabilities',39:'Current debt',40:'Long-term debt',42:'Liabilities',43:'Equity',46:'Operating cash flow',47:'Capex',49:'Investing cash flow',50:'Financing cash flow',52:'Depreciation',53:'Amortization',54:'Stock compensation',55:'Dividends paid',56:'Buybacks',57:'Dividend per share'};
const labels={7:'Revenue growth YoY',11:'Gross margin',17:'Operating margin',22:'Net margin',41:'Total debt (carrying value)',44:'Net cash / (debt)',48:'Free cash flow',58:'Free cash flow margin',59:'Capex / revenue',60:'Cash conversion (OCF / net income)',61:'Receivable days (ending balance)',62:'Inventory days (ending balance)',63:'Payable days (ending balance)',64:'Operating working capital',65:'Non-GAAP diluted EPS (selected)'};
const ar=sheets.Annual, qr=sheets.Quarterly; const years=Array.from({length:28},(_,i)=>1998+i),quarters=[];for(let y=2001;y<=2026;y++)for(let q=1;q<=4;q++)if(y<2026||q<=3)quarters.push([y,q]);
const annualCol=new Map(),quarterCol=new Map();
for(const [s,periods,isQ] of [[ar,years,false],[qr,quarters,true]]){
 const end=col(periods.length+3);base(s,end,68,isQ?'Skyworks quarterly financial history':'Skyworks annual financial history');
 val(s,'C4','USD millions, except EPS and ratios');
 for(const [r,m] of Object.entries(rows))val(s,`C${r}`,m);for(const [r,m]of Object.entries(labels))val(s,`C${r}`,m);
 for(const r of [5,27,45])band(s,r,end);val(s,'C5','Income statement');val(s,'C27','Balance sheet');val(s,'C45','Cash flow and operating metrics');
 periods.forEach((p,i)=>{const y=isQ?p[0]:p,q=isQ?p[1]:4,c=col(i+4);if(isQ)quarterCol.set(`${y}Q${q}`,c);else annualCol.set(y,c);val(s,`${c}5`,isQ?`Q${q}:${String(y).slice(2)}`:`FY:${String(y).slice(2)}`);
  for(const [r,m]of Object.entries(rows)){const e=isQ?qexpr(m,y,q):annual(m,y);if(e)form(s,`${c}${r}`,`=${e}`);else val(s,`${c}${r}`,'n.a.');}
  // Original gross profit is preferred. Missing reported subtotals are calculated.
  if(!(isQ?qexpr('Gross profit',y,q):annual('Gross profit',y)))form(s,`${c}10`,`=IF(AND(ISNUMBER(${c}6),ISNUMBER(${c}9)),${c}6-${c}9,"n.a.")`);
  const prev=i-(isQ?4:1);if(prev>=0)ratio(s,`${c}7`,`${c}6-${col(prev+4)}6`,`${col(prev+4)}6`);else val(s,`${c}7`,'n.a.');
  for(const [r,num,den]of [[11,10,6],[17,16,6],[22,21,6],[58,48,6],[59,47,6],[60,46,21]])ratio(s,`${c}${r}`,`${c}${num}`,`${c}${den}`);
  for(const [r,a,b,sign]of [[41,39,40,'+'],[44,28,41,'-'],[48,46,47,'-']])form(s,`${c}${r}`,`=IF(AND(ISNUMBER(${c}${a}),ISNUMBER(${c}${b})),${c}${a}${sign}${c}${b},"n.a.")`);
  form(s,`${c}64`,`=IF(COUNT(${c}29:${c}30,${c}37)=3,${c}29+${c}30-${c}37,"n.a.")`);
  for(const [r,a,b]of [[61,29,6],[62,30,9],[63,37,9]])form(s,`${c}${r}`,`=IF(AND(ISNUMBER(${c}${a}),ISNUMBER(${c}${b}),${c}${b}<>0),${c}${a}/${c}${b}*${isQ?91:365},"n.a.")`);
  const ng=isQ?ref('Non-GAAP EPS',y,q,'Q'):null;if(ng)form(s,`${c}65`,`=${ng}`);else val(s,`${c}65`,'n.a.');
 });
 for(const r of [6,10,16,21,35,41,43,46,48]){s.getRange(`C${r}:${end}${r}`).format.font.bold=true;s.getRange(`C${r}:${end}${r}`).format.borders={bottom:{style:'thin',color:'#C9D5DF'}};}
 for(const r of [24,57,65])s.getRange(`D${r}:${end}${r}`).setNumberFormat('0.00;(0.00);"-"');
 for(const r of [7,11,17,22,58,59,60])s.getRange(`C${r}:${end}${r}`).format.font.italic=true;
 val(s,'C67',isQ?'Q4 additive flows are FY less nine months when no discrete quarter is reported. EPS is never obtained by subtraction.':'FY1998–FY2001 are the Conexant wireless predecessor. FY2002 includes Alpha only after June 25, 2002.');
 val(s,'C68','n.a. = not available. See ReadMe for restatements, early-period coverage and cash-flow definitions.');
}
ar.tabColor='#D8CBB5';qr.tabColor='#D8CBB5';
// Assumptions and explicit guidance source.
const ass=sheets.Assumptions;base(ass,'J',34,'Legacy Skyworks forecast assumptions');ass.tabColor='#527BA6';
val(ass,'C4','Blue cells are editable. FY2026 drivers apply to Q4 only.');
for(let i=0;i<5;i++)val(ass,`${col(i+4)}5`,`FY:${26+i}E`);band(ass,5,'H');
const assumptions={6:['Revenue growth',[0,.03,.08,.07,.05]],7:['Q4 FY2026 revenue',[1035,null,null,null,null]],8:['Gross margin',[.40,.41,.42,.43,.43]],9:['R&D / revenue',[.21,.20,.195,.19,.19]],10:['SG&A / revenue',[.095,.09,.085,.08,.08]],11:['Other operating expenses / revenue',[.015,.012,.01,.01,.01]],12:['Net non-operating income / expense',[-10,-20,-20,-20,-20]],13:['Effective tax rate',[.15,.15,.15,.15,.15]],14:['Diluted shares (millions)',[151,151,150,149,148]],15:['Depreciation / revenue',[.07,.07,.07,.07,.07]],16:['Intangible amortization',[42.9,170,160,150,140]],17:['Stock compensation / revenue',[.06,.06,.06,.06,.06]],18:['Receivable days (annual basis)',[55,55,55,55,55]],19:['Inventory days (annual basis)',[115,110,105,100,100]],20:['Payable days (annual basis)',[35,35,35,35,35]],21:['Capex / revenue',[.055,.055,.055,.055,.055]],22:['Other operating cash adjustments',[0,0,0,0,0]]};
for(const [r,[label,vals]]of Object.entries(assumptions)){val(ass,`C${r}`,label);ass.getRange(`D${r}:H${r}`).values=[vals];ass.getRange(`D${r}:H${r}`).format.font.color=blue;ass.getRange(`D${r}:H${r}`).format.fill='#FFF4D6';if([6,8,9,10,11,13,15,17,21].includes(+r))ass.getRange(`D${r}:H${r}`).setNumberFormat(pct)}
val(ass,'C25','Q4:26 revenue guidance ($M)');val(ass,'D25',1010);val(ass,'E25',1060);val(ass,'F25','Low / high ($M)');val(ass,'C26','Guidance non-GAAP EPS at midpoint');val(ass,'D26',1.27);val(ass,'C28','Guidance source');val(ass,'D28','https://investors.skyworksinc.com/news-releases/news-release-details/skyworks-delivers-solid-third-quarter-fiscal-year-2026-results');
val(ass,'C30','FY2027–FY2030 assumptions are illustrative analyst inputs, not company guidance.');val(ass,'C31','Qorvo revenue, acquisition debt, issued shares, integration costs and synergies are excluded.');val(ass,'C32','Q4 FY2026 revenue uses management guidance midpoint. GAAP cost and cash drivers are user-editable estimates.');
// Forecast: actual YTD plus estimated fourth quarter, then annual driver build.
const fc=sheets.Forecast;base(fc,'I',48,'Legacy Skyworks operating forecast');val(fc,'C4','USD millions. Excludes the Qorvo combination. Estimates as of October 20, 2026.');
const fl={6:'Revenue',7:'Revenue growth YoY',9:'Cost of goods sold',10:'Gross profit',11:'Gross margin',13:'R&D',14:'SG&A',15:'Other operating expenses',16:'Operating income',17:'Operating margin',19:'Net non-operating income / expense',20:'Pretax income',21:'Income tax',22:'Net income',23:'Diluted shares',24:'Diluted EPS',27:'Depreciation',28:'Intangible amortization',29:'Stock compensation',31:'Accounts receivable',32:'Inventory',33:'Accounts payable',34:'Operating working capital',35:'Change in working capital',37:'Other operating cash adjustments',38:'Operating cash flow',39:'Capital expenditure',40:'Free cash flow',41:'Free cash flow margin'};
for(const[r,l]of Object.entries(fl))val(fc,`C${r}`,l);for(const r of [5,26,36])band(fc,r,'H');val(fc,'C5','Earnings build');val(fc,'C26','Cash flow drivers');val(fc,'C36','Cash generation');
const q3=quarterCol.get('2026Q3'),ac25=annualCol.get(2025);
function ytd(m){const r=ref(m,2026,3,'YTD');if(r)return r;const p=[1,2,3].map(q=>qexpr(m,2026,q));if(!p.every(Boolean))throw Error('Missing YTD '+m);return '('+p.join('+')+')'}
for(let i=0;i<5;i++){const c=col(i+4),p=col(i+3);val(fc,`${c}5`,`FY:${26+i}E`);
 const a=r=>`'Assumptions'!${c}${r}`;
 form(fc,`${c}6`,i===0?`=${ytd('Revenue')}+${a(7)}`:`=${p}6*(1+${a(6)})`);
 ratio(fc,`${c}7`,`${c}6-${i===0?`'Annual'!${ac25}6`:`${p}6`}`,i===0?`'Annual'!${ac25}6`:`${p}6`);
 const rev=i===0?a(7):`${c}6`;
 const hist=(m)=>i===0?ytd(m)+'+':'';
 form(fc,`${c}9`,`=${hist('COGS')}${rev}*(1-${a(8)})`);form(fc,`${c}10`,`=${c}6-${c}9`);ratio(fc,`${c}11`,`${c}10`,`${c}6`);
 for(const [r,m,driver]of [[13,'R&D',9],[14,'SG&A',10]])form(fc,`${c}${r}`,`=${hist(m)}${rev}*${a(driver)}`);
 const other=i===0?`${ytd('Operating expenses')}-${ytd('R&D')}-${ytd('SG&A')}+`:'';
 form(fc,`${c}15`,`=${other}${rev}*${a(11)}`);form(fc,`${c}16`,`=${c}10-SUM(${c}13:${c}15)`);ratio(fc,`${c}17`,`${c}16`,`${c}6`);
 form(fc,`${c}19`,`=${i===0?ytd('Pretax income')+'-'+ytd('Operating income')+'+':''}${a(12)}`);form(fc,`${c}20`,`=${c}16+${c}19`);
 form(fc,`${c}21`,i===0?`=${ytd('Income tax')}+(${c}20-${ytd('Pretax income')})*${a(13)}`:`=${c}20*${a(13)}`);
 form(fc,`${c}22`,`=${c}20-${c}21`);form(fc,`${c}23`,`=${a(14)}`);form(fc,`${c}24`,`=${c}22/${c}23`);
 form(fc,`${c}27`,`=${hist('Depreciation')}${rev}*${a(15)}`);form(fc,`${c}28`,`=${hist('Amortization')}${a(16)}`);form(fc,`${c}29`,`=${hist('Stock compensation')}${rev}*${a(17)}`);
 form(fc,`${c}31`,`=${c}6/365*${a(18)}`);form(fc,`${c}32`,`=${c}9/365*${a(19)}`);form(fc,`${c}33`,`=${c}9/365*${a(20)}`);form(fc,`${c}34`,`=SUM(${c}31:${c}32)-${c}33`);
 form(fc,`${c}35`,`=${c}34-${i===0?`'Quarterly'!${q3}64`:`${p}34`}`);form(fc,`${c}37`,`=${a(22)}`);
 form(fc,`${c}38`,i===0?`=${ytd('Operating cash flow')}+(${c}22-${ytd('Net income')})+(${c}27-${ytd('Depreciation')})+(${c}28-${ytd('Amortization')})+(${c}29-${ytd('Stock compensation')})-${c}35+${c}37`:`=${c}22+SUM(${c}27:${c}29)-${c}35+${c}37`);
 form(fc,`${c}39`,`=${hist('Capex')}${rev}*${a(21)}`);form(fc,`${c}40`,`=${c}38-${c}39`);ratio(fc,`${c}41`,`${c}40`,`${c}6`);
}
for(const r of [6,10,16,22,24,38,40])fc.getRange(`C${r}:H${r}`).format.font.bold=true;fc.getRange('D24:H24').setNumberFormat('0.00');val(fc,'C44','FY2026 = reported nine months plus estimated Q4. FY2027 onward uses full-year assumptions.');val(fc,'C45','Working capital includes receivables, inventory and trade payables only. Other operating cash adjustments are explicit inputs.');val(fc,'C46','EPS uses the assumed annual diluted share count. Cash flow is operating cash flow less cash capital expenditure.');val(fc,'C47','This forecast does not represent the post-combination company or include purchase accounting.');
// Summary aligned to latest completed years, YTD, and estimates.
const ov=sheets.Overview;base(ov,'N',45,'Skyworks Solutions (NASDAQ: SWKS)');ov.tabColor=navy;ov.freezePanes.unfreeze();ov.getRange('C1:C45').format.columnWidth=32;
val(ov,'C4','Historical financials and editable operating model');val(ov,'C5','As of October 20, 2026. USD millions except per share.');
ov.getRange('C7:J8').format.fill='#FFF0D3';val(ov,'C7','Qorvo combination completed October 5, 2026.');val(ov,'C8','Forecast below covers legacy Skyworks only. Combined-company forecasts require a transaction model.');
const oh=['Metric','FY:23A','FY:24A','FY:25A','9M:26A','FY:26E','FY:27E','FY:28E'];ov.getRange('C10:J10').values=[oh];band(ov,10,'J');
const summaryRows={11:['Revenue',6,6],12:['Gross margin',11,11],13:['Operating income',16,16],14:['Operating margin',17,17],15:['Net income',21,22],16:['Diluted EPS',24,24],18:['Operating cash flow',46,38],19:['Capital expenditure',47,39],20:['Free cash flow',48,40],21:['Free cash flow margin',58,41]};
for(const [r,[label,actualR,forecastR]]of Object.entries(summaryRows)){val(ov,`C${r}`,label);for(let i=0;i<3;i++)form(ov,`${col(i+4)}${r}`,`='Annual'!${annualCol.get(2023+i)}${actualR}`);for(let i=0;i<3;i++)form(ov,`${col(i+8)}${r}`,`='Forecast'!${col(i+4)}${forecastR}`);}
for(const [r,m]of [[11,'Revenue'],[13,'Operating income'],[15,'Net income'],[18,'Operating cash flow'],[19,'Capex']])form(ov,`G${r}`,`=${ytd(m)}`);
form(ov,'G12',`=(${ytd('Revenue')}-${ytd('COGS')})/G11`);form(ov,'G14','=G13/G11');form(ov,'G16',`=${ref('Diluted EPS',2026,3,'YTD')}`);form(ov,'G20','=G18-G19');form(ov,'G21','=G20/G11');
for(const r of [12,14,21])ov.getRange(`D${r}:J${r}`).setNumberFormat(pct);ov.getRange('D16:J16').setNumberFormat('0.00');ov.getRange('D11:J21').format.font.color='#182C40';
val(ov,'C24','Coverage');val(ov,'D24','Annual FY1998–FY2025. Quarterly Q1 FY2001–Q3 FY2026.');val(ov,'C25','Historical basis');val(ov,'D25','GAAP. Early predecessor periods and restatements are explained in ReadMe.');val(ov,'C26','Latest actual');val(ov,'D26','Quarter ended July 3, 2026. FY2026 Q4 results are not included as actuals.');
ov.getRange('C29:E29').values=[['Fiscal year','Revenue','Free cash flow']];band(ov,29,'E');
for(let i=0;i<16;i++){const y=2010+i,r=i+30;val(ov,`C${r}`,`FY:${String(y).slice(2)}`);form(ov,`D${r}`,`='Annual'!${annualCol.get(y)}6`);form(ov,`E${r}`,`='Annual'!${annualCol.get(y)}48`)}ov.getRange('D30:E45').format.font.color='#182C40';
const chart=ov.charts.add('line',ov.getRange('C29:E45'));chart.title='Revenue and free cash flow ($M)';chart.titleTextStyle.typeface='Arial';chart.titleTextStyle.fontSize=12;chart.legend={position:'top',textStyle:{typeface:'Arial',fontSize:10}};chart.xAxis={axisType:'textAxis',textStyle:{typeface:'Arial',fontSize:10}};chart.yAxis={numberFormatCode:'#,##0',numberFormatSourceLinked:false,textStyle:{typeface:'Arial',fontSize:10}};chart.setPosition('G29','N45');chart.series.items.forEach((s,i)=>s.line={fill:i===0?navy:'#B1762F',style:'solid',width:2});
// Audit. Diagnostics never feed the forecast or summary.
const au=sheets.Audit;base(au,'K',36,'Historical reconciliation checks');au.getRange('C1:C36').format.columnWidth=12;au.getRange('D1:J36').format.columnWidth=18;
au.getRange('C5:J5').values=[['Fiscal year','Revenue quarters - FY','Net income quarters - FY','Gross profit bridge','Operating income bridge','Assets - liabilities - equity','Cash flow rollforward','Notes']];band(au,5,'J');au.getRange('C5:J5').format.wrapText=true;au.getRange('C5:J5').format.rowHeight=48;
for(let y=2000;y<=2025;y++){const r=y-1994,c=annualCol.get(y);val(au,`C${r}`,y);
 for(const[m,target,arow]of [['Revenue','D',6],['Net income','E',21]]){const qs=[1,2,3,4].map(q=>quarterCol.get(`${y}Q${q}`));form(au,`${target}${r}`,qs.every(Boolean)?`=IF(COUNT(${qs.map(c=>`'Quarterly'!${c}${arow}`).join(',')})=4,SUM(${qs.map(c=>`'Quarterly'!${c}${arow}`).join(',')})-'Annual'!${c}${arow},"n.a.")`:'="n.a."')}
 form(au,`F${r}`,`=IF(COUNT('Annual'!${c}6,'Annual'!${c}9,'Annual'!${c}10)=3,'Annual'!${c}6-'Annual'!${c}9-'Annual'!${c}10,"n.a.")`);
 form(au,`G${r}`,`=IF(COUNT('Annual'!${c}10,'Annual'!${c}15,'Annual'!${c}16)=3,'Annual'!${c}10-'Annual'!${c}15-'Annual'!${c}16,"n.a.")`);
 form(au,`H${r}`,`=IF(COUNT('Annual'!${c}35,'Annual'!${c}42,'Annual'!${c}43)=3,'Annual'!${c}35-'Annual'!${c}42-'Annual'!${c}43,"n.a.")`);
 const p=annualCol.get(y-1);form(au,`I${r}`,p?`=IF(COUNT('Annual'!${c}28,'Annual'!${p}28,'Annual'!${c}46,'Annual'!${c}49,'Annual'!${c}50)=5,'Annual'!${c}28-'Annual'!${p}28-SUM('Annual'!${c}46,'Annual'!${c}49,'Annual'!${c}50),"n.a.")`:'="n.a."');
 if(y===2013)form(au,`I${r}`,`='Annual'!${c}28-${ref('Reported opening cash',2013,4,'A')}-SUM('Annual'!${c}46,'Annual'!${c}49,'Annual'!${c}50)`);val(au,`J${r}`,y===2013?'FY2013 reported opening cash 307.1 vs original FY2012 close 306.293. Check uses reported opening.':y===2002?'Early quarterly gross profit uses original classifications.':y===2009?'Original FY2009 report basis retained.':y===2010?'':'');}
au.getRange('D6:I31').setNumberFormat('0.00;(0.00);0.00');au.getRange('D6:I31').format.font.color='#182C40';au.getRange('D6:I31').conditionalFormats.add('cellIs',{operator:'greaterThan',formula:.11,format:{fill:'#FCE1E1',font:{color:'#B00020',bold:true}}});au.getRange('D6:I31').conditionalFormats.add('cellIs',{operator:'lessThan',formula:-.11,format:{fill:'#FCE1E1',font:{color:'#B00020',bold:true}}});au.getRange('J6:J31').format.columnWidth=75;
val(au,'C34','Tolerance: $0.11M. Cash-flow differences can reflect exchange rates, restricted cash or later comparative revisions.');val(au,'C35','n.a. means insufficient original data to test. Investigate any highlighted difference before using cash balances in a transaction model.');
const rm=sheets.ReadMe;base(rm,'E',38,'Sources, scope and model definitions');rm.freezePanes.unfreeze();rm.getRange('C1:C38').format.columnWidth=29;rm.getRange('D1:D38').format.columnWidth=115;
const notes=[
['Scope','Financial model for Skyworks Solutions, NASDAQ: SWKS, as of October 20, 2026.'],
['Annual coverage','FY1998–FY2025. FY1998–FY1999 contain selected predecessor financial data. Full cash-flow coverage starts FY2000.'],
['Quarterly coverage','Q1 FY2001–Q3 FY2026. Early quarters primarily contain revenue, gross profit, net income and EPS.'],
['Latest actual','Q3 FY2026 ended July 3, 2026. FY2026 full-year and later columns are estimates.'],
['Primary source','SEC Company Facts, CIK 0000004127, supplemented by the issuer annual reports and selected earnings releases.'],
['Source register','Each numeric historical source has its fiscal key, tag/table, filing date, URL and location in Source data.'],
['SEC dataset','https://data.sec.gov/api/xbrl/companyfacts/CIK0000004127.json'],
['Annual report archive','https://investors.skyworksinc.com/annual-reports-and-proxies'],
['Older reports','Issuer annual reports FY2002, FY2004, FY2005, FY2007 and FY2009 hosted by AnnualReports.com.'],
['Report review coverage','Structured 10-K / 10-Q history plus older annual-report quarterly footnotes. Not every earnings-call transcript was reviewed.'],
['Source selection','Total GAAP cash flows take precedence over continuing-only tags. Balance sheets prefer original period filings, within 450 days of period end.'],
['FY2008–FY2009 basis','Original FY2009 income and cash-flow statements retained to match quarterly footnotes. Balance sheets prefer original SEC filings; revisions affect comparability.'],
['FY2004 cash reclassification','Cash of $123.505M uses FY2005 comparative, replacing $203.539M originally reported. Short-term investments were reclassified.'],
['FY2002 classifications','FY2004 revised cost classification is used annually. FY2002 quarterly footnotes retain original cost classifications.'],
['FY2003 accounting change','Annual net loss includes a $397.139M goodwill accounting-change charge. Quarterly data place it in Q1 as revised in FY2004.'],
['Predecessor comparability','FY1998–FY2001 represent Conexant Washington/Mexicali. Alpha results enter only after June 25, 2002, under reverse acquisition accounting.'],
['Fiscal calendar','Uses issuer fiscal periods. Year-end is the Friday nearest September 30; older reports label periods September 30. 53-week years are retained.'],
['Units and signs','USD millions and million shares, except per-share data. Expenses, capex and distributions positive. Signed cash-flow totals as filed.'],
['Missing data','n.a. means not available from the selected source. Missing values are never inferred to be zero.'],
['Quarter derivation','Cash-flow statements are usually cumulative. Discrete Q2/Q3 subtract prior YTD; Q4 subtracts nine months from the full year.'],
['EPS and shares','EPS and diluted weighted-average shares are not additive. Q4 EPS uses reported data where available. No EPS-by-subtraction.'],
['Non-GAAP coverage','Selected Q4 FY2021–FY2025 and Q1–Q3 FY2026 earnings-release EPS are shown separately. Historical statement model is GAAP.'],
['Free cash flow','Operating cash flow less cash purchases of PP&E. This is a calculated analytical measure, not a GAAP statement subtotal.'],
['Working capital days','Ending AR / revenue × 365; inventory or AP / COGS × 365. Quarterly history uses 91 days, so these ratios are approximate.'],
['Forecast construction','FY2026 reported YTD plus Q4 revenue guidance and assumed cost/cash drivers. FY2027–FY2030 use editable annual assumptions.'],
['Forecast status','Illustrative legacy-business operating forecast. No combined-company valuation, purchase accounting or three-statement balance-sheet forecast.'],
['Combination','Qorvo combination completed October 5, 2026. Qorvo revenue, debt, new shares, integration costs and synergies are excluded from this forecast.'],
['Combination source','https://investors.skyworksinc.com/news-releases/news-release-details/skyworks-completes-combination-qorvo'],
['Capital allocation','July 28, 2026 release announced no quarterly dividends going forward and a new $2B repurchase authorization. Authorization is not forecast spending.'],
['Controls','Edit blue assumption cells. Formula links are green in working sheets; calculations are black. Output values use dark text.'],
['Refresh','Append new reported facts with fiscal keys in Source data and extend formulas. The workbook is not a live data connection.'],
['Reconciliation','Audit checks quarterly sums, statement bridges and cash rollforward. FX, restricted cash and restatements can create differences.']];
rm.getRange(`C5:D${notes.length+4}`).values=notes;rm.getRange(`C5:D${notes.length+4}`).format.wrapText=true;rm.getRange(`C5:D${notes.length+4}`).format.rowHeight=33;rm.tabColor='#8997A5';
wb.recalculate();
for(let i=1;i<years.length;i++){const c=annualCol.get(years[i]),p=annualCol.get(years[i-1]);const current=ar.getRange(`${c}6`).values[0][0],prior=ar.getRange(`${p}6`).values[0][0],growth=ar.getRange(`${c}7`).values[0][0];if(Math.abs(growth-(current/prior-1))>1e-9)throw Error('Annual growth check failed '+years[i]);}
for(let i=1;i<5;i++){const c=col(i+4);if(Math.abs(fc.getRange(`${c}7`).values[0][0]-ass.getRange(`${c}6`).values[0][0])>1e-9)throw Error('Forecast growth check failed')}
// Required dynamic recalculation test: an editable revenue driver must change forecast revenue and the summary.
const before=fc.getRange('E6').values[0][0];val(ass,'E6',.13);wb.recalculate();const after=fc.getRange('E6').values[0][0];if(typeof before!=='number'||!(after>before))throw Error('Forecast did not respond to growth input');val(ass,'E6',.03);wb.recalculate();
console.log('Recalculation test',JSON.stringify({before,after,restored:fc.getRange('E6').values[0][0]}));
console.log((await wb.inspect({kind:'table',range:'Overview!C10:J21',include:'values,formulas',tableMaxRows:12,tableMaxCols:8,maxChars:4500})).ndjson);
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!',options:{useRegex:true,maxResults:50},summary:'Final error scan',maxChars:3000})).ndjson);
await fs.writeFile(`${dir}/audit.json`,JSON.stringify(au.getRange('C6:J31').values,null,2));
for(const name of names){const s=sheets[name],range=name==='Overview'?'C2:N45':name==='Source data'?'A1:I12':name==='ReadMe'?'C2:D14':name==='Audit'?'C2:J16':name==='Assumptions'?'C2:H22':name==='Forecast'?'C2:H41':name==='Annual'?'C2:J24':'C2:J24';try{const b=await wb.render({sheetName:name,range,scale:1.5,format:'png'});await fs.writeFile(`${dir}/${name.replaceAll(' ','_')}.png`,new Uint8Array(await b.arrayBuffer()))}catch(e){console.log('Render failure',name,e.message)}}
const xlsx=await SpreadsheetFile.exportXlsx(wb);await xlsx.save(`${dir}/Skyworks_Financial_Model.xlsx`);console.log('EXPORTED',`${dir}/Skyworks_Financial_Model.xlsx`);
