const fs = require('fs').promises;
const path = require('path');
const marked = require('marked');
const fetch = require('isomorphic-fetch');

function isFile(filePath) {
  return fs
    .stat(filePath)
    .then((stats) => stats.isFile())
    .catch(() => false);
}

function isMarkdownFile(filePath) {
  return filePath.toLowerCase().endsWith('.md');
}

function getFilesFromDirectory(directory) {
  return fs.readdir(directory).then((files) => {
    const filePromises = files.map((file) => {
      const absolutePath = path.join(directory, file);
      return isFile(absolutePath).then((isFile) => (isFile ? [absolutePath] : getFilesFromDirectory(absolutePath)));
    });
    return Promise.all(filePromises).then((nestedFiles) => nestedFiles.flat());
  });
}

function readFileContent(filePath) {
  return fs.readFile(filePath, 'utf-8');
}

function extractLinks(markdown) {
  const links = [];
  const renderer = new marked.Renderer();

  renderer.link = (href, _title, text) => {
    links.push({ href, text });
  };

  marked(markdown, { renderer });

  return links;
}


function validateLink(link) {
  return new Promise((resolve) => {
    fetch(link.href, { redirect: 'manual' }) // Adicionando a opção 'redirect: manual' para evitar redirecionamentos
      .then((response) => {
        link.status = response.status;
        link.ok = response.ok;
        resolve(link);
      })
      .catch(() => {
        link.status = 404;
        link.ok = false;
        resolve(link);
      });
  });
}


function mdLinks(filePath, options = { validate: false }) {
  const absolutePath = path.resolve(filePath);

  return isFile(absolutePath)
    .then((isFile) => {
      if (isFile && isMarkdownFile(absolutePath)) {
        return readFileContent(absolutePath).then((content) => extractLinks(content, absolutePath));
      } else if (!isFile) {
        return getFilesFromDirectory(absolutePath).then((files) =>
          Promise.all(
            files.map((file) => {
              if (isMarkdownFile(file)) {
                return readFileContent(file).then((content) => extractLinks(content, file));
              }
              return [];
            })
          )
        ).then((nestedLinks) => nestedLinks.flat());
      }
      return [];
    })
    .then((links) => {
      if (options.validate) {
        const linkPromises = links.map((link) => validateLink(link));
        return Promise.all(linkPromises).then(() => links);
      }
      return links;
    });
}


module.exports = {
  isFile,
  isMarkdownFile,
  getFilesFromDirectory,
  readFileContent,
  extractLinks,
  validateLink,
  mdLinks,
};

//const mdLinks = require('./src/mdlinks/mdLinks');

/*mdLinks('./src/mdlinks/file1.md')
  .then((links) => {
    console.log(links);
  })
  .catch((error) => {
    console.error(error.message);
  });

mdLinks('./src/mdlinks/file2.md', { validate: true })
  .then((links) => {
    console.log(links);
  })
  .catch((error) => {
    console.error(error.message);
  });

mdLinks('./src/mdlinks', { validate: true })
  .then((links) => {
    console.log(links);
  })
  .catch((error) => {
    console.error(error.message);
  });*/
