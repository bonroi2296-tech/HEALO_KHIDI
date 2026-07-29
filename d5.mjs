import { chromium } from "playwright";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
async function viaCurl(url){
  const {stdout}=await exec("curl",["-sS","-L","--max-time","25","--compressed","-A","Mozilla/5.0 Chrome/120 Safari/537.36","-w","\\n@@S:%{http_code}@@C:%{content_type}@@","-o","-",url],{maxBuffer:80*1024*1024,encoding:"buffer"});
  const s=stdout.toString("latin1"); const i=s.lastIndexOf("\n@@S:");
  if(i<0) return {status:200,ct:"text/html",body:stdout};
  const m=s.slice(i).match(/@@S:(\d+)@@C:([^@]*)@@/);
  return {status:Number(m?.[1]||200),ct:(m?.[2]||"").trim()||"text/html",body:stdout.subarray(0,i)};
}
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const [name,host] of [["황이준","www"],["배길준","km"],["유형진","sc"],["강주안","sd"]]) {
  const page = await b.newPage({ viewport:{width:1400,height:1000} });
  await page.route("**/*", async r => { const u=r.request().url();
    if(!/^https?:/.test(u)) return r.continue();
    try{const x=await viaCurl(u); await r.fulfill({status:x.status,contentType:x.ct,body:x.body});}catch{await r.abort();} });
  const h = host==="www" ? "immunehospital.com" : host+".immunehospital.com";
  try{
    await page.goto(`https://${h}/pages/hospital/doctor.php`,{waitUntil:"domcontentloaded",timeout:120000});
    await page.waitForTimeout(5000);
    // 그 이름이 적힌 카드 안의 <img> 를 찾는다
    const src = await page.evaluate((nm)=>{
      const el=[...document.querySelectorAll("*")].find(e=>e.children.length===0 && e.textContent.trim()===nm);
      if(!el) return null;
      let p=el; for(let i=0;i<6&&p;i++){ const img=p.querySelector?.("img"); if(img) return img.src; p=p.parentElement; }
      return null;
    }, name);
    console.log(`${name}: ${src ? src.replace(/^https?:\/\/[^/]+/,'') : "(사진 못 찾음)"}`);
  }catch(e){console.log(name,"실패",String(e).slice(0,60));}
  await page.close();
}
await b.close();
