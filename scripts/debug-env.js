const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const content = fs.readFileSync(envPath, 'utf8');

console.log('File content length:', content.length);
console.log('\nRaw content:');
console.log(content);
console.log('\n---\n');

const lines = content.split('\n');
console.log('Number of lines:', lines.length);

lines.forEach((line, i) => {
  if (line.includes('ANON_KEY')) {
    console.log(`Line ${i}:`, line);
    console.log('Line length:', line.length);
    const parts = line.split('=');
    console.log('Key:', parts[0]);
    console.log('Value length:', parts[1] ? parts[1].length : 0);
  }
});
