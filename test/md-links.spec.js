const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const mdLinks = require('../src/index.js');
const chalk = require('chalk'); // Certifique-se de que o chalk está instalado em seu projeto


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
  // Mova a declaração de directoryPath para fora do bloco describe
  let directoryPath; // Variável para armazenar o diretório de teste

  beforeAll(async () => {
    // Definir o caminho do diretório de teste antes de criar o diretório
    directoryPath = path.resolve(__dirname, 'testDirectory');

    // Verificar se o diretório já existe antes de criá-lo
    const isDir = await fs
      .access(directoryPath)
      .then(() => true)
      .catch(() => false);

    if (!isDir) {
      await fs.mkdir(directoryPath);
    }
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
  test('Deve extrair os links de um conteúdo Markdown', async () => {
    const content = `
      [Link 1](https://example.com)
      [Link 2](https://www.google.com)
    `;
    const file = 'path/to/file.md';
    const expected = [
      { href: 'https://example.com', text: 'Link 1', file },
      { href: 'https://www.google.com', text: 'Link 2', file },
    ];

    const result = await mdLinks.extractLinks(content, file);

    console.log('Resultado:', result); // Adicione este log temporário

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

describe('imprimirLinks', () => {
  test('Deve imprimir os links com status "ok"', () => {
    // Dados de link de exemplo com status "ok"
    const links = [
      {
        file: 'file1.md',
        href: 'https://example.com',
        ok: 'ok',
        status: 200,
        text: 'Link de exemplo 1',
      },
      {
        file: 'file2.md',
        href: 'https://www.google.com',
        ok: 'ok',
        status: 200,
        text: 'Link de exemplo 2',
      },
    ];

    // Capturando a saída da função imprimirLinks
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    mdLinks.imprimirLinks(links);

    // Verificando se a função console.log foi chamada com os argumentos corretos
    expect(consoleSpy).toHaveBeenCalledWith(
      chalk.gray('file1.md'),
      chalk.cyan('https://example.com'),
      chalk.bgGreen(' ok '),
      chalk.yellow('Link de exemplo 1')
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      chalk.gray('file2.md'),
      chalk.cyan('https://www.google.com'),
      chalk.bgGreen(' ok '),
      chalk.yellow('Link de exemplo 2')
    );

    // Restaurando a função console.log original
    consoleSpy.mockRestore();
  });

  test('Deve imprimir os links com status "fail" e o código de status', () => {
    // Dados de link de exemplo com status "fail"
    const links = [
      {
        file: 'file3.md',
        href: 'https://invalidlink.com',
        ok: 'fail',
        status: 404,
        text: 'Link inválido 1',
      },
      {
        file: 'file4.md',
        href: 'https://expiredlink.com',
        ok: 'fail',
        status: 410,
        text: 'Link inválido 2',
      },
    ];

    // Capturando a saída da função imprimirLinks
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    mdLinks.imprimirLinks(links);

    // Verificando se a função console.log foi chamada com os argumentos corretos
    expect(consoleSpy).toHaveBeenCalledWith(
      chalk.gray('file3.md'),
      chalk.cyan('https://invalidlink.com'),
      chalk.bgRed(' fail 404 '),
      chalk.yellow('Link inválido 1')
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      chalk.gray('file4.md'),
      chalk.cyan('https://expiredlink.com'),
      chalk.bgRed(' fail 410 '),
      chalk.yellow('Link inválido 2')
    );

    // Restaurando a função console.log original
    consoleSpy.mockRestore();
  });
});

describe('imprimirEstatisticas', () => {
  test('Deve imprimir as estatísticas dos links corretamente', () => {
    // Dados de link de exemplo
    const links = [
      { href: 'https://example.com', text: 'Link de exemplo 1', ok: 'ok', status: 200 },
      { href: 'https://www.google.com', text: 'Link de exemplo 2', ok: 'ok', status: 200 },
      { href: 'https://invalidlink.com', text: 'Link inválido 1', ok: 'fail', status: 404 },
    ];

    // Capturando a saída da função imprimirEstatisticas
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    mdLinks.imprimirEstatisticas(links);

    // Verificando se a função console.log foi chamada com os argumentos corretos
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(chalk.bold('Estatísticas dos links:')));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(chalk.yellow('Total: 3')));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(chalk.yellow('Quebrados: 1')));

    // Restaurando a função console.log original
    consoleSpy.mockRestore();
  });
});
