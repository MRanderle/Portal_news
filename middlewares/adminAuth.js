// middlewares/adminAuth.js - CORRIGIDO PARA SUA ESTRUTURA REAL
const mysql = require('mysql2');

// Usar sua configuração de banco
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'plataforma_noticias'
});

// Middleware para verificar se é admin
const isAdmin = async (req, res, next) => {
    try {
        if (!req.session.userId) {
            return res.redirect('/admin/login');
        }

        const usuarios = await new Promise((resolve, reject) => {
            db.query(
                'SELECT id, nome, email, tipo_usuario FROM usuarios WHERE id = ? AND tipo_usuario IN ("admin", "master")',
                [req.session.userId],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });

        if (usuarios.length === 0) {
            req.session.destroy();
            return res.redirect('/admin/login');
        }

        req.admin = usuarios[0];
        next();
    } catch (error) {
        console.error('Erro no middleware admin:', error);
        res.status(500).send('Erro interno do servidor');
    }
};

// Middleware para verificar se é master
const isMaster = async (req, res, next) => {
    try {
        if (!req.admin || req.admin.tipo_usuario !== 'master') {
            return res.status(403).render('admin/error', { 
                title: 'Acesso Negado',
                message: 'Apenas administradores master podem acessar esta área.',
                admin: req.admin 
            });
        }
        next();
    } catch (error) {
        console.error('Erro no middleware master:', error);
        res.status(500).send('Erro interno do servidor');
    }
};

// Middleware para registrar ações administrativas
const logAdminAction = (acao, tabela = null) => {
    return async (req, res, next) => {
        try {
            await new Promise((resolve, reject) => {
                db.query(
                    'INSERT INTO logs_admin (admin_id, acao, tabela_afetada, registro_id, detalhes, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [
                        req.admin.id,
                        acao,
                        tabela,
                        req.params.id || null,
                        JSON.stringify({
                            method: req.method,
                            url: req.originalUrl,
                            body: req.method === 'POST' ? req.body : null
                        }),
                        req.ip,
                        req.get('User-Agent')
                    ],
                    (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    }
                );
            });
            next();
        } catch (error) {
            console.error('Erro ao registrar log:', error);
            next(); // Continua mesmo se o log falhar
        }
    };
};

module.exports = { isAdmin, isMaster, logAdminAction };