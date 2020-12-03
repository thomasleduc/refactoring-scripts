const path = require('path');
const fs = require('fs-extra');
const glob = require('glob');
const chalk = require('chalk');
const ora = require('ora');
const {execSync} = require('child_process');

const rootFolderPath = process.argv[2];
const pwd = process.cwd();
const targetFolder = `${pwd}/${rootFolderPath}`;


if (!rootFolderPath) {
  console.log(chalk.blue.bgRed.bold('You should put a first arg'));
  return 1;
}

console.log('Convert all the files ' + chalk.blue(targetFolder) + '/**/Component/index.tsx => ' + chalk.blue(targetFolder) + '/**/Component/Component.tsx');

const goTroughFolder = (callback) => {
  glob.sync('**/*/index.tsx', {cwd: targetFolder}).map(callback);
}

const changeImport = (parentFolderName, componentName) => (currentFile) => {
  const content = fs.readFileSync(currentFile).toString();
  const regex = new RegExp(`from '(.*)/${parentFolderName}';`, 'g');

  fs.writeFileSync(currentFile, content.replace(regex, `from '$1/${parentFolderName}/${componentName}';`), 'utf8');
}

const handleFile = async (fileName) => {
  const realFileName = path.join(targetFolder, fileName);
  const content = fs.readFileSync(realFileName).toString();
  const match = content.match(/export default ([A-Z].*);/);
  let componentName = match && match[1];
  const parentFolderName = path.dirname(realFileName).split(path.sep).pop();

  if (!match || !componentName) {
    if (/[A-Z]\w*/.test(parentFolderName)) {
      console.log(chalk.magenta('export default component Name not found, fallback on dirname'), parentFolderName);
      componentName = parentFolderName;
    } else {
      console.log(chalk.blue.bgRed.bold('Could not find any regular component name.'));
    }
  }

  const spinner = ora('Replace the import in ' + realFileName).start();

  const componentFileName = realFileName.replace('index.tsx', componentName + '.tsx');

  // Go trough all file and change import relative path.

  glob.sync('**/*.{ts,tsx}', {cwd: targetFolder})
    .map((fileName) => changeImport(parentFolderName, componentName)(path.join(targetFolder, fileName)));

  spinner.stop();

  const spinner2 = ora('git mv ' + realFileName).start();
  execSync(`git mv ${realFileName} ${componentFileName}`);
  spinner2.stop();
};

goTroughFolder(handleFile);
