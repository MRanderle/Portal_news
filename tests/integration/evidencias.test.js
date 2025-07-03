// ===============================================
// tests/integration/evidencias.test.js
// Testes específicos para gerar evidências

describe('Evidências de Execução dos Testes', () => {
    
    test('Deve gerar evidência de autenticação bem-sucedida', async () => {
        const app = require('./admin.integration.test.js');
        const request = require('supertest');
        
        const response = await request(app)
            .post('/admin/login')
            .send({
                email: 'admin@teste.com',
                senha: '123456'
            });
        
        // Evidência: Status code de sucesso
        expect(response.status).toBe(200);
        
        // Evidência: Resposta contém dados esperados
        expect(response.body.success).toBe(true);
        expect(response.body.redirect).toBe('/admin');
        
        // Evidência: Cookie de sessão foi criado
        expect(response.headers['set-cookie']).toBeDefined();
        
        console.log('📝 EVIDÊNCIA 1: Autenticação bem-sucedida confirmada');
        console.log('   - Status: 200 ✅');
        console.log('   - Cookie de sessão criado ✅');
        console.log('   - Redirecionamento correto ✅');
    });
    
    test('Deve gerar evidência de proteção de rotas', async () => {
        const app = require('./admin.integration.test.js');
        const request = require('supertest');
        
        const response = await request(app).get('/admin');
        
        // Evidência: Acesso negado sem autenticação
        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Não autorizado');
        
        console.log('📝 EVIDÊNCIA 2: Proteção de rotas funcionando');
        console.log('   - Acesso negado sem login ✅');
        console.log('   - Mensagem de erro adequada ✅');
    });
    
    test('Deve gerar evidência de validação de dados', async () => {
        const app = require('./admin.integration.test.js');
        const request = require('supertest');
        
        // Primeiro fazer login
        const loginResponse = await request(app)
            .post('/admin/login')
            .send({
                email: 'admin@teste.com',
                senha: '123456'
            });
        
        const cookies = loginResponse.headers['set-cookie'];
        
        // Tentar criar notícia sem dados obrigatórios
        const invalidResponse = await request(app)
            .post('/admin/noticias')
            .set('Cookie', cookies)
            .send({
                categoria_id: 1
                // Sem título e conteúdo
            });
        
        // Evidência: Validação rejeitou dados inválidos
        expect(invalidResponse.status).toBe(400);
        expect(invalidResponse.body.error).toContain('obrigatórios');
        
        console.log('📝 EVIDÊNCIA 3: Validação de dados funcionando');
        console.log('   - Campos obrigatórios validados ✅');
        console.log('   - Erro retornado adequadamente ✅');
    });
});