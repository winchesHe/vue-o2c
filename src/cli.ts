#!/usr/bin/env node
import { Command } from 'commander'
import pkg from '../package.json'
import { start } from './command/index'

const program = new Command()
program.version(pkg.version, '-v --version', '显示当前版本号')

program
  .description('ts cli 模版目录')
  .option('-p, --path <path>', '文件路径')
  .option('-o, --output [output]', '输出路径')
  .option('-s, --syntax [syntax]', '是否输出setup语法题模式')
  .action(start)

program.parse(process.argv)
