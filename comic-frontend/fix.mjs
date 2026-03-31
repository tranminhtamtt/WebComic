import fs from 'fs';
import path from 'path';

const searchFolder = './src';

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Fix the broken literal ${import.meta.env.VITE_API_BASE_URL} + 'string'
    // By replacing it with import.meta.env.VITE_API_BASE_URL + 'string'
    content = content.replace(/\$\{import\.meta\.env\.VITE_API_BASE_URL\}\s*\+\s*/g, 'import.meta.env.VITE_API_BASE_URL + ');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed: ${filePath}`);
    }
}

function traverseDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        let fullPath = path.join(dir, file);
        if (fs.lstatSync(fullPath).isDirectory()) {
            traverseDir(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            processFile(fullPath);
        }
    });
}

traverseDir(searchFolder);
console.log("Fix completed.");
