const fs = require('fs').promises;
const path = require('path');
const {
  isFile,
  isMarkdownFile,
  getFilesFromDirectory,
  readFileContent,
  extractLinks,
  validateLink,
  mdLinks,
} = require ('../src/index.js')

describe('isFile', () => {
  test('Deve retornar true se o caminho aponta para um arquivo', () => {
    const filePath = path.resolve(__dirname, 'testFile.txt');
    return fs.writeFile(filePath, 'Teste de conteúdo').then(() => {
      return isFile(filePath).then(result => {
        expect(result).toBe(true);
        return fs.unlink(filePath); // Removendo o arquivo de teste após o teste
      });
    });
  });
});

describe('isMarkdownFile', () => {
  test('Deve retornar true para um arquivo Markdown', () => {
    const filePath = 'path/to/file.md';
    const result = isMarkdownFile(filePath);
    expect(result).toBe(true);
  });

  test('Deve retornar false para um arquivo que não é Markdown', () => {
    const filePath = 'path/to/file.txt';
    const result = isMarkdownFile(filePath);
    expect(result).toBe(false);
  });
});

describe('getFilesFromDirectory', () => {
  let directoryPath; // Variável para armazenar o diretório de teste

  beforeAll(() => {
    // Definir o caminho do diretório de teste antes de criar o diretório
    directoryPath = path.resolve(__dirname, 'testDirectory');

    // Verificar se o diretório já existe antes de criá-lo
    return fs
      .access(directoryPath)
      .then(() => true)
      .catch(() => {
        return fs.mkdir(directoryPath);
      });
  });

  afterAll(() => {
    // Remover o diretório de teste após todos os testes serem concluídos
    return fs.rmdir(directoryPath);
  });

  test('Deve retornar uma lista de arquivos em um diretório', () => {
    const filePath1 = path.join(directoryPath, 'file1.md');
    const filePath2 = path.join(directoryPath, 'file2.txt');
    return Promise.all([
      fs.writeFile(filePath1, 'Conteúdo do arquivo 1'),
      fs.writeFile(filePath2, 'Conteúdo do arquivo 2'),
    ]).then(() => {
      return getFilesFromDirectory(directoryPath).then(result => {
        expect(result).toEqual([filePath1, filePath2]);
        return Promise.all([fs.unlink(filePath1), fs.unlink(filePath2)]); // Removendo os arquivos de teste após o teste
      });
    });
  });
});

describe('readFileContent', () => {
  test('Deve ler o conteúdo de um arquivo', () => {
    const filePath = path.resolve(__dirname, 'testFile.txt');
    const fileContent = 'Conteúdo do arquivo de teste';
    return fs.writeFile(filePath, fileContent).then(() => {
      return readFileContent(filePath).then(result => {
        expect(result).toBe(fileContent);
        return fs.unlink(filePath); // Removendo o arquivo de teste após o teste
      });
    });
  });
});

describe('extractLinks', () => {
  it('deve extrair os links do markdown corretamente', () => {
    const markdown = `
  [Google](https://www.google.com)
  [Laboratoria](https://www.laboratoria.la/br)
`;
    const file = '../src/mdlinks/file1.md';
    const expectedLinks = [
      { href: 'https://www.google.com', text: 'Google', file },
      { href: 'https://www.laboratoria.la/br', text: 'Laboratoria', file },
    ];

    const result = extractLinks(markdown, file);
    expect(result).toEqual(expectedLinks);
  });

  // Adicione mais testes aqui, como casos com markdown vazio, etc.
});

describe('validateLink', () => {
  it('deve validar um link existente corretamente', () => {
    const link = { href: 'https://www.google.com', text: 'Google', file: 'exemplo.md' };
    return validateLink(link).then(validatedLink => {
      expect(validatedLink).toEqual({
        href: 'https://www.google.com',
        text: 'Google',
        file: 'exemplo.md',
        status: 200,
        ok: true,
      });
    });
  });

  it('deve tratar corretamente um link inexistente', () => {
    const link = { href: 'https://www.siteinexistente.com', text: 'Link Inexistente', file: 'exemplo.md' };
    return validateLink(link).then(validatedLink => {
      expect(validatedLink).toEqual({
        href: 'https://www.siteinexistente.com',
        text: 'Link Inexistente',
        file: 'exemplo.md',
        status: 404,
        ok: false,
      });
    });
  });

  // Adicione mais testes aqui, como casos com links inválidos, etc.
});


describe('mdLinks', () => {
  it('deve extrair links de um arquivo Markdown corretamente', () => {
    const filePath = path.join(__dirname, '../src/mdlinks/file1.md');
    const expectedLinks = [
      { href: 'https://www.google.com', text: 'Link para o Google', file: path.join(__dirname, '../src/mdlinks/file1.md') },
      { href: 'https://www.laboratoria.la/br', text: 'Link para Laboratoria', file: path.join(__dirname, '../src/mdlinks/file1.md') },
      { href: 'https://www.link-falso.com', text: 'Link quebrado', file: path.join(__dirname, '../src/mdlinks/file1.md') },
    ];

    return mdLinks(filePath).then(result => {
      expect(result).toEqual(expectedLinks);
    });
  });

  it('deve extrair links de vários arquivos Markdown em um diretório corretamente', () => {
    const dirPath = path.join(__dirname, '../src/mdlinks/file1.md');
    const expectedLinks = [
      { href: 'https://www.google.com', text: 'Link para o Google', file: path.join(__dirname, '../src/mdlinks/file1.md') },
      { href: 'https://www.laboratoria.la/br', text:'Link para Laboratoria' , file: path.join(__dirname, '../src/mdlinks/file1.md') },
      { href: 'https://www.link-falso.com', text: 'Link quebrado', file: path.join(__dirname, '../src/mdlinks/file1.md') },
      // Adicione mais links esperados para outros arquivos Markdown no diretório, se necessário
    ];

    return mdLinks(dirPath).then(result => {
      expect(result).toEqual(expectedLinks);
    });
  });

  it('deve validar links corretamente quando a opção "validate" é passada como true', () => {
    const filePath = path.join(__dirname, '../src/mdlinks/file1.md');
    const expectedLinks = [
      { href: 'https://www.google.com', text: 'Link para o Google', file: path.join(__dirname, '../src/mdlinks/file1.md'), status: 200, ok: true },
      { href: 'https://www.laboratoria.la/br', text: 'Link para Laboratoria', file: path.join(__dirname, '../src/mdlinks/file1.md'), status: 200, ok: true },
      { href: 'https://www.link-falso.com', text: 'Link quebrado', file: path.join(__dirname, '../src/mdlinks/file1.md'), status: 404, ok: false },
      // Adicione mais links esperados com validação para outros arquivos Markdown no diretório, se necessário
    ];

    return mdLinks(filePath, { validate: true }).then(result => {
      expect(result).toEqual(expectedLinks);
    });
  });

  it('deve retornar um array vazio quando o arquivo Markdown é inválido', () => {
    const invalidFilePath = path.join(__dirname, '../src/mdlinks/file3.html');

    return mdLinks(invalidFilePath).then(result => {
      expect(result).toEqual([]);
    });
  });

  // Adicione mais testes aqui, abrangendo outros cenários possíveis.
});

