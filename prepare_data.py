import json,datetime,collections
from pathlib import Path
F=json.load(open('companyfacts.json'))['facts']['us-gaap']; out=[]
M={
'Revenue':['RevenueFromContractWithCustomerExcludingAssessedTax','Revenues','SalesRevenueNet'],
'COGS':['CostOfRevenue','CostOfGoodsAndServicesSold','CostOfGoodsSold'],'Gross profit':['GrossProfit'],'R&D':['ResearchAndDevelopmentExpense'],'SG&A':['SellingGeneralAndAdministrativeExpense'],
'Operating expenses':['OperatingExpenses'],'Operating income':['OperatingIncomeLoss'],
'Pretax income':['IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest','IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments'],
'Income tax':['IncomeTaxExpenseBenefit'],'Net income':['NetIncomeLoss'],'Diluted EPS':['EarningsPerShareDiluted'],'Diluted shares':['WeightedAverageNumberOfDilutedSharesOutstanding'],
'Cash':['CashAndCashEquivalentsAtCarryingValue'],'Receivables':['AccountsReceivableNetCurrent','ReceivablesNetCurrent'],'Inventory':['InventoryNet'],
'Current assets':['AssetsCurrent'],'PP&E':['PropertyPlantAndEquipmentNet'],'Goodwill':['Goodwill'],'Intangibles':['FiniteLivedIntangibleAssetsNet','IntangibleAssetsNetExcludingGoodwill'],
'Assets':['Assets'],'Accounts payable':['AccountsPayableCurrent'],'Current liabilities':['LiabilitiesCurrent'],'Current debt':['DebtCurrent'],'Long-term debt':['LongTermDebt'],
'Liabilities':['Liabilities'],'Equity':['StockholdersEquity'],
'Operating cash flow':['NetCashProvidedByUsedInOperatingActivities','NetCashProvidedByUsedInOperatingActivitiesContinuingOperations'],'Investing cash flow':['NetCashProvidedByUsedInInvestingActivities','NetCashProvidedByUsedInInvestingActivitiesContinuingOperations'],
'Financing cash flow':['NetCashProvidedByUsedInFinancingActivities','NetCashProvidedByUsedInFinancingActivitiesContinuingOperations'],'Capex':['PaymentsToAcquirePropertyPlantAndEquipment','PaymentsToAcquireProductiveAssets'],
'Depreciation':['Depreciation'],'Amortization':['AmortizationOfIntangibleAssets'],'Stock compensation':['ShareBasedCompensation'],
'Dividends paid':['PaymentsOfDividendsCommonStock','PaymentsOfOrdinaryDividends'],'Buybacks':['PaymentsForRepurchaseOfCommonStock'],
'Dividend per share':['CommonStockDividendsPerShareDeclared']}
instant=set(['Cash','Receivables','Inventory','Current assets','PP&E','Goodwill','Intangibles','Assets','Accounts payable','Current liabilities','Current debt','Long-term debt','Liabilities','Equity'])
def fq(end):
 d=datetime.date.fromisoformat(end); candidates=[]
 for y in range(d.year-1,d.year+2):
  for q,mo,day in [(1,12,31),(2,3,31),(3,6,30),(4,9,30)]:
   t=datetime.date(y-1 if q==1 else y,mo,day);candidates.append((abs((d-t).days),y,q))
 return min(candidates)[1:]
chosen={}
for metric,tags in M.items():
 for priority,tag in enumerate(tags):
  if tag not in F:continue
  for unit,a in F[tag]['units'].items():
   for x in a:
    if x.get('form') not in ['10-K','10-Q','10-K/A','10-Q/A'] or x.get('filed','9999')>'2026-10-20':continue
    y,q=fq(x['end'])
    if metric in instant:
     if x.get('start'):continue
     # Use the balance sheet or next annual comparative. Later distant facts can
     # reuse a historical context for cash-flow opening balances and disclosures.
     if (datetime.date.fromisoformat(x['filed'])-datetime.date.fromisoformat(x['end'])).days>450:continue
     typ='I'
    else:
     if not x.get('start'):continue
     days=(datetime.date.fromisoformat(x['end'])-datetime.date.fromisoformat(x['start'])).days+1
     if 350<=days<=380 and q==4:typ='A'
     elif 70<=days<=105:typ='Q'
     elif 150<=days<=300:typ='YTD'
     else:continue
    key=(metric,y,q,typ)
    primary_balance=1 if typ=='I' and x.get('fy')==y and x.get('fp')==('FY' if q==4 else f'Q{q}') else 0
    rank=(primary_balance,-priority,x['filed'],x.get('accn',''))
    if key not in chosen or rank>chosen[key][0]:chosen[key]=(rank,dict(metric=metric,year=y,quarter=q,type=typ,start=x.get('start',''),end=x['end'],value=x['val']/(1 if unit=='USD/shares' else 1e6),tag=tag,filed=x['filed'],source=f"https://www.sec.gov/Archives/edgar/data/4127/{x['accn'].replace('-','')}/",detail=x['form']+'; '+unit))
