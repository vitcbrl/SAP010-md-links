const { mdLinks, validateLink } = require('./index');
const chalk = require('chalk');

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
        validatedLinks.forEach((link) => {
          const statusText = link.ok ? chalk.green('ok') : chalk.red('fail');
          const linkStatus = link.status === 404 ? chalk.red('404') : chalk.green(link.status);
          console.log(`${link.file} ${chalk.blue(link.href)} ${statusText} ${linkStatus} ${chalk.yellow(link.text.slice(0, 50))}`);
        });

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
    } 
      if (options.stats) {
        const total = links.length;
        const unique = new Set(links.map((link) => link.href)).size;

        console.log('\nEstatísticas:');
        console.log(`Total: ${total}`);
        console.log(`Únicos: ${unique}`);
      }
     else {
      links.forEach((link) => {
        console.log(`${link.file} ${chalk.blue(link.href)} ${chalk.yellow(link.text.slice(0, 50))}`);
      }); 
    }
  })
  .catch((error) => {
    console.error(chalk.red('Erro:', error.message));
  });
