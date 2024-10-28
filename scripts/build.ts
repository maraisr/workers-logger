// Credit @lukeed https://github.com/lukeed/empathic/blob/main/scripts/build.ts

// Publish:
//   -> edit package.json version
//   -> edit deno.json version
//   $ git commit "release: x.x.x"
//   $ git tag "vx.x.x"
//   $ git push origin main --tags
//   #-> CI builds w/ publish

import oxc from 'npm:oxc-transform@^0.30';
import { parseAsync } from 'npm:oxc-parser@^0.34';
import MagicString from 'npm:magic-string';
import { join, resolve } from '@std/path';
import { type ESTreeMap, walk } from 'npm:astray@1.1.1';

import denoJson from '../deno.json' with { type: 'json' };

const outdir = resolve('npm');

let Inputs;
if (typeof denoJson.exports === 'string') Inputs = { '.': denoJson.exports };
else Inputs = denoJson.exports;

async function transform(name: string, filename: string) {
	if (name === '.') name = 'index';
	name = name.replace(/^\.\//, '');

	let entry = resolve(filename);
	let source = await Deno.readTextFile(entry);

	let xform = oxc.transform(entry, source, {
		typescript: {
			onlyRemoveTypeImports: true,
			declaration: {
				stripInternal: true,
			},
		},
	});

	if (xform.errors.length > 0) bail('transform', xform.errors);

	// ESM -> CJS
	let s = new MagicString(xform.code);
	let AST = await parseAsync(xform.code).then((x) => x.program);

	type Location = {
		start: number;
		end: number;
	};

	// Again, thanks @lukeed: https://github.com/lukeed/polka/blob/895ffb96945c4d40e62205bfc6897f5bfc76700e/scripts/build.ts#L47
	walk(AST.body, {
		ImportDeclaration(n) {
			let { start, end } = n as unknown as Location;
			let src = n.source as unknown as {
				type: 'StringLiteral';
				value: string;
				start: number;
				end: number;
			};

			let from = src.value;
			if (from.startsWith('node:')) {
				from = from.substring(5);
			}

			let $locals: string[] = [];
			let $default: string | undefined;

			let i = 0, arr = n.specifiers;
			let tmp: typeof arr[number];

			for (; i < arr.length; i++) {
				tmp = arr[i];

				switch (tmp.type) {
					case 'ImportDefaultSpecifier':
					case 'ImportNamespaceSpecifier': {
						if ($default) throw new Error('Double `default` exports!');
						$default = tmp.local.name;
						break;
					}

					case 'ImportSpecifier': {
						let { imported, local } = tmp;
						if (imported.name !== local.name) {
							$locals.push(`${imported.name}: ${local.name}`);
						} else {
							$locals.push(local.name);
						}
						break;
					}
				}
			}

			let stmt = 'const ';
			if ($default) {
				stmt += $default;
			}
			if ($locals.length > 0) {
				if ($default) stmt += ', ';
				stmt += '{ ' + $locals.join(', ') + ' }';
			}

			let qq = s.snip(src.start, src.start + 1);
			stmt += ` = require(${qq + from + qq});`;
			s.overwrite(start, end, stmt);
		},
		ExportDefaultDeclaration(n) {
			let start = (n as unknown as Location).start;
			s.overwrite(start, start + 'export default'.length, 'module.exports =');
		},
		ExportNamedDeclaration(n) {
			let { start, end } = n as unknown as Location;
			let type = n.declaration?.type;
			let key: string | undefined;

			// TODO: Handle re-exports
			if (n.type === 'ExportNamedDeclaration' && type == null) {
				let src = n.source as unknown as {
					type: 'StringLiteral';
					value: string;
					start: number;
					end: number;
				};

				let from = src.value;

				let i = 0, arr = n.specifiers;
				let tmp: typeof arr[number];

				let $locals: string[] = [];
				let $exports: string[] = [];

				for (; i < arr.length; i++) {
					tmp = arr[i];

					let { local, exported } = tmp;
					let lcl = `__CJS_${exported.name}`;
					$locals.push(`${local.name}: ${lcl}`);
					$exports.push(`${exported.name} = ${lcl}`);
				}

				invariant($locals.length > 0, 'No locals found');

				let stmt = 'const ';
				stmt += '{ ' + $locals.join(', ') + ' }';

				let qq = s.snip(src.start, src.start + 1);
				stmt += ` = require(${qq + from + qq});`;
				for (i = 0; i < $exports.length; i++) {
					stmt += `\nexports.${$exports[i]};`;
				}
				s.overwrite(start, end, stmt);

				return;
			}

			if (type === 'FunctionDeclaration') {
				key = (n.declaration as ESTreeMap['FunctionDeclaration']).id?.name;
			} else if (type === 'VariableDeclaration') {
				let decl = (n.declaration as ESTreeMap['VariableDeclaration']).declarations.find((d) =>
					d.type === 'VariableDeclarator'
				);
				key = (decl?.id as ESTreeMap['Identifier'])?.name;
			}

			if (!key) console.log('EXPORT NAMED TYPE?', n);

			if (key) {
				s.remove(start, start + 'export '.length);
				s.append(`\nexports.${key} = ${key};`);
			}
		},
	});

	write(`${name}.d.ts`, xform.declaration!);
	write(`${name}.mjs`, xform.code);
	write(`${name}.js`, s.toString());
}

console.log('! cleaning "npm" directory');
await new Deno.Command('git', {
	args: ['clean', '-xfd', outdir],
	stderr: 'inherit',
}).output();

for (let [name, filename] of Object.entries(Inputs)) await transform(name, filename);

await copy('readme.md');
await copy('license');

// ---

function bail(label: string, errors: string[]): never {
	console.error('[%s] error(s)\n', label, errors.join(''));
	Deno.exit(1);
}

function exists(path: string) {
	try {
		Deno.statSync(path);
		return true;
	} catch (_) {
		return false;
	}
}

function copy(file: string) {
	if (exists(file)) {
		let outfile = join(outdir, file);
		console.log('> writing "%s" file', outfile);
		return Deno.copyFile(file, outfile);
	}
}

function write(fname: string, content: string) {
	let outfile = join(outdir, fname);
	console.log('> writing "%s" file', outfile);
	return Deno.writeTextFile(outfile, content);
}

function invariant(condition: boolean, message?: string) {
	if (!condition) throw new Error(message);
}
