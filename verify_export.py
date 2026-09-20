import zipfile,xml.etree.ElementTree as E,pathlib,json
p=pathlib.Path('outputs/swks_20261020/Skyworks_Financial_Model.xlsx');z=zipfile.ZipFile(p)
n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
w=E.fromstring(z.read('xl/workbook.xml'))
print('Sheets:',[x.attrib['name'] for x in w.find('s:sheets',n)])
errors=[]; formulas=0
for name in z.namelist():
 if name.startswith('xl/worksheets/sheet') and name.endswith('.xml'):
  tree=E.fromstring(z.read(name))
  formulas+=len(tree.findall('.//s:f',n))
  for c in tree.findall('.//s:c',n):
   if c.attrib.get('t')=='e':errors.append((name,c.attrib['r']))
print('Saved formula errors:',errors,'Formulas:',formulas)
assert not errors
charts=[x for x in z.namelist() if '/charts/chart' in x and x.endswith('.xml')]
assert len(charts)==1
print('Charts:',len(charts))
print('File bytes:',p.stat().st_size)
annual=E.fromstring(z.read('xl/worksheets/sheet4.xml'))
cells={c.attrib['r']:c.find('s:v',n).text for c in annual.findall('.//s:c',n) if c.find('s:v',n) is not None}
assert abs(float(cells['D6'])-112.271)<1e-9
print('FY1998 revenue verified:',cells['D6'])
audit=json.load(open('outputs/swks_20261020/audit.json'))
assert not [(r[0],v) for r in audit for v in r[1:7] if isinstance(v,(int,float)) and abs(v)>.11]
print('All available reconciliations within $0.11M tolerance.')
