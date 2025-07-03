// tests/setup.js
// Configuração global para os testes

// Configurar timeout para testes de integração
jest.setTimeout(30000);

// Mock global do console para capturar logs dos testes
const originalConsoleLog = console.log;
global.testLogs = [];

console.log = (...args) => {
    global.testLogs.push(args.join(' '));
    originalConsoleLog(...args);
};

// Configuração global de variáveis
global.testConfig = {
    database: {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'plataforma_noticias_test'
    },
    admin: {
        email: 'admin@teste.com',
        senha: '123456'
    },
    mflix: {
        email: 'user@mflix.com',
        senha: '123456'
    }
};

// Limpar dados antes de cada teste
beforeEach(() => {
    global.testLogs = [];
});