out=[x[1] for x in chosen.values()]
def add(y,metric,val,report,page,typ='A',q=4):
 out.append(dict(metric=metric,year=y,quarter=q,type=typ,start='',end='',value=val,tag='Annual report table',filed='',source=f'https://www.annualreports.com/HostedData/AnnualReportArchive/s/NASDAQ_SWKS_{report}.pdf',detail=f'FY{report} annual report, printed page {page}; USD millions except per share; restated where presented'))
def series(ys,metric,vals,report,page):
 for y,v in zip(ys,vals):add(y,metric,v,report,page)
# Earliest predecessor history available in the FY2002 selected financial data.
for m,vs in {'Revenue':[112.271,216.415],'COGS':[77.853,134.539],'Gross profit':[34.418,81.876],'R&D':[56.748,66.457],'SG&A':[21.211,27.202],'Operating expenses':[78.179,95.091],'Operating income':[-43.761,-13.215],'Pretax income':[-42.202,-13.269],'Income tax':[1.082,1.646],'Net income':[-43.284,-14.915]}.items():series([1998,1999],m,vs,2002,24)
for y,assets,equity in [(1998,203.313,187.196),(1999,291.909,275.568)]:
 add(y,'Assets',assets,2002,24,'I');add(y,'Equity',equity,2002,24,'I')
# Archived issuer reports, values converted from thousands to millions.
for metric,vals in {
'Revenue':[378.416,260.451,457.769],'COGS':[270.170,311.503,331.608],'Gross profit':[108.246,-51.052,126.161],
'R&D':[91.616,111.053,132.603],'SG&A':[52.422,51.267,50.178],'Operating expenses':[173.727,266.463,377.531],
'Operating income':[-65.481,-317.515,-251.370],'Pretax income':[-65.339,-317.305,-255.653],
'Income tax':[1.140,1.619,-19.589],'Net income':[-66.479,-318.924,-236.064],
'Operating cash flow':[-53.830,-89.406,-99.094],'Investing cash flow':[-92.769,-51.118,70.042],'Financing cash flow':[148.706,138.343,80.412],
'Capex':[100.424,51.118,29.412],'Depreciation':[61.710,58.708,47.695],'Amortization':[5.327,15.267,12.878]}.items():series([2000,2001,2002],metric,vals,2002,'26 / 28')
# FY2002 expense classification updated in FY2004.
for metric,v in {'COGS':329.701,'Gross profit':128.068,'R&D':133.614,'SG&A':51.074,'Operating expenses':379.438,'Amortization':12.929}.items():add(2002,metric,v,2004,68)
for metric,vals in {'Revenue':[617.789,784.023],'COGS':[370.940,470.807],'Gross profit':[246.849,313.216],'R&D':[156.077,152.633],'SG&A':[85.432,97.522],'Operating expenses':[280.388,270.564],'Operating income':[-33.539,42.652],'Pretax income':[-53.625,26.396],'Income tax':[.652,3.984],'Net income':[-451.416,22.412],'Diluted EPS':[-3.24,.15],'Diluted shares':[139.376,154.242],'Depreciation':[36.941,35.829],'Amortization':[4.386,3.043],'Operating cash flow':[-72.052,91.913],'Capex':[40.294,59.998],'Investing cash flow':[-44.282,-141.044],'Financing cash flow':[224.482,11.130]}.items():series([2003,2004],metric,vals,2005,'73 / 75')
for metric,vals in {'Revenue':[792.371,773.750,741.744],'COGS':[484.599,511.071,454.359],'Gross profit':[307.772,262.679,287.385],'R&D':[152.215,164.106,126.075],'SG&A':[103.070,135.801,94.950],'Operating expenses':[257.639,329.006,228.899],'Operating income':[50.133,-66.327,58.486],'Pretax income':[40.989,-72.774,56.770],'Income tax':[15.378,15.378,-.880],'Net income':[25.611,-88.152,57.650],'Diluted EPS':[.16,-.55,.36],'Diluted shares':[158.857,159.408,161.064],'Operating cash flow':[54.197,27.226,84.778],'Investing cash flow':[-66.424,42.383,-20.146],'Financing cash flow':[5.244,-49.382,40.196],'Capex':[38.135,49.359,42.596],'Depreciation':[37.277,38.217,39.237],'Amortization':[2.354,2.144,2.144],'Stock compensation':[0,14.219,13.737],'Buybacks':[0,.173,31.681]}.items():series([2005,2006,2007],metric,vals,2007,'82 / 84')
# Instant values from the relevant comparative balance sheets.
BS={
2000:[4.179,None,None,None,None,None,None,501.553,None,None,None,None,35.137,466.416],
2001:[1.998,40.754,37.383,83.360,169.547,None,None,314.287,2.653,22.820,0,0,26.626,287.661],
2002:[53.358,94.425,55.643,227.396,143.773,None,None,1346.912,45.350,147.627,.129,180.039,331.936,1014.976],
2003:[161.506,144.267,58.168,386.095,121.556,505.514,22.181,1090.668,50.369,136.816,41.681,275,417.493,673.175],
2004:[123.505,157.772,79.572,463.864,143.534,504.493,19.895,1168.806,73.405,181.251,50,230,417.183,751.623],
2005:[116.522,171.454,77.400,495.982,144.208,493.389,17.730,1187.843,72.276,158.235,50,230,395.279,792.564],
2006:[136.749,158.798,81.529,420.843,150.383,493.389,15.586,1090.496,73.071,175.620,50,179.335,361.403,729.093],
2007:[241.577,167.319,82.109,513.718,153.516,480.890,13.442,1189.908,56.417,197.223,99.335,200,403.561,786.347]}
BS[2008]=[225.104,146.710,103.791,494.656,173.360,483.671,19.746,1236.099,58.527,148.740,50,137.616,291.883,944.216]
bm=['Cash','Receivables','Inventory','Current assets','PP&E','Goodwill','Intangibles','Assets','Accounts payable','Current liabilities','Current debt','Long-term debt','Liabilities','Equity']
for y,vs in BS.items():
 report=2002 if y<=2002 else 2004 if y==2003 else 2005 if y<=2005 else 2007 if y<=2007 else 2009
 for m,v in zip(bm,vs):
  if v is not None:add(y,m,v,report,'25 / 67 / 72 / 83',typ='I')
# Quarterly data from annual-report quarterly footnotes. Early quarters are partial coverage.
add(2009,'Long-term debt',47.116,2009,80,'I')
Q={
2001:([85.496,57.503,51.045,66.407],[-7.020,-46.426,-12.414,14.808],[-53.964,-100.160,-142.425,-22.375],None,2002,48),
2002:([93.760,100.356,112.980,150.673],[15.954,29.433,20.063,60.711],[-34.297,-18.339,-181.945,-1.483],[None,None,-1.33,-.01],2002,48),
2003:([160.194,157.364,150.199,150.032],[67.320,65.968,58.444,55.117],[-396.348,-5.955,-6.186,-42.927],[-2.87,-.04,-.04,-.30],2004,99),
2004:([175.108,183.471,207.377,218.067],[69.568,72.204,83.784,87.660],[4.172,-9.421,13.030,14.631],[.03,-.06,.08,.09],2004,99),
2005:([220.160,190.505,191.532,190.174],[88.019,72.599,77.874,69.280],[13.917,1.244,7.389,3.061],[.09,.01,.05,.02],2005,99),
2006:([198.325,185.234,197.058,193.133],[74.723,69.350,73.347,45.259],[4.287,.926,3.005,-96.370],[.03,.01,.02,-.60],2007,113),
2007:([196.030,180.210,175.050,190.454],[75.316,68.702,68.632,74.735],[12.037,12.197,11.423,21.993],[.07,.08,.07,.14],2007,113),
2008:([210.533,201.708,215.210,232.566],[82.338,80.367,86.434,93.824],[19.078,16.673,20.466,54.789],[.12,.10,.12,.33],2009,118)}
Q[2009]=([210.228,172.990,191.213,228.146],[83.867,64.875,76.950,92.528],[22.024,-4.589,19.849,56.005],[.13,-.03,.12,.32],2009,118)
for y,(rev,gp,ni,eps,report,page) in Q.items():
 for m,vs in [('Revenue',rev),('Gross profit',gp),('Net income',ni),('Diluted EPS',eps)]:
  if vs:
   for q,v in enumerate(vs,1):
    if v is not None:add(y,m,v,report,page,'Q',q)
