/**
 * Created by gjrwcs on 3/21/2017.
 */

import * as path from 'path';

export function setAliases(projectRoot = '../') {
    // tslint:disable:no-var-requires
    const moduleAlias = require('module-alias');
    const tsconfig = require(`./tsconfig.json`);

    const base = path.resolve(__dirname, projectRoot);
    const paths = tsconfig.compilerOptions.paths;
    Object.keys(paths).forEach((moduleName) => {
        moduleAlias.addAlias(moduleName, path.resolve(base, paths[moduleName][0]));
    });

    require('module-alias/register');
    // tslint:enable:no-var-requires
}
