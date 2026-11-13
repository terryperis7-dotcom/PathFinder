import re,glob,subprocess,sys,os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
from html.parser import HTMLParser
VOID={'meta','link','br','img','input','hr','source','area','base','col','embed','param','track','wbr'}
class P(HTMLParser):
    def __init__(s): super().__init__(); s.stack=[]; s.err=[]
    def handle_starttag(s,t,a):
        if t not in VOID: s.stack.append((t,s.getpos()[0]))
    def handle_startendtag(s,t,a): pass
    def handle_endtag(s,t):
        if t in VOID: return
        if not s.stack: s.err.append(f"stray </{t}> line {s.getpos()[0]}"); return
        if s.stack[-1][0]==t: s.stack.pop(); return
        # try to find
        for i in range(len(s.stack)-1,-1,-1):
            if s.stack[i][0]==t:
                s.err.append(f"unclosed <{s.stack[-1][0]}> (line {s.stack[-1][1]}) before </{t}> line {s.getpos()[0]}"); del s.stack[i:]; return
        s.err.append(f"stray </{t}> line {s.getpos()[0]}")
bad=0
import tempfile
TMP=tempfile.mkdtemp()
for f in sorted(glob.glob('**/*.html',recursive=True)):
    s=open(f,encoding='utf-8').read()
    p=P(); p.feed(s)
    errs=p.err+[f"unclosed <{t}> line {l}" for t,l in p.stack]
    if errs: print("HTML",f,errs[:4]); bad+=1
    for i,m in enumerate(re.finditer(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>',s,re.S)):
        out=f"{TMP}/{f.replace('/','_')}_{i}.js"; open(out,'w').write(m.group(1))
        r=subprocess.run(['node','--check',out],capture_output=True,text=True)
        if r.returncode: print("JS SYNTAX",f,i,r.stderr.splitlines()[:4]); bad+=1
for f in glob.glob('assets/js/*.js')+['sw.js']:
    r=subprocess.run(['node','--check',f],capture_output=True,text=True)
    if r.returncode: print("JS SYNTAX",f,r.stderr.splitlines()[:4]); bad+=1
print("problems:",bad)
sys.exit(1 if bad else 0)