# Annual values absent in early XBRL facts.
for m,vs in {'Revenue':[860.017],'COGS':[517.054],'Gross profit':[342.963],'R&D':[146.013],'SG&A':[100.007],'Operating expenses':[252.592],'Operating income':[90.371],'Pretax income':[82.188],'Income tax':[-28.818],'Net income':[111.006],'Diluted EPS':[.68],'Diluted shares':[164.755],'Operating cash flow':[173.678],'Investing cash flow':[-94.959],'Financing cash flow':[-95.192],'Capex':[64.832],'Depreciation':[44.712],'Amortization':[6.933],'Stock compensation':[23.212],'Buybacks':[2.063]}.items():
 if not any(x['metric']==m and x['year']==2008 and x['type']=='A' for x in out):series([2008],m,vs,2009,'79 / 81')
# Deduplicate archived revisions: keep the last record for the same economic key.
out.append(dict(metric='Reported opening cash',year=2013,quarter=4,type='A',start='',end='',value=307.1,tag='2013 annual cash flow opening balance',filed='2013-11-18',source='https://investors.skyworksinc.com/node/18171/xbrl-viewer',detail='FY2013 consolidated cash flow statement: reported opening cash 307.1; differs from original FY2012 closing cash 306.293'))
for y,eps,ng in [(2021,1.95,2.62),(2022,1.88,3.02),(2023,1.52,2.20),(2024,.37,1.55),(2025,.94,1.76)]:
 for metric,value in [('Diluted EPS',eps),('Non-GAAP EPS',ng)]:
  out.append(dict(metric=metric,year=y,quarter=4,type='Q',start='',end='',value=value,tag='Earnings release',filed='',source=f'https://investors.skyworksinc.com/news-releases/news-release-details/skyworks-reports-q4-and-full-year-fy{str(y)[2:]}-results',detail=f'Q4 FY{y} final earnings release, per share'))
for q,eps in [(1,1.54),(2,1.15),(3,1.08)]:
 slug={1:'skyworks-delivers-strong-q1-fy26-performance-driven-mobile-and-broad',2:'skyworks-delivers-strong-second-quarter-fiscal-year-2026-results',3:'skyworks-delivers-solid-third-quarter-fiscal-year-2026-results'}[q]
 out.append(dict(metric='Non-GAAP EPS',year=2026,quarter=q,type='Q',start='',end='',value=eps,tag='Earnings release',filed='',source='https://investors.skyworksinc.com/news-releases/news-release-details/'+slug,detail='FY2026 earnings release, non-GAAP diluted EPS'))
for m,vs in {'Revenue':[860.017,802.577],'COGS':[517.054,484.357],'Gross profit':[342.963,318.220],'R&D':[146.013,123.996],'SG&A':[100.007,100.421],'Operating expenses':[252.592,246.517],'Operating income':[90.371,71.703],'Pretax income':[82.188,65.746],'Income tax':[-28.818,-27.543],'Net income':[111.006,93.289],'Diluted EPS':[.68,.55],'Diluted shares':[164.755,169.663],'Operating cash flow':[173.678,210.149],'Investing cash flow':[-94.959,-49.528],'Financing cash flow':[-95.192,-21.504],'Capex':[64.832,39.172],'Depreciation':[44.712,44.413],'Amortization':[6.933,6.118],'Stock compensation':[23.212,23.466],'Buybacks':[2.063,2.389]}.items():series([2008,2009],m,vs,2009,'79 / 81')
final={}
for x in out:final[(x['metric'],x['year'],x['quarter'],x['type'])]=x
out=sorted(final.values(),key=lambda x:(x['year'],x['quarter'],x['type'],x['metric']))
Path('model_data.json').write_text(json.dumps({'metrics':list(M),'instant':list(instant),'records':out}),encoding='utf8')
print('records',len(out))
for y in range(2000,2027):
 a={x['metric']:x['value'] for x in out if x['year']==y and x['type']=='A'}
 print(y,'annual revenue',a.get('Revenue'),'NI',a.get('Net income'),'OCF',a.get('Operating cash flow'),'annual metrics',len(a))
