/* eslint-disable no-console */
import { resolve } from 'node:path'
import { writeFileSync } from 'node:fs'
import { printColorLogs, printErrorLogs, printSuccessLogs } from '@winches/utils'
import { transformPath } from 'vue-o2c'
import { parse } from '@vue/compiler-dom'
import type { Config } from 'prettier'
import { format } from 'prettier'

const defaultBanner = 'all are created with Typescript'
const gradientBanner = printColorLogs(defaultBanner)
const prettierConfig: Config = {
  printWidth: 9999,
  arrowParens: 'avoid',
  bracketSpacing: true,
  endOfLine: 'lf',
  bracketSameLine: false,
  quoteProps: 'as-needed',
  semi: false,
  singleQuote: true,
  tabWidth: 4,
  trailingComma: 'none',
  useTabs: false,
  vueIndentScriptAndStyle: false,
  overrides: [
    {
      files: '*.md',
      options: {
        embeddedLanguageFormatting: 'off',
      },
    },
  ],
}

export async function start(options: { path: string; output?: string; syntax?: boolean }) {
  console.log()
  // 如果标准输出处于交互式终端模式，并且终端支持至少 24 位
  console.log(
    (process.stdout.isTTY && process.stdout.getColorDepth() > 8)
      ? gradientBanner
      : defaultBanner,
  )
  console.log()

  if (!options.path) {
    printErrorLogs('需要一个文件路径，例如：-p "xxx.vue"')
    process.exit(0)
  }

  const resolvePath = resolve(options.path)
  const outputPath = options.output || resolve(process.cwd(), 'output.vue')

  const tree = transformPath(resolvePath)

  // 输出setup语法题模式
  if (options.syntax) {
    writeFileSync(outputPath, tree.transformed || '', 'utf-8')
    printSuccessLogs(`vue options-api 转化为 composition-api：${outputPath}`)
    process.exit(0)
  }

  const templateTree = parse(tree.scan.lines?.join('\n') || '')
  const templateNode = templateTree.children.find((i: any) => i.tag === 'template')
  let result: any = new Set()

  let resultStr = ''

  findVarNode(templateNode)
  filterData()
  replaceAll()
  moveImport()
  await formatCode()

  try {
    writeFileSync(outputPath, resultStr, 'utf-8')
    printSuccessLogs(`vue options-api 转化为 composition-api：${outputPath}`)
  }
  catch (error) {
    printErrorLogs(error)
  }

  function findVarNode(target: any) {
    if (target?.type === 4 && !target.isStatic) {
      result.add(target.content.split('.')[0])
    }
    else if (typeof target === 'object') {
      Object.values(target).forEach((node: any) => {
        if (node?.type === 4 && !node.isStatic)
          result.add(node.content.split('.')[0])

        else if (typeof node === 'object')
          findVarNode(node)
      })
    }
  }

  function filterData() {
    const totalData = {
      ...(tree.computeds || {}),
      ...(tree.methods || {}),
      ...(tree.refs || {}),
    }

    result = [...result].filter(key => totalData[key])
  }

  function replaceAll() {
    const props: any = {}
    const isEmit = tree.using.$emit || false

    for (const key of Object.keys(tree.props)) {
      const propsVal = tree.props[key]

      props[key] = {
        require: propsVal.required || false,
        type: String(propsVal.type).charAt(0).toUpperCase() + String(propsVal.type).substring(1),
        ...(tree.propDefaultNodes[key]
          ? { default: tree.propDefaultNodes[key] }
          : {}),
      }
    }

    resultStr = tree.transformed
      ?.replace(/(<\/script>)/, `\r\nreturn {\n    ${result.join(',\n    ')}\n}\n$1`)
      .replace(/import {(.*) } from ['"]vue['"]/, 'import {$1, defineComponent } from \'@vue/composition-api\'')
      .replace('setup ', '') || ''

    if (Object.keys(props).length) {
      resultStr = resultStr
        .replace(/(?<=['"]@vue\/composition-api['"])(.*)(?=<\/script>)/smg, `\n\nexport default defineComponent({\nprops:${stringifyObj(props)},setup(props) {$1\n}\n})\n`)
        .replace(/(const props = )?withDefaults.*?}\)/ms, '')
        .replace(/(const props = )?defineProps.*?\)/ms, '')
    }
    else {
      resultStr = resultStr
        .replace(/(?<=['"]@vue\/composition-api['"])(.*)(?=<\/script>)/smg, '\n\nexport default defineComponent({\nsetup() {$1\n}\n})\n')
    }

    if (isEmit) {
      resultStr = resultStr
        .replace(/(const \$emit = )?defineEmits.*?]\)/ms, '')
        .replace(/(?<=setup)\((props)?\)/, '(props, { emit })')
        .replace(/\$emit/g, 'emit')
    }

    function stringifyObj(obj: any) {
      let all = ''
      for (const [key, value] of Object.entries(obj)) {
        let str = value instanceof Function ? value.name : value
        if (typeof value === 'object')
          str = stringifyObj(value)

        all += `${key}: ${str},`
      }

      return `{${all}}`
    }
  }

  async function formatCode() {
    resultStr = await format(resultStr, { ...prettierConfig, parser: 'vue' })
  }

  function moveImport() {
    const importArr = getMatchImport(resultStr).map(i => `import ${i[0]} from '${i[1]}'`)

    if (importArr.length > 1) {
      resultStr = resultStr.replace(/import {?\s*([\w\W]+?)\s*}? from ['"](.+)['"]/g, '')
      const resultArr = resultStr.split('\n')
      const scriptIndex = resultArr.findIndex(i => i.includes('<script'))
      resultArr.splice(scriptIndex + 1, 0, importArr.join('\n'))
      resultStr = resultArr.join('\n')
    }
  }
}

export function getMatchImport(str: string) {
  const importRegexAll = /import {?\s*([\w\W]+?)\s*}? from ['"](.+)['"]/g

  const matchAll = str.match(importRegexAll) ?? []
  const result: string[][] = []

  for (const item of matchAll)
    result.push(matchImport(item))

  return result.length ? result : []

  function matchImport(itemImport: string) {
    const importRegex = /import ({?\s*[\w\W]+?\s*}?) from ['"](.+)['"]/
    const match = itemImport.match(importRegex) ?? []
    return [match[1] ?? '', match[2] ?? '']
  }
}
