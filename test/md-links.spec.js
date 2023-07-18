const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const mdLinks = require('../src/index.js');

describe('isFile', () => {
  test('Deve retornar true se o caminho aponta para um arquivo', async () => {
    const filePath = path.resolve(__dirname, 'testFile.txt');
    await fs.writeFile(filePath, 'Teste de conteúdo');

    const result = await mdLinks.isFile(filePath);
    expect(result).toBe(true);

    await fs.unlink(filePath); // Removendo o arquivo de teste após o teste
  });

  test('Deve retornar false se o caminho não aponta para um arquivo', async () => {
    const directoryPath = path.resolve(__dirname, 'testDirectory');
    const isDir = await fs
      .mkdir(directoryPath)
      .then(() => true)
      .catch((err) => {
        if (err.code === 'EEXIST') return true; // O diretório já existe
        return false;
      });

    const result = await mdLinks.isFile(directoryPath);
    expect(result).toBe(!isDir);

    if (!isDir) {
      await fs.rmdir(directoryPath); // Removendo o diretório de teste após o teste
    }
  });
});

describe('isMarkdownFile', () => {
  test('Deve retornar true para um arquivo Markdown', () => {
    const filePath = 'path/to/file.md';
    const result = mdLinks.isMarkdownFile(filePath);
    expect(result).toBe(true);
  });

  test('Deve retornar false para um arquivo que não é Markdown', () => {
    const filePath = 'path/to/file.txt';
    const result = mdLinks.isMarkdownFile(filePath);
    expect(result).toBe(false);
  });
});

describe('getFilesFromDirectory', () => {
  let directoryPath; // Variável para armazenar o diretório de teste

  beforeAll(async () => {
    // Criar o diretório de teste apenas uma vez antes de todos os testes
    directoryPath = path.resolve(__dirname, 'testDirectory');
    await fs.mkdir(directoryPath);
  });

  afterAll(async () => {
    // Remover o diretório de teste após todos os testes serem concluídos
    await fs.rmdir(directoryPath);
  });

  test('Deve retornar uma lista de arquivos em um diretório', async () => {
    const filePath1 = path.join(directoryPath, 'file1.md');
    const filePath2 = path.join(directoryPath, 'file2.txt');
    await fs.writeFile(filePath1, 'Conteúdo do arquivo 1');
    await fs.writeFile(filePath2, 'Conteúdo do arquivo 2');

    const result = await mdLinks.getFilesFromDirectory(directoryPath);
    expect(result).toEqual([filePath1, filePath2]);

    await fs.unlink(filePath1); // Removendo os arquivos de teste após o teste
    await fs.unlink(filePath2);
  });
});

describe('readFileContent', () => {
  test('Deve ler o conteúdo de um arquivo', async () => {
    const filePath = path.resolve(__dirname, 'testFile.txt');
    const fileContent = 'Conteúdo do arquivo de teste';
    await fs.writeFile(filePath, fileContent);

    const result = await mdLinks.readFileContent(filePath);
    expect(result).toBe(fileContent);

    await fs.unlink(filePath); // Removendo o arquivo de teste após o teste
  });
});

describe('extractLinks', () => {
  test('Deve extrair os links de um conteúdo Markdown', () => {
    const content = `
      [Link 1](https://example.com)
      [Link 2](https://www.google.com)
    `;
    const file = 'path/to/file.md';
    const result = mdLinks.extractLinks(content, file);
    const expected = [
      { href: 'https://example.com', text: 'Link 1', file },
      { href: 'https://www.google.com', text: 'Link 2', file },
    ];
    expect(result).toEqual(expected);
  });
});

describe('validateLink', () => {
  test('Deve validar um link existente', async () => {
    const link = { href: 'https://example.com', text: 'Link', file: 'path/to/file.md' };
    const mock = new MockAdapter(axios);
    mock.onHead(link.href).reply(200);

    await mdLinks.validateLink(link);

    expect(link.status).toBe(200);
    expect(link.ok).toBe('ok');
  });

  test('Deve marcar um link como inválido para um link inexistente', async () => {
    const link = { href: 'https://invalidlink.com', text: 'Link inválido', file: 'path/to/file.md' };
    const mock = new MockAdapter(axios);
    mock.onHead(link.href).reply(404);

    await mdLinks.validateLink(link);

    expect(link.status).toBe(404);
    expect(link.ok).toBe('fail');
  });
});
