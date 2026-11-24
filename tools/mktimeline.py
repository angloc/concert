import os
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
open(R+"/build/timeline.js","w").write("window.BIDE=window.BIDE||{};BIDE.timeline="+open(R+"/build/timeline.json").read()+";")
