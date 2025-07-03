// create-master.js - CORRIGIDO PARA SUA ESTRUTURA REAL
// Execute: node create-master.js

const bcrypt = require('bcryptjs');
const mysql = require('mysql2');
require('dotenv').config();

function conectarBD() {
    const conexao = mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'plataforma_noticias'
    });
    
    console.log('✅ Conectou no MySQL!');
    return conexao;
}

async function createMasterUser() {
    let conexao;
    
    try {
        console.log('🔐 Criando usuário administrador master...\n');

        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const question = (query) => new Promise((resolve) => rl.question(query, resolve));

        const nome = await question('Nome do administrador master: ');
        const email = await question('Email: ');
        
        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('❌ Email inválido!');
            rl.close();
            return;
        }

        conexao = conectarBD();

        // Verificar se email já existe (usando campos corretos)
        const existingUsers = await new Promise((resolve, reject) => {
            conexao.query(
                'SELECT email FROM usuarios WHERE email = ?', 
                [email],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });

        if (existingUsers.length > 0) {
            console.log('❌ Este email já está cadastrado!');
            rl.close();
            return;
        }

        let senha;
        let confirmarSenha;
        
        do {
            senha = await question('Senha (mínimo 6 caracteres): ');
            if (senha.length < 6) {
                console.log('❌ Senha deve ter pelo menos 6 caracteres!');
                continue;
            }
            
            confirmarSenha = await question('Confirme a senha: ');
            if (senha !== confirmarSenha) {
                console.log('❌ Senhas não coincidem!');
            }
        } while (senha !== confirmarSenha || senha.length < 6);

        rl.close();

        console.log('\n🔄 Processando...');

        // Criptografar senha
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(senha, saltRounds);

        // Inserir usuário no banco (usando campos corretos)
        const result = await new Promise((resolve, reject) => {
            conexao.query(`
                INSERT INTO usuarios 
                (email, senha, nome, tipo_usuario, verificado, criado_em) 
                VALUES (?, ?, ?, 'master', 1, NOW())
            `, [email, hashedPassword, nome], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        console.log('✅ Usuário master criado com sucesso!');
        console.log(`📧 Email: ${email}`);
        console.log(`🆔 ID: ${result.insertId}`);
        console.log(`🔗 Acesse: http://localhost:3000/admin/login`);
        console.log('\n🎉 Agora você pode acessar o painel administrativo!');

        // Criar log da ação (se a tabela existir)
        try {
            await new Promise((resolve, reject) => {
                conexao.query(`
                    INSERT INTO logs_admin 
                    (admin_id, acao, detalhes, criado_em) 
                    VALUES (?, 'usuario_master_criado', ?, NOW())
                `, [result.insertId, JSON.stringify({ nome, email, created_by: 'script' })], (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
        } catch (logError) {
            console.log('⚠️ Log não pôde ser criado (normal se tabela logs_admin não existir ainda)');
        }

    } catch (error) {
        console.error('❌ Erro ao criar usuário master:', error.message);
    } finally {
        if (conexao) {
            conexao.end();
        }
        process.exit();
    }
}

// Executar script
createMasterUser();