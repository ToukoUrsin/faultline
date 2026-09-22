import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
for (const name of ['index.html','style.css','app.js','scenario.js','THIRD-PARTY-NOTICES.txt','assets/faultline.wasm']) {
  await fs.mkdir(path.dirname(path.join(root,'docs',name)),{recursive:true});
  await fs.copyFile(path.join(root,'web',name),path.join(root,'docs',name));
}
await fs.writeFile(path.join(root,'docs','.nojekyll'),'');
console.log('Synchronized the static Pages artifact into docs/.');
