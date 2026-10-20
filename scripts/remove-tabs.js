const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '../src/app/social-media');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Remove imports
  content = content.replace(/import SocialMediaTabs from '@\/components\/social-media\/SocialMediaTabs';\r?\n?/g, '');
  content = content.replace(/import WorkspaceTabs from '@\/components\/social-media\/WorkspaceTabs';\r?\n?/g, '');

  // Remove the tabs from JSX
  content = content.replace(/\s*<SocialMediaTabs \/>\r?\n?/g, '\n');
  content = content.replace(/\s*<WorkspaceTabs user=\{user\} \/>\r?\n?/g, '\n');

  // Replace wrapper
  // from: <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)' }}>
  // to: <>
  content = content.replace(/<div className="glass-panel" style=\{\{ display: 'flex', flexDirection: 'column', minHeight: 'calc\(100vh - 64px\)' \}\}>/, '<>');

  // We need to replace the last closing </div> with </>
  if (content !== originalContent) {
    const lastDivIndex = content.lastIndexOf('</div>');
    if (lastDivIndex !== -1) {
      content = content.substring(0, lastDivIndex) + '</>' + content.substring(lastDivIndex + 6);
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Processed', filePath);
  }
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

traverseDir(directoryPath);
