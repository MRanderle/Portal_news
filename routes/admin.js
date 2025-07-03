
//  ADMIN.JS //

// routes/admin.js - CORRIGIDO PARA SUA ESTRUTURA REAL
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2');
const { isAdmin, isMaster, logAdminAction } = require('../middlewares/adminAuth');

// Usar sua configuração de banco
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'plataforma_noticias'
});

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = file.fieldname === 'video' ? 'public/uploads/videos' : 'public/uploads/images';
        
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (file.fieldname === 'video') {
            if (file.mimetype.startsWith('video/')) {
                cb(null, true);
            } else {
                cb(new Error('Apenas arquivos de vídeo são permitidos!'), false);
            }
        } else if (file.fieldname === 'imagem') {
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
            }
        }
    },
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limite
    }
});

// === ROTAS DE AUTENTICAÇÃO ===

// Página de login
router.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/admin');
    }
    res.render('admin/login', { title: 'Login - Administração' });
});

// Processar login
router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        const usuarios = await new Promise((resolve, reject) => {
            db.query(
                'SELECT id, nome, email, senha, tipo_usuario FROM usuarios WHERE email = ? AND tipo_usuario IN ("admin", "master")',
                [email],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });

        if (usuarios.length === 0) {
            return res.render('admin/login', { 
                title: 'Login - Administração',
                error: 'Credenciais inválidas ou acesso não autorizado' 
            });
        }

        const usuario = usuarios[0];
        const senhaValida = await bcrypt.compare(senha, usuario.senha);

        if (!senhaValida) {
            return res.render('admin/login', { 
                title: 'Login - Administração',
                error: 'Credenciais inválidas' 
            });
        }

        req.session.userId = usuario.id;
        
        // Atualizar último acesso
        db.query('UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = ?', [usuario.id]);
        
        res.redirect('/admin');
    } catch (error) {
        console.error('Erro no login admin:', error);
        res.render('admin/login', { 
            title: 'Login - Administração',
            error: 'Erro interno do servidor' 
        });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Erro ao fazer logout:', err);
        }
        res.redirect('/admin/login');
    });
});

// === ROTAS PROTEGIDAS (REQUEREM AUTENTICAÇÃO) ===

