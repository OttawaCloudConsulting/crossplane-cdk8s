import * as yaml from 'yaml';
import * as fs from 'fs';

export class AWSTagsYaml {

  public readonly tags: Array<{ key: string, value: string }>

  constructor(fileName: string) {
    const file = fs.readFileSync(fileName, 'utf8');
    const config_raw = yaml.parse(file);
    this.tags = config_raw.tags;
  }
}

export class K8sTagsYaml {

  public readonly tags: Array<{ key: string, value: string }>

  constructor(fileName: string) {
    const file = fs.readFileSync(fileName, 'utf8');
    const config_raw = yaml.parse(file);
    this.tags = config_raw.tags;
  }
}