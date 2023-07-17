const fs = require('fs').promises;
const path = require('path');
const marked = require('marked');
const axios = require('axios');

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

function extractLinks(content, file) {
  const links = [];
  const renderer = new marked.Renderer();

  renderer.link = (href, title, text) => {
    links.push({ href, text, file });
  };

  marked(content, { renderer });
  return links;
}

async function validateLink(link) {
  try {
    const response = await axios.head(link.href);
    link.status = response.status;
    link.ok = 'ok';
  } catch (error) {
    link.status = error.response ? error.response.status : 'N/A';
    link.ok = 'fail';
  }
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
        return Promise.all(links.map(validateLink)).then(() => links);
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

mdLinks('./src/mdlinks/file1.md')
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
  });