// Dashboard principal
router.get('/', isAdmin, async (req, res) => {
    try {
        // Estatísticas gerais usando callbacks
        const totalNoticias = await new Promise((resolve, reject) => {
            db.query('SELECT COUNT(*) as total FROM noticias', (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        const totalUsuarios = await new Promise((resolve, reject) => {
            db.query('SELECT COUNT(*) as total FROM usuarios WHERE tipo_usuario = "user"', (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        const totalComentarios = await new Promise((resolve, reject) => {
            db.query('SELECT COUNT(*) as total FROM comentarios', (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        const noticiasPublicadas = await new Promise((resolve, reject) => {
            db.query('SELECT COUNT(*) as total FROM noticias WHERE publicado = 1', (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        // Últimas notícias
        const ultimasNoticias = await new Promise((resolve, reject) => {
            db.query(`
                SELECT n.*, c.nome as categoria_nome, u.nome as admin_nome 
                FROM noticias n 
                LEFT JOIN categorias c ON n.categoria_id = c.id 
                LEFT JOIN usuarios u ON n.admin_id = u.id 
                ORDER BY n.criado_em DESC 
                LIMIT 10
            `, (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        res.render('admin/dashboard', {
            title: 'Dashboard - Administração',
            admin: req.admin,
            stats: {
                totalNoticias: totalNoticias[0].total,
                totalUsuarios: totalUsuarios[0].total,
                totalComentarios: totalComentarios[0].total,
                noticiasPublicadas: noticiasPublicadas[0].total
            },
            ultimasNoticias
        });
    } catch (error) {
        console.error('Erro no dashboard:', error);
        res.status(500).send('Erro interno do servidor');
    }
});

// === GESTÃO DE NOTÍCIAS ===

// Listar notícias
router.get('/noticias', isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        const noticias = await new Promise((resolve, reject) => {
            db.query(`
                SELECT n.*, c.nome as categoria_nome, u.nome as admin_nome 
                FROM noticias n 
                LEFT JOIN categorias c ON n.categoria_id = c.id 
                LEFT JOIN usuarios u ON n.admin_id = u.id 
                ORDER BY n.criado_em DESC 
                LIMIT ? OFFSET ?
            `, [limit, offset], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        const totalCount = await new Promise((resolve, reject) => {
            db.query('SELECT COUNT(*) as total FROM noticias', (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        const totalPages = Math.ceil(totalCount[0].total / limit);

        res.render('admin/noticias/index', {
            title: 'Gestão de Notícias',
            admin: req.admin,
            noticias,
            currentPage: page,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        });
    } catch (error) {
        console.error('Erro ao listar notícias:', error);
        res.status(500).send('Erro interno do servidor');
    }
});

router.get('/noticias/nova', isAdmin, async (req, res) => {
    try {
        const categorias = await new Promise((resolve, reject) => {
            db.query('SELECT * FROM categorias ORDER BY nome', (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
        
        res.render('admin/noticias/form', {
            title: 'Nova Notícia',
            admin: req.admin,
            categorias,
            noticia: {},
            isEdit: false
        });
    } catch (error) {
        console.error('Erro ao carregar formulário:', error);
        res.status(500).send('Erro interno do servidor');
    }
});

// Criar nova notícia
router.post('/noticias', isAdmin, logAdminAction('criar_noticia', 'noticias'), upload.fields([
    { name: 'imagem', maxCount: 1 },
    { name: 'video', maxCount: 1 }
]), async (req, res) => {
    try {
        const { titulo, subtitulo, conteudo, categoria_id, autor, fonte, url_externa, publicado } = req.body;
        
        const imagemPath = req.files.imagem ? `/uploads/images/${req.files.imagem[0].filename}` : null;
        const videoPath = req.files.video ? `/uploads/videos/${req.files.video[0].filename}` : null;

        await new Promise((resolve, reject) => {
            db.query(`
                INSERT INTO noticias (titulo, subtitulo, conteudo, imagem, video_url, categoria_id, autor, fonte, url_externa, admin_id, publicado) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [titulo, subtitulo, conteudo, imagemPath, videoPath, categoria_id, autor, fonte, url_externa, req.admin.id, publicado ? 1 : 0], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        req.flash('success', 'Notícia criada com sucesso!');
        res.redirect('/admin/noticias');
    } catch (error) {
        console.error('Erro ao criar notícia:', error);
        req.flash('error', 'Erro ao criar notícia');
        res.redirect('/admin/noticias/nova');
    }
});

// Formulário para editar notícia
router.get('/noticias/:id/editar', isAdmin, async (req, res) => {
    try {
        const noticias = await new Promise((resolve, reject) => {
            db.query('SELECT * FROM noticias WHERE id = ?', [req.params.id], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
        
        if (noticias.length === 0) {
            req.flash('error', 'Notícia não encontrada');
            return res.redirect('/admin/noticias');
        }

        const categorias = await new Promise((resolve, reject) => {
            db.query('SELECT * FROM categorias ORDER BY nome', (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
        
        res.render('admin/noticias/form', {
            title: 'Editar Notícia',
            admin: req.admin,
            categorias,
            noticia: noticias[0],
            isEdit: true
        });
    } catch (error) {
        console.error('Erro ao carregar notícia:', error);
        res.status(500).send('Erro interno do servidor');
    }
});

// Atualizar notícia
router.post('/noticias/:id', isAdmin, logAdminAction('atualizar_noticia', 'noticias'), upload.fields([
    { name: 'imagem', maxCount: 1 },
    { name: 'video', maxCount: 1 }
]), async (req, res) => {
    try {
        const { titulo, subtitulo, conteudo, categoria_id, autor, fonte, url_externa, publicado } = req.body;
        
        // Buscar notícia atual para preservar arquivos se não foram alterados
        const noticiaAtual = await new Promise((resolve, reject) => {
            db.query('SELECT imagem, video_url FROM noticias WHERE id = ?', [req.params.id], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
        
        const imagemPath = req.files.imagem ? `/uploads/images/${req.files.imagem[0].filename}` : noticiaAtual[0].imagem;
        const videoPath = req.files.video ? `/uploads/videos/${req.files.video[0].filename}` : noticiaAtual[0].video_url;

        await new Promise((resolve, reject) => {
            db.query(`
                UPDATE noticias 
                SET titulo = ?, subtitulo = ?, conteudo = ?, imagem = ?, video_url = ?, categoria_id = ?, 
                    autor = ?, fonte = ?, url_externa = ?, publicado = ?, atualizado_em = NOW() 
                WHERE id = ?
            `, [titulo, subtitulo, conteudo, imagemPath, videoPath, categoria_id, autor, fonte, url_externa, publicado ? 1 : 0, req.params.id], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        req.flash('success', 'Notícia atualizada com sucesso!');
        res.redirect('/admin/noticias');
    } catch (error) {
        console.error('Erro ao atualizar notícia:', error);
        req.flash('error', 'Erro ao atualizar notícia');
        res.redirect(`/admin/noticias/${req.params.id}/editar`);
    }
});

// Deletar notícia
router.delete('/noticias/:id', isAdmin, logAdminAction('deletar_noticia', 'noticias'), async (req, res) => {
    try {
        // Buscar arquivos para deletar
        const noticia = await new Promise((resolve, reject) => {
            db.query('SELECT imagem, video_url FROM noticias WHERE id = ?', [req.params.id], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
        
        await new Promise((resolve, reject) => {
            db.query('DELETE FROM noticias WHERE id = ?', [req.params.id], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        // Deletar arquivos físicos
        if (noticia[0].imagem) {
            const imagePath = path.join(__dirname, '..', 'public', noticia[0].imagem);
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        }
        if (noticia[0].video_url) {
            const videoPath = path.join(__dirname, '..', 'public', noticia[0].video_url);
            if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao deletar notícia:', error);
        res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
});

// === GESTÃO DE USUÁRIOS (APENAS MASTER) ===

router.get('/usuarios', isAdmin, isMaster, async (req, res) => {
    try {
        const usuarios = await new Promise((resolve, reject) => {
            db.query(`
                SELECT id, nome, email, tipo_usuario, verificado, criado_em, ultimo_acesso 
                FROM usuarios 
                ORDER BY criado_em DESC
            `, (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        res.render('admin/usuarios/index', {
            title: 'Gestão de Usuários',
            admin: req.admin,
            usuarios
        });
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).send('Erro interno do servidor');
    }
});

// Promover usuário para admin
router.post('/usuarios/:id/promover', isAdmin, isMaster, logAdminAction('promover_usuario', 'usuarios'), async (req, res) => {
    try {
        await new Promise((resolve, reject) => {
            db.query('UPDATE usuarios SET tipo_usuario = "admin" WHERE id = ?', [req.params.id], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
        
        req.flash('success', 'Usuário promovido para administrador!');
        res.redirect('/admin/usuarios');
    } catch (error) {
        console.error('Erro ao promover usuário:', error);
        req.flash('error', 'Erro ao promover usuário');
        res.redirect('/admin/usuarios');
    }
});

// ===== ADICIONE AO FINAL DO SEU routes/admin.js =====

// === CONFIGURAÇÕES DO SISTEMA (APENAS MASTER) ===

// Página principal de configurações
router.get('/configuracoes', isAdmin, isMaster, async (req, res) => {
    try {
        // Estatísticas do sistema
        const stats = await new Promise((resolve, reject) => {
            db.query(`
                SELECT 
                    (SELECT COUNT(*) FROM usuarios) as total_usuarios,
                    (SELECT COUNT(*) FROM usuarios WHERE tipo_usuario = 'admin') as total_admins,
                    (SELECT COUNT(*) FROM noticias) as total_noticias,
                    (SELECT COUNT(*) FROM noticias WHERE publicado = 1) as noticias_publicadas,
                    (SELECT COUNT(*) FROM categorias) as total_categorias,
                    (SELECT COUNT(*) FROM comentarios) as total_comentarios,
                    (SELECT COUNT(*) FROM favoritos) as total_favoritos
            `, (err, results) => {
                if (err) reject(err);
                else resolve(results[0]);
            });
        });

        // Últimas atividades dos logs
        const ultimasAtividades = await new Promise((resolve, reject) => {
            db.query(`
                SELECT l.*, u.nome as admin_nome 
                FROM logs_admin l 
                LEFT JOIN usuarios u ON l.admin_id = u.id 
                ORDER BY l.criado_em DESC 
                LIMIT 10
            `, (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        // Informações do sistema
        const sistemInfo = {
            node_version: process.version,
            uptime: process.uptime(),
            memoria: process.memoryUsage(),
            data_servidor: new Date().toISOString()
        };

        res.render('admin/configuracoes', {
            title: 'Configurações do Sistema',
            admin: req.admin,
            stats,
            ultimasAtividades,
            sistemInfo
        });
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        res.status(500).send('Erro interno do servidor');
    }
});

// Gestão de categorias
router.get('/categorias', isAdmin, isMaster, async (req, res) => {
    try {
        const categorias = await new Promise((resolve, reject) => {
            db.query(`
                SELECT c.*, 
                       COUNT(n.id) as total_noticias,
                       COUNT(uc.id) as usuarios_interessados
                FROM categorias c 
                LEFT JOIN noticias n ON c.id = n.categoria_id 
                LEFT JOIN usuario_categorias uc ON c.id = uc.categoria_id 
                GROUP BY c.id 
                ORDER BY c.nome
            `, (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        res.render('admin/categorias', {
            title: 'Gestão de Categorias',
            admin: req.admin,
            categorias
        });
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        res.status(500).send('Erro interno do servidor');
    }
});

// Criar nova categoria
router.post('/categorias', isAdmin, isMaster, logAdminAction('criar_categoria', 'categorias'), async (req, res) => {
    try {
        const { nome, descricao, icone, cor } = req.body;

        if (!nome) {
            req.flash('error', 'Nome da categoria é obrigatório');
            return res.redirect('/admin/categorias');
        }

        await new Promise((resolve, reject) => {
            db.query(
                'INSERT INTO categorias (nome, descricao, icone, cor) VALUES (?, ?, ?, ?)',
                [nome, descricao, icone || '📰', cor || '#6366f1'],
                (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                }
            );
        });

        req.flash('success', 'Categoria criada com sucesso!');
        res.redirect('/admin/categorias');
    } catch (error) {
        console.error('Erro ao criar categoria:', error);
        req.flash('error', 'Erro ao criar categoria');
        res.redirect('/admin/categorias');
    }
});

// Atualizar categoria
router.post('/categorias/:id', isAdmin, isMaster, logAdminAction('atualizar_categoria', 'categorias'), async (req, res) => {
    try {
        const { nome, descricao, icone, cor } = req.body;

        await new Promise((resolve, reject) => {
            db.query(
                'UPDATE categorias SET nome = ?, descricao = ?, icone = ?, cor = ? WHERE id = ?',
                [nome, descricao, icone, cor, req.params.id],
                (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                }
            );
        });

        req.flash('success', 'Categoria atualizada com sucesso!');
        res.redirect('/admin/categorias');
    } catch (error) {
        console.error('Erro ao atualizar categoria:', error);
        req.flash('error', 'Erro ao atualizar categoria');
        res.redirect('/admin/categorias');
    }
});

// Deletar categoria
router.delete('/categorias/:id', isAdmin, isMaster, logAdminAction('deletar_categoria', 'categorias'), async (req, res) => {
    try {
        // Verificar se há notícias usando esta categoria
        const noticiasUsando = await new Promise((resolve, reject) => {
            db.query('SELECT COUNT(*) as count FROM noticias WHERE categoria_id = ?', [req.params.id], (err, results) => {
                if (err) reject(err);
                else resolve(results[0].count);
            });
        });

        if (noticiasUsando > 0) {
            return res.status(400).json({ 
                success: false, 
                error: `Não é possível deletar. Há ${noticiasUsando} notícia(s) usando esta categoria.` 
            });
        }

        await new Promise((resolve, reject) => {
            db.query('DELETE FROM categorias WHERE id = ?', [req.params.id], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao deletar categoria:', error);
        res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
});

// Limpar logs antigos
router.post('/configuracoes/limpar-logs', isAdmin, isMaster, async (req, res) => {
    try {
        const { dias } = req.body;
        const diasInt = parseInt(dias) || 30;

        await new Promise((resolve, reject) => {
            db.query(
                'DELETE FROM logs_admin WHERE criado_em < DATE_SUB(NOW(), INTERVAL ? DAY)',
                [diasInt],
                (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                }
            );
        });

        req.flash('success', `Logs anteriores a ${diasInt} dias foram removidos!`);
        res.redirect('/admin/configuracoes');
    } catch (error) {
        console.error('Erro ao limpar logs:', error);
        req.flash('error', 'Erro ao limpar logs');
        res.redirect('/admin/configuracoes');
    }
});

// Backup do banco de dados
router.post('/configuracoes/backup', isAdmin, isMaster, async (req, res) => {
    try {
        // Aqui você implementaria o backup real
        req.flash('info', 'Funcionalidade de backup será implementada em breve');
        res.redirect('/admin/configuracoes');
    } catch (error) {
        console.error('Erro no backup:', error);
        req.flash('error', 'Erro ao fazer backup');
        res.redirect('/admin/configuracoes');
    }
});

module.exports = router;