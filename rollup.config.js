// @ts-check
import dts from 'rollup-plugin-dts';
import { transpileModule } from 'typescript';
import tsconfig from './tsconfig.json';
import pkg from './package.json';

/**
 * @param {boolean} isESM
 * @returns {import('rollup').OutputOptions}
 */
function output(isESM) {
	return {
		format: isESM ? 'esm': 'cjs',
		file: pkg.exports['.'][isESM ? 'import' : 'require'],
		preferConst: true,
		esModule: false,
		freeze: false,
		strict: true,
	};
}

/**
 * @type {import('rollup').RollupOptions}
 */
const source = {
	input: 'src/index.ts',
	output: [
		output(true),
		output(false),
	],
	external: [
		...Object.keys(pkg.dependencies),
	],
	plugins: [
		{
			name: 'typescript',
			transform(code, file) {
				if (!/\.ts$/.test(file)) return code;
				// @ts-ignore
				let output = transpileModule(code, {
					...tsconfig, fileName: file
				});
				return {
					code: output.outputText,
					map: output.sourceMapText || null
				};
			}
		}
	]
}

/**
 * @type {import('rollup').RollupOptions}
 */
const types = {
	input: 'src/index.ts',
	output: {
		file: pkg.types,
		format: 'esm'
	},
	plugins: [
		dts()
	],
}

// Multiple Rollup configs
export default [types, source];
