#!/usr/bin/env node

import { startChat } from './src/chat.js';
import { style } from './src/ui.js';

process.title = 'AI Agent Termux';

process.on('SIGINT', () => {
  console.log(`\n\n${style.yellow}\u2728  Goodbye!${style.reset}\n`);
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  console.error(`\n${style.red}\u26A0  ${err.message}${style.reset}\n`);
});

startChat().catch((err) => {
  console.error(`\n${style.red}\u26A0  ${err.message}${style.reset}\n`);
  process.exit(1);
});
