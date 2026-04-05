const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src', 'pages');
const filesToUpdate = fs.readdirSync(directoryPath).filter(f => f.endsWith('.tsx'));
filesToUpdate.push('../App.tsx'); // Add App.tsx

for (const file of filesToUpdate) {
  const fullPath = path.join(directoryPath, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace(/http:\/\/localhost:5000/g, 'https://lemon-alpha.vercel.app');
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
