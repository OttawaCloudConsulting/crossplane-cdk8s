import * as fs from 'fs';
import * as yaml from 'yaml';

export function parseYamlConfig(filePath: string): any {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return yaml.parse(fileContent);
}

export function parseK8sTags(filePath: string): any {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return yaml.parse(fileContent);
}