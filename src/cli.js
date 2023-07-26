#!/usr/bin/env node
const { mdLinks, validateLink } = require('./index');
const chalk = require('chalk');
const table = require('cli-table3');

const args = process.argv.slice(2);
const filePath = args[0];
const options = {
  validate: args.includes('--validate'),
  stats: args.includes('--stats'),
};

mdLinks(filePath)
  .then((links) => {
    if (options.validate) {
      const validatePromises = links.map((link) => validateLink(link));

      return Promise.all(validatePromises).then((validatedLinks) => {
        const table3 = new table({
          head: [chalk.bold.magenta('file'), chalk.bold.magenta('link'), chalk.bold.magenta('link.ok'), chalk.bold.magenta('link.status'), chalk.bold.magenta('text')],
          colWidths: [50, 40, 10, 10, 30]
        });
        validatedLinks.forEach((link) => {
          const statusText = link.ok ? chalk.green('ok') : chalk.red('fail');
          const linkStatus = link.status === 404 ? chalk.red('404') : chalk.green(link.status);
          table3.push([`${link.file}`, `${chalk.blue(link.href)}`, `${statusText}`, `${linkStatus}`, `${chalk.yellow(link.text.slice(0, 50))}`]);
        });
        console.log(table3.toString());
        if (options.stats) {
          const total = validatedLinks.length;
          const unique = new Set(validatedLinks.map((link) => link.href)).size;
          const broken = validatedLinks.filter((link) => !link.ok).length;

          console.log('\nEstatísticas:');
          console.log(`Total: ${total}`);
          console.log(`Únicos: ${unique}`);
          console.log(`Quebrados: ${broken}`);
        }
      });
    } else if (options.stats) {
      const table2 = new table({
        head: [chalk.bold.magenta('total'), chalk.bold.magenta('unique')],
        colWidths: [50, 40]
      });
      const total = links.length;
      const unique = new Set(links.map((link) => link.href)).size;
      table2.push([`${total}`, `${chalk.blue(unique)}`]);
      console.log(table2.toString());
    } else {
      links.forEach((link) => {
        console.log(`${link.file} ${chalk.blue(link.href)} ${chalk.yellow(link.text.slice(0, 50))}`);
      });
    }
  })
  .catch((error) => {
    console.error(chalk.red('Erro:', error.message));
  });

