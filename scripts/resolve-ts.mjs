import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export async function resolve(specifier, context, defaultResolve) {
  // Handle @/* alias
  if (specifier.startsWith('@/')) {
    const subpath = specifier.slice(2);
    const basePath = path.resolve(process.cwd(), 'src', subpath);
    const candidateTs = basePath + '.ts';
    const candidateTsx = basePath + '.tsx';
    const candidateIndex = path.join(basePath, 'index.ts');

    if (fs.existsSync(candidateTs)) {
      return defaultResolve(pathToFileURL(candidateTs).href, context);
    }
    if (fs.existsSync(candidateTsx)) {
      return defaultResolve(pathToFileURL(candidateTsx).href, context);
    }
    if (fs.existsSync(candidateIndex)) {
      return defaultResolve(pathToFileURL(candidateIndex).href, context);
    }
    return defaultResolve(pathToFileURL(basePath).href, context);
  }

  // Handle relative imports without extensions
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    if (context.parentURL && !specifier.endsWith('.ts') && !specifier.endsWith('.tsx') && !specifier.endsWith('.js') && !specifier.endsWith('.json')) {
      const parentPath = new URL(context.parentURL).pathname;
      const parentDir = path.dirname(parentPath);
      const basePath = path.resolve(parentDir, specifier);
      const candidateTs = basePath + '.ts';
      const candidateTsx = basePath + '.tsx';
      const candidateIndex = path.join(basePath, 'index.ts');

      if (fs.existsSync(candidateTs)) {
        return defaultResolve(pathToFileURL(candidateTs).href, context);
      }
      if (fs.existsSync(candidateTsx)) {
        return defaultResolve(pathToFileURL(candidateTsx).href, context);
      }
      if (fs.existsSync(candidateIndex)) {
        return defaultResolve(pathToFileURL(candidateIndex).href, context);
      }
    }
  }

  return defaultResolve(specifier, context);
}
