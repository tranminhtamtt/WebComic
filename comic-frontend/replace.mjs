import fs from 'fs';
import path from 'path';

const searchFolder = './src';
const searchPhrase = /http:\/\/localhost:8080\/api/g;
const replacePhrase = "${import.meta.env.VITE_API_BASE_URL}"; // Will be used in template literals, or fallback to + if strings
const envVariable = 'import.meta.env.VITE_API_BASE_URL';

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;

    // Pattern for template strings
    const pattern1 = /\`([^`]*?)http:\/\/localhost:8080\/api([^`]*?)\`/g;
    content = content.replace(pattern1, (match, prefix, suffix) => {
        hasChanges = true;
        return `\`${prefix}\${import.meta.env.VITE_API_BASE_URL}${suffix}\``;
    });

    // Pattern for single/double quote strings (like '"http://localhost:8080/api/..."')
    const pattern2 = /(['"])http:\/\/localhost:8080\/api(.*?)(\1)/g;
    content = content.replace(pattern2, (match, quote, suffix) => {
        hasChanges = true;
        return `\${import.meta.env.VITE_API_BASE_URL} + ${quote}${suffix}${quote}`;
    });
    
    // Pattern for standalone 'http://localhost:8080/api'
    const pattern3 = /['"]http:\/\/localhost:8080\/api['"]/g;
    content = content.replace(pattern3, () => {
        hasChanges = true;
        return `import.meta.env.VITE_API_BASE_URL`;
    });

    if (hasChanges) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
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
console.log("Replacement completed.");
