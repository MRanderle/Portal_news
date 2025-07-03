const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const multer = require('multer');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');
const flash = require('express-flash');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do banco de dados
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// ✅ CONFIGURAÇÃO CORRETA DO NODEMAILER:
const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verificar configuração do email (opcional)
transport.verify(function(error, success) {
    if (error) {
        console.log('❌ Erro na configuração do email:', error);
        console.log('💡 Verifique suas credenciais no arquivo .env');
    } else {
        console.log('✅ Servidor de email configurado corretamente');
    }
});

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const mimetype = allowedTypes.test(file.mimetype);
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas!'));
        }
    }
});

// Middleware básico
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ===== CONFIGURAÇÃO DE SESSÃO (APENAS UMA VEZ) =====
app.use(session({
    secret: process.env.SESSION_SECRET || 'seu-secret-super-seguro-mude-em-producao',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // mude para true em produção com HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// ===== FLASH MESSAGES (APENAS UMA VEZ) =====
app.use(flash());

// Middleware para variáveis globais
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    res.locals.messages = {
        success: req.flash('success'),
        error: req.flash('error'),
        info: req.flash('info')
    };
    next();
});

// Middleware de autenticação
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Criar tabelas do banco de dados
const createTables = () => {
    const tables = [
        `CREATE TABLE IF NOT EXISTS usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            senha VARCHAR(255) NOT NULL,
            foto_perfil VARCHAR(255),
            verificado BOOLEAN DEFAULT FALSE,
            token_verificacao VARCHAR(255),
            dark_mode BOOLEAN DEFAULT FALSE,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            ultimo_acesso TIMESTAMP NULL,
            tipo_usuario ENUM('user', 'admin', 'master') DEFAULT 'user'
        )`,
        
        `CREATE TABLE IF NOT EXISTS categorias (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(50) NOT NULL UNIQUE,
            descricao TEXT,
            icone VARCHAR(50),
            cor VARCHAR(7) DEFAULT '#6366f1'
        )`,
        
        `CREATE TABLE IF NOT EXISTS usuario_categorias (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT,
            categoria_id INT,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
            FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE,
            UNIQUE KEY unique_user_category (usuario_id, categoria_id)
        )`,
        
        `CREATE TABLE IF NOT EXISTS noticias (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titulo VARCHAR(255) NOT NULL,
            subtitulo TEXT,
            conteudo TEXT NOT NULL,
            imagem VARCHAR(255),
            video_url VARCHAR(500),
            categoria_id INT,
            autor VARCHAR(100),
            fonte VARCHAR(100),
            url_externa VARCHAR(500),
            admin_id INT,
            publicado TINYINT(1) DEFAULT 0,
            visualizacoes INT DEFAULT 0,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (categoria_id) REFERENCES categorias(id),
            FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE SET NULL
        )`,

        // Tabelas avançadas
        `CREATE TABLE IF NOT EXISTS favoritos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            noticia_id INT NOT NULL,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
            FOREIGN KEY (noticia_id) REFERENCES noticias(id) ON DELETE CASCADE,
            UNIQUE KEY unique_favorito (usuario_id, noticia_id)
        )`,
        
        `CREATE TABLE IF NOT EXISTS comentarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            noticia_id INT NOT NULL,
            usuario_id INT NOT NULL,
            comentario TEXT NOT NULL,
            aprovado TINYINT(1) DEFAULT 1,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (noticia_id) REFERENCES noticias(id) ON DELETE CASCADE,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        )`,
        
        `CREATE TABLE IF NOT EXISTS notificacoes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            titulo VARCHAR(255) NOT NULL,
            mensagem TEXT,
            tipo ENUM('noticia', 'sistema', 'categoria') DEFAULT 'noticia',
            lida BOOLEAN DEFAULT FALSE,
            dados JSON,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        )`,
        
        `CREATE TABLE IF NOT EXISTS analytics (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT,
            evento VARCHAR(100) NOT NULL,
            pagina VARCHAR(255),
            dados JSON,
            ip VARCHAR(45),
            user_agent TEXT,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
        )`,

        `CREATE TABLE IF NOT EXISTS logs_admin (
            id INT AUTO_INCREMENT PRIMARY KEY,
            admin_id INT NOT NULL,
            acao VARCHAR(100) NOT NULL,
            tabela_afetada VARCHAR(50),
            registro_id INT,
            detalhes JSON,
            ip_address VARCHAR(45),
            user_agent TEXT,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE CASCADE
        )`
    ];

    tables.forEach(table => {
        db.query(table, (err) => {
            if (err) console.error('Erro ao criar tabela:', err);
        });
    });

    // Inserir categorias padrão
    const categoriasPadrao = [
        { nome: 'Esportes', descricao: 'Notícias esportivas', icone: '⚽', cor: '#10b981' },
        { nome: 'Política', descricao: 'Notícias políticas', icone: '🏛️', cor: '#ef4444' },
        { nome: 'Finanças', descricao: 'Mercado financeiro', icone: '💰', cor: '#f59e0b' },
        { nome: 'Tecnologia', descricao: 'Inovação e tech', icone: '💻', cor: '#3b82f6' },
        { nome: 'Saúde', descricao: 'Saúde e bem-estar', icone: '🏥', cor: '#06b6d4' },
        { nome: 'Entretenimento', descricao: 'Cinema, música, celebridades', icone: '🎬', cor: '#8b5cf6' },
        { nome: 'Ciência', descricao: 'Descobertas científicas', icone: '🔬', cor: '#059669' },
        { nome: 'Educação', descricao: 'Ensino e educação', icone: '📚', cor: '#dc2626' },
        { nome: 'Meio Ambiente', descricao: 'Sustentabilidade e natureza', icone: '🌱', cor: '#16a34a' },
        { nome: 'Internacional', descricao: 'Notícias internacionais', icone: '🌍', cor: '#7c3aed' }
    ];

    categoriasPadrao.forEach(categoria => {
        db.query(
            'INSERT IGNORE INTO categorias (nome, descricao, icone, cor) VALUES (?, ?, ?, ?)',
            [categoria.nome, categoria.descricao, categoria.icone, categoria.cor]
        );
    });
};

// ===== ROTAS =====

// Página inicial
app.get('/', (req, res) => {
    const query = `
        SELECT n.*, c.nome as categoria_nome, c.cor as categoria_cor 
        FROM noticias n 
        LEFT JOIN categorias c ON n.categoria_id = c.id 
        WHERE n.publicado = 1
        ORDER BY n.criado_em DESC 
        LIMIT 12
    `;
    
    db.query(query, (err, noticias) => {
        if (err) {
            console.error(err);
            return res.render('index', { noticias: [] });
        }
        res.render('index', { noticias });
    });
});

// Cadastro
app.get('/cadastro', (req, res) => {
    res.render('cadastro');
});

app.post('/cadastro', async (req, res) => {
    try {
        const { nome, email, senha, confirmarSenha } = req.body;

        // Validações básicas
        if (!nome || !email || !senha || !confirmarSenha) {
            req.flash('error', 'Todos os campos são obrigatórios');
            return res.redirect('/cadastro');
        }

        if (senha !== confirmarSenha) {
            req.flash('error', 'As senhas não coincidem');
            return res.redirect('/cadastro');
        }

        if (senha.length < 6) {
            req.flash('error', 'A senha deve ter pelo menos 6 caracteres');
            return res.redirect('/cadastro');
        }

        // Verificar se o email já existe
        const checkEmailQuery = 'SELECT id FROM usuarios WHERE email = ?';
        const existingUser = await new Promise((resolve, reject) => {
            db.query(checkEmailQuery, [email], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        if (existingUser.length > 0) {
            req.flash('error', 'Este email já está cadastrado');
            return res.redirect('/cadastro');
        }

        const hashedPassword = await bcrypt.hash(senha, 12);
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Inserir usuário
        const insertUserQuery = 'INSERT INTO usuarios (nome, email, senha, token_verificacao) VALUES (?, ?, ?, ?)';
        await new Promise((resolve, reject) => {
            db.query(insertUserQuery, [nome, email, hashedPassword, verificationToken], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        // Tentar enviar email de verificação
        try {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Confirme seu cadastro - Portal de Notícias',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #6366f1;">Bem-vindo ao Portal de Notícias!</h2>
                        <p>Olá ${nome},</p>
                        <p>Obrigado por se cadastrar! Para ativar sua conta, clique no link abaixo:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="http://localhost:3000/verificar/${verificationToken}" 
                               style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                Confirmar Cadastro
                            </a>
                        </div>
                        <p>Se você não solicitou este cadastro, pode ignorar este email.</p>
                        <p>Atenciosamente,<br>Equipe Portal de Notícias</p>
                    </div>
                `
            };

            await transport.sendMail(mailOptions);
            req.flash('success', 'Cadastro realizado com sucesso! Verifique seu email para ativar a conta.');
        } catch (emailErr) {
            console.error('Erro ao enviar email:', emailErr);
            req.flash('warning', 'Cadastro realizado, mas não foi possível enviar o email de confirmação. Entre em contato com o suporte.');
        }

        res.redirect('/login');

    } catch (error) {
        console.error('Erro no cadastro:', error);
        req.flash('error', 'Erro interno do servidor. Tente novamente.');
        res.redirect('/cadastro');
    }
});

// Verificação de email
app.get('/verificar/:token', async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            req.flash('error', 'Token de verificação inválido');
            return res.redirect('/login');
        }

        const updateQuery = 'UPDATE usuarios SET verificado = TRUE, token_verificacao = NULL WHERE token_verificacao = ?';
        const result = await new Promise((resolve, reject) => {
            db.query(updateQuery, [token], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        if (result.affectedRows === 0) {
            req.flash('error', 'Token inválido ou expirado');
            return res.redirect('/login');
        }

        req.flash('success', 'Email verificado com sucesso! Você já pode fazer login.');
        res.redirect('/login');

    } catch (error) {
        console.error('Erro na verificação:', error);
        req.flash('error', 'Erro ao verificar email. Tente novamente.');
        res.redirect('/login');
    }
});

// Login
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            req.flash('error', 'Email e senha são obrigatórios');
            return res.redirect('/login');
        }

        const userQuery = 'SELECT * FROM usuarios WHERE email = ?';
        const users = await new Promise((resolve, reject) => {
            db.query(userQuery, [email], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        if (users.length === 0) {
            req.flash('error', 'Email ou senha incorretos');
            return res.redirect('/login');
        }

        const user = users[0];

        if (!user.verificado) {
            req.flash('error', 'Por favor, verifique seu email antes de fazer login. Verifique sua caixa de entrada e spam.');
            return res.redirect('/login');
        }

        const isValidPassword = await bcrypt.compare(senha, user.senha);
        if (!isValidPassword) {
            req.flash('error', 'Email ou senha incorretos');
            return res.redirect('/login');
        }

        req.session.user = {
            id: user.id,
            nome: user.nome,
            email: user.email,
            foto_perfil: user.foto_perfil
        };

        // Atualizar último acesso
        db.query('UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = ?', [user.id]);

        // Verificar se é o primeiro login
        const categoryQuery = 'SELECT COUNT(*) as count FROM usuario_categorias WHERE usuario_id = ?';
        const categoryCount = await new Promise((resolve, reject) => {
            db.query(categoryQuery, [user.id], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        if (categoryCount[0].count === 0) {
            res.redirect('/selecionar-categorias');
        } else {
            res.redirect('/dashboard');
        }

    } catch (error) {
        console.error('Erro no login:', error);
        req.flash('error', 'Erro interno do servidor. Tente novamente.');
        res.redirect('/login');
    }
});

// Seleção de categorias (primeiro acesso)
app.get('/selecionar-categorias', requireAuth, (req, res) => {
    db.query('SELECT * FROM categorias ORDER BY nome', (err, categorias) => {
        if (err) {
            console.error(err);
            return res.redirect('/dashboard');
        }
        res.render('selecionar-categorias', { categorias, isFirstAccess: true });
    });
});

app.post('/selecionar-categorias', requireAuth, (req, res) => {
    const { categorias } = req.body;
    const userId = req.session.user.id;

    if (!categorias || categorias.length === 0) {
        req.flash('error', 'Selecione pelo menos uma categoria');
        return res.redirect('/selecionar-categorias');
    }

    // Remover categorias existentes
    db.query('DELETE FROM usuario_categorias WHERE usuario_id = ?', [userId], (err) => {
        if (err) {
            console.error(err);
            req.flash('error', 'Erro ao salvar preferências');
            return res.redirect('/selecionar-categorias');
        }

        // Inserir novas categorias
        const categoriasArray = Array.isArray(categorias) ? categorias : [categorias];
        const values = categoriasArray.map(catId => [userId, catId]);

        if (values.length > 0) {
            db.query(
                'INSERT INTO usuario_categorias (usuario_id, categoria_id) VALUES ?',
                [values],
                (err) => {
                    if (err) {
                        console.error(err);
                        req.flash('error', 'Erro ao salvar preferências');
                        return res.redirect('/selecionar-categorias');
                    }

                    req.flash('success', 'Preferências salvas com sucesso!');
                    res.redirect('/dashboard');
                }
            );
        }
    });
});

// Dashboard
app.get('/dashboard', requireAuth, (req, res) => {
    const userId = req.session.user.id;

    const query = `
        SELECT n.*, c.nome as categoria_nome, c.cor as categoria_cor 
        FROM noticias n 
        LEFT JOIN categorias c ON n.categoria_id = c.id 
        WHERE n.publicado = 1 AND n.categoria_id IN (
            SELECT categoria_id FROM usuario_categorias WHERE usuario_id = ?
        )
        ORDER BY n.criado_em DESC 
        LIMIT 20
    `;

    db.query(query, [userId], (err, noticias) => {
        if (err) {
            console.error(err);
            return res.render('dashboard', { noticias: [] });
        }
        res.render('dashboard', { noticias });
    });
});

// Perfil
app.get('/perfil', requireAuth, (req, res) => {
    const userId = req.session.user.id;

    const query = `
        SELECT c.*, 
               CASE WHEN uc.categoria_id IS NOT NULL THEN 1 ELSE 0 END as selecionada
        FROM categorias c 
        LEFT JOIN usuario_categorias uc ON c.id = uc.categoria_id AND uc.usuario_id = ?
        ORDER BY c.nome
    `;

    db.query(query, [userId], (err, categorias) => {
        if (err) {
            console.error(err);
            return res.render('perfil', { categorias: [] });
        }
        res.render('perfil', { categorias });
    });
});

// Upload de foto de perfil
app.post('/upload-foto', requireAuth, upload.single('foto'), (req, res) => {
    if (!req.file) {
        req.flash('error', 'Nenhuma foto foi selecionada');
        return res.redirect('/perfil');
    }

    const userId = req.session.user.id;
    const fotoPath = `/uploads/${req.file.filename}`;

    db.query(
        'UPDATE usuarios SET foto_perfil = ? WHERE id = ?',
        [fotoPath, userId],
        (err) => {
            if (err) {
                console.error(err);
                req.flash('error', 'Erro ao salvar foto');
                return res.redirect('/perfil');
            }

            req.session.user.foto_perfil = fotoPath;
            req.flash('success', 'Foto atualizada com sucesso!');
            res.redirect('/perfil');
        }
    );
});

// Atualizar categorias do perfil
app.post('/atualizar-categorias', requireAuth, (req, res) => {
    const { categorias } = req.body;
    const userId = req.session.user.id;

    // Remover categorias existentes
    db.query('DELETE FROM usuario_categorias WHERE usuario_id = ?', [userId], (err) => {
        if (err) {
            console.error(err);
            req.flash('error', 'Erro ao atualizar preferências');
            return res.redirect('/perfil');
        }

        // Inserir novas categorias se houver
        if (categorias && categorias.length > 0) {
            const categoriasArray = Array.isArray(categorias) ? categorias : [categorias];
            const values = categoriasArray.map(catId => [userId, catId]);

            db.query(
                'INSERT INTO usuario_categorias (usuario_id, categoria_id) VALUES ?',
                [values],
                (err) => {
                    if (err) {
                        console.error(err);
                        req.flash('error', 'Erro ao atualizar preferências');
                        return res.redirect('/perfil');
                    }

                    req.flash('success', 'Preferências atualizadas com sucesso!');
                    res.redirect('/perfil');
                }
            );
        } else {
            req.flash('success', 'Preferências atualizadas com sucesso!');
            res.redirect('/perfil');
        }
    });
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
        }
        res.redirect('/');
    });
});

// ===== ROTAS ADMINISTRATIVAS (APENAS UMA VEZ) =====
const adminRoutes = require('./routes/admin');
app.use('/admin', adminRoutes);

// ===== MIDDLEWARE PARA TRATAMENTO DE ERROS DE UPLOAD (APENAS UMA VEZ) =====
app.use((error, req, res, next) => {
    if (error && error.code === 'LIMIT_FILE_SIZE') {
        req.flash('error', 'Arquivo muito grande! Verifique os limites de tamanho.');
        return res.redirect('back');
    }
    
    if (error && error.message && error.message.includes('arquivo')) {
        req.flash('error', error.message);
        return res.redirect('back');
    }
    
    next(error);
});

// Inicializar servidor
db.connect((err) => {
    if (err) {
        console.error('Erro ao conectar com o banco de dados:', err);
        return;
    }
    console.log('✅ Conectado ao MySQL');
    createTables();
    console.log('✅ Tabelas criadas/verificadas');
});

app.listen(PORT, () => {
    console.log('✅ Rotas do perfil configuradas com sucesso!');
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🌐 Acesse: http://localhost:${PORT}`);
    console.log('📝 Cadastro: http://localhost:3000/cadastro');
    console.log('🔑 Login: http://localhost:3000/login');
});

// ===== ADICIONE ESTA ROTA AO SEU app.js =====
// Adicione ANTES das rotas administrativas

// Rota para visualizar notícia individual
app.get('/noticia/:id', async (req, res) => {
    try {
        const noticiaId = req.params.id;
        
        // Buscar notícia com categoria
        const noticiaQuery = `
            SELECT n.*, c.nome as categoria_nome, c.cor as categoria_cor 
            FROM noticias n 
            LEFT JOIN categorias c ON n.categoria_id = c.id 
            WHERE n.id = ? AND n.publicado = 1
        `;
        
        const noticia = await new Promise((resolve, reject) => {
            db.query(noticiaQuery, [noticiaId], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        if (noticia.length === 0) {
            req.flash('error', 'Notícia não encontrada');
            return res.redirect('/');
        }

        // Incrementar visualizações
        await new Promise((resolve, reject) => {
            db.query('UPDATE noticias SET visualizacoes = visualizacoes + 1 WHERE id = ?', [noticiaId], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        // Buscar notícias relacionadas da mesma categoria
        const relacionadasQuery = `
            SELECT n.*, c.nome as categoria_nome, c.cor as categoria_cor 
            FROM noticias n 
            LEFT JOIN categorias c ON n.categoria_id = c.id 
            WHERE n.categoria_id = ? AND n.id != ? AND n.publicado = 1 
            ORDER BY n.criado_em DESC 
            LIMIT 4
        `;
        
        const relacionadas = await new Promise((resolve, reject) => {
            db.query(relacionadasQuery, [noticia[0].categoria_id, noticiaId], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        res.render('noticia', {
            noticia: noticia[0],
            relacionadas
        });

    } catch (error) {
        console.error('Erro ao carregar notícia:', error);
        req.flash('error', 'Erro ao carregar notícia');
        res.redirect('/');
    }
});


