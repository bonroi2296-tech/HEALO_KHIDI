import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const errs=[];
for (const p of ["","/about","/treatments","/doctors","/international","/contact"]) {
  const page = await b.newPage({ viewport:{width:1440,height:900} });
  page.on("pageerror", e=>errs.push(p+": "+String(e).slice(0,110)));
  const res = await page.goto("http://localhost:3200/demo/hospital"+p,{waitUntil:"networkidle",timeout:200000});
  const txt = await page.evaluate(()=>document.body.innerText);
  const bad = res.status()!==200 || /Application error|Unhandled Runtime|could not be found/i.test(txt.slice(0,400));
  await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=500){window.scrollTo(0,y);await new Promise(k=>setTimeout(k,80));}});
  await page.waitForTimeout(900);
  const m = await page.evaluate(()=>({
    폼: document.querySelectorAll('form input[name], form textarea').length,
    금액: (document.body.innerText.match(/[0-9]{2,3},[0-9]{3}원|₩[0-9]/g)||[]).length,
    사진: [...document.querySelectorAll("img")].filter(i=>i.complete&&i.naturalWidth>0).length+"/"+document.querySelectorAll("img").length,
    hw:(document.body.innerText.match(/healwith|힐위드/gi)||[]).length}));
  console.log(`${(p||"/홈").padEnd(16)} ${res.status()} ${bad?"❌":"ok"} 폼칸=${m.폼} 금액=${m.금액} 사진=${m.사진} healwith=${m.hw}`);
  await page.close();
}
console.log("JS오류:", errs.length?errs:"없음");
await b.close();
