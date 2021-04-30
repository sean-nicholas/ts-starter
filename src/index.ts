#!/usr/bin/env node

import * as childProcess from 'child_process'
import { stripIndent } from 'common-tags'
import * as fs from 'fs'
import { join } from 'path'
import { promisify } from 'util'

const writeFile = promisify(fs.writeFile)
const readFile = promisify(fs.readFile)
const mkdir = promisify(fs.mkdir)
const exec = promisify(childProcess.exec)

const prettierContent = stripIndent`
  {
    "semi": false,
    "singleQuote": true,
    "trailingComma": "es5",
    "arrowParens": "always"
  }
`

const gitignoreContent = stripIndent`
  node_modules
  dist
`

const jestConfigContent = stripIndent`
  module.exports = {
    roots: ['<rootDir>/src'],
    transform: {
      '^.+\\.tsx?$': 'ts-jest',
    },
  }
`

const tsConfigContent = stripIndent`
  {
    "compileOnSave": false,
    "compilerOptions": {
      "outDir": "./dist",
      "sourceMap": true,
      "declaration": false,
      "moduleResolution": "node",
      "module": "commonjs",
      "emitDecoratorMetadata": true,
      "experimentalDecorators": true,
      "target": "es2017",
      "typeRoots": [
        "./node_modules/@types"
      ]
    }
  }
`

async function run() {
  console.log('npm init')
  await exec('npm init --yes')

  console.log('npm install (may take a while)')
  await exec(
    'npm install --save-dev typescript ts-node jest ts-jest @types/node @types/jest prettier'
  )

  console.log('Creating files & folders')
  await Promise.all([
    writeFile(join(process.cwd(), '.prettierrc'), prettierContent),
    writeFile(join(process.cwd(), '.gitignore'), gitignoreContent),
    writeFile(join(process.cwd(), 'jest.config.js'), jestConfigContent),
    writeFile(join(process.cwd(), 'tsconfig.json'), tsConfigContent),
    mkdir(join(process.cwd(), 'src')).then(() =>
      writeFile(join(process.cwd(), 'src', 'index.ts'), '')
    ),
  ])

  console.log('Updating package.json scripts')
  await updatingPackageJson()

  console.log('Running prettier')
  await exec('npx prettier --write .')
}

async function updatingPackageJson() {
  const path = join(process.cwd(), 'package.json')
  const content = await readFile(path)
  const parsed = JSON.parse(content.toString())
  const newParsed = {
    ...parsed,
    main: 'dist/index.js',
    scripts: {
      start: 'node dist/index.js',
      'start-dev': 'ts-node src/index.ts',
      test: 'jest',
      'test-dev': 'jest --watch',
      build: 'tsc --project tsconfig.json',
    },
  }
  const newContent = JSON.stringify(newParsed)
  await writeFile(path, newContent)
}

run()
  .catch((err) => console.log('Error', err))
  .then(() => console.log('Done'))
