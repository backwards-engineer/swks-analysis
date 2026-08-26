import urllib.request,json,pathlib,time,concurrent.futures
root=pathlib.Path('sources');root.mkdir(exist_ok=True)
def get(url,path):
 try:
  data=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'FinancialResearch/1.0 analyst@example.com'}),timeout=45).read(); pathlib.Path(path).write_bytes(data); return (url,len(data))
 except Exception as e:return (url,str(e))
jobs=[('https://data.sec.gov/submissions/CIK0000004127.json',root/'submissions.json'),('https://investors.skyworksinc.com/annual-reports-and-proxies',root/'annual.html'),('https://investors.skyworksinc.com/news-releases',root/'news.html')]
jobs += [(f'https://www.annualreports.com/HostedData/AnnualReportArchive/s/NASDAQ_SWKS_{y}.pdf',root/f'annual_{y}.pdf') for y in range(2002,2010)]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
 for r in ex.map(lambda j:get(*j),jobs):print(r)
