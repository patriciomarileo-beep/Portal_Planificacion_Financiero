import json, os
from collections import defaultdict
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak

ROOT=os.path.dirname(os.path.dirname(__file__))
with open(os.path.join(ROOT,"tmp","importaciones-h1-all.json"),encoding="utf-8-sig") as f: data=json.load(f)
OUT=os.path.join(ROOT,"output","pdf","Importaciones_Industria_H1_2026.pdf")
NAVY=colors.HexColor("#08265f"); LIGHT=colors.HexColor("#dfe5ee"); BLUE=colors.HexColor("#164a96")
years=[2023,2024,2025,2026]
styles=getSampleStyleSheet()
doc=SimpleDocTemplate(OUT,pagesize=landscape(A4),rightMargin=22,leftMargin=22,topMargin=20,bottomMargin=18)
story=[]
def fmt(v): return f"{round(v):,}".replace(",",".")
def pct(v): return f"{v*100:.1f}%".replace(".",",")
def title(main,sub="H1 2026"):
    story.extend([Paragraph(f"<b>{main}</b>",styles['Title']),Paragraph(sub,styles['Heading3']),Spacer(1,8)])
def table(rows,widths=None,font=6.5):
    t=Table(rows,colWidths=widths,repeatRows=2)
    commands=[('BACKGROUND',(0,0),(-1,0),NAVY),('TEXTCOLOR',(0,0),(-1,0),colors.white),('FONTNAME',(0,0),(-1,1),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),font),('ALIGN',(1,0),(-1,-1),'RIGHT'),('GRID',(0,1),(-1,-1),.25,colors.HexColor('#b9c2cf')),('ROWBACKGROUNDS',(0,2),(-1,-2),[colors.white,colors.HexColor('#f4f6f9')]),('BACKGROUND',(0,-1),(-1,-1),LIGHT),('FONTNAME',(0,-1),(-1,-1),'Helvetica-Bold'),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('TOPPADDING',(0,0),(-1,-1),2),('BOTTOMPADDING',(0,0),(-1,-1),2)]
    if len(rows[0])==17: commands += [('SPAN',(1,0),(8,0)),('SPAN',(9,0),(16,0)),('ALIGN',(1,0),(16,0),'CENTER')]
    t.setStyle(TableStyle(commands))
    story.append(t)
def matrix(name,rows,item_key='item',limit=None):
    grouped=defaultdict(lambda:defaultdict(lambda:[0,0]))
    for r in rows: grouped[str(r[item_key])][int(r['anio'])]=[float(r.get('cantidad') or 0),float(r.get('us_fob') or 0)]
    items=list(grouped)
    if limit: items=sorted(items,key=lambda x:grouped[x][2026][1],reverse=True)[:limit]
    items=sorted(items,key=lambda x:(x.upper() in ('OTROS','SIN CLASIFICACIÓN','SIN CLASIFICACION'),-grouped[x][2026][1]))
    header1=[name,"UNIDADES"]+[""]*7+["VALORIZADO US$ FOB"]+[""]*7
    header2=[name]+sum(([str(y),'%'] for y in years),[])+sum(([str(y),'%'] for y in years),[])
    totals={y:[sum(grouped[i][y][0] for i in items),sum(grouped[i][y][1] for i in items)] for y in years}
    body=[]
    for i in items:
        body.append([i]+sum(([fmt(grouped[i][y][0]),pct(grouped[i][y][0]/totals[y][0]) if totals[y][0] else '-'] for y in years),[])+sum(([fmt(grouped[i][y][1]),pct(grouped[i][y][1]/totals[y][1]) if totals[y][1] else '-'] for y in years),[]))
    body.append(['TOTAL']+sum(([fmt(totals[y][0]),'100%'] for y in years),[])+sum(([fmt(totals[y][1]),'100%'] for y in years),[]))
    table([header1,header2]+body,[92]+[38,24]*8,5.2)

title("IMPORTACIONES INDUSTRIA RETAIL","H1 2026 - Enero a junio")
ov=data['overview']; story.append(Spacer(1,35)); table([["PERÍODO","UNIDADES","US$ FOB","FOB UNITARIO"],["H1 2026",fmt(float(ov['cantidad'])),fmt(float(ov['us_fob'])),f"US$ {float(ov['fob_unitario']):.2f}"]],[150,150,150,150],12)
story.append(PageBreak())
title("SEGMENTOS")
seg=[]
for r in data['segmentAnalysis']: seg.append({**r,'item':f"{r['item']} - {r['clase']}"})
matrix("SEGMENTO / CLASE",seg)
for cls,label in [("CALZADO","CALZADO"),("VESTUARIO","VESTUARIO")]:
    story.append(PageBreak()); title(label,"Evolución mensual H1")
    rows=[]
    names=['Enero','Febrero','Marzo','Abril','Mayo','Junio']
    for r in data['classMonth']:
        if r['clase']==cls and int(r['item'])<=6: rows.append({**r,'item':names[int(r['item'])-1]})
    matrix("MES",rows)
    story.append(PageBreak()); title(f"IMPORTACIONES INDUSTRIA - {label}","Importador - H1 2026")
    matrix("IMPORTADOR",[r for r in data['importerClass'] if r['clase']==cls],limit=24)
doc.build(story)
print(OUT)
