import vm from 'node:vm';
import path from 'node:path';
import {readFile} from 'node:fs/promises';

// Load the checked-in application module graph, including JSON, without a
// bundler or a second copy of the production station lookup implementation.
export async function loadAppModule(file) {
  const context = vm.createContext({Map, Set, RegExp, String, Object, Array});
  const modules = new Map();
  async function load(filename) {
    if (modules.has(filename)) return modules.get(filename);
    const source = await readFile(filename, 'utf8');
    const mod = filename.endsWith('.json')
      ? new vm.SyntheticModule(['default'], function () {
        this.setExport('default', JSON.parse(source));
      }, {context})
      : new vm.SourceTextModule(source, {context, identifier: filename});
    modules.set(filename, mod);
    await mod.link(name => load(path.resolve(path.dirname(filename), /\.(json|m?js)$/.test(name) ? name : name + '.js')));
    return mod;
  }
  const mod = await load(path.resolve(file));
  await mod.evaluate();
  return mod.namespace;
}
