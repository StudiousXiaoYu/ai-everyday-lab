/* Optional maintenance script. The generated data file is already committed. */
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..','knowledge');
const files=fs.readdirSync(path.join(root,'materials')).filter(f=>f.endsWith('.md')).sort();
const documents=files.map(file=>{const raw=fs.readFileSync(path.join(root,'materials',file),'utf8').replace(/^\uFEFF/,'');const match=raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);if(!match)throw Error(`Missing metadata: ${file}`);const meta={};for(const line of match[1].split(/\r?\n/)){const i=line.indexOf(':');if(i>0)meta[line.slice(0,i).trim()]=line.slice(i+1).trim();}for(const key of ['id','title','category'])if(!meta[key])throw Error(`Missing ${key}: ${file}`);return{id:meta.id,title:meta.title,category:meta.category,tags:(meta.tags||'').split(',').map(x=>x.trim()).filter(Boolean),file:`materials/${file}`,content:raw.slice(match[0].length).trim()};});
if(new Set(documents.map(d=>d.id)).size!==documents.length)throw Error('Duplicate document IDs');
fs.writeFileSync(path.join(root,'kb-data.js'),'/* Generated from materials/*.md by scripts/build-knowledge.cjs. No network request. */\nwindow.KB_DOCUMENTS = '+JSON.stringify(documents,null,2)+';\n');
console.log(`Bundled ${documents.length} Markdown documents.`);
