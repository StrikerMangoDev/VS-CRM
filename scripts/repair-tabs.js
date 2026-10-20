const fs = require('fs');
const path = require('path');

const socialMediaPath = path.join(__dirname, '../src/app/social-media');
const salesPath = path.join(__dirname, '../src/app/(sales)');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix the opening <div className="glass-panel" ... >
  content = content.replace(/<div className="glass-panel"[^>]*>/, '<>');

  // Also remove WorkspaceTabs just in case it missed some imports or tags
  content = content.replace(/import WorkspaceTabs from '@\/components\/social-media\/WorkspaceTabs';\r?\n?/g, '');
  content = content.replace(/\s*<WorkspaceTabs[^>]*\/>\r?\n?/g, '\n');

  // Now, if it starts with <> but doesn't end with </>, it means we didn't replace the last </div>
  // Wait, the previous script might have replaced the last </div> with </> but missed the first <div...
  // So now the first one is <> and the last one is </>. That's actually correct!
  
  // What if the previous script didn't change the last </div>?
  // Let's ensure the last closing tag is </> if the first is <>
  const lastDivIndex = content.lastIndexOf('</div>');
  const lastFragIndex = content.lastIndexOf('</>');
  
  // if last closing is </div> but we have <>, let's just make it </>
  // Actually, wait, it's safer to ensure we have balanced fragments.
  // We can just rely on the fact that if it has <>, it should end with </>.
  if (lastDivIndex > lastFragIndex && content.includes('<>')) {
     // replace last </div> with </>
     content = content.substring(0, lastDivIndex) + '</>' + content.substring(lastDivIndex + 6);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Repaired', filePath);
}

function traverseDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverseDir(fullPath);
    } else if (file === 'page.tsx') {
      processFile(fullPath);
    }
  }
}

traverseDir(socialMediaPath);
traverseDir(salesPath);
