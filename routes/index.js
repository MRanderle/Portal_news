//////////// INDEX.JS //////////////////
var express = require('express');
var router = express.Router();


router.get('/', function(req, res, next) {
  if (global.usuarioEmail && global.usuarioEmail != "") {
    res.redirect('/browse');
  }

  res.render('index', { titulo: 'MFlix - Login' });
});

router.get('/perfis', async function(req, res, next) {
  verificarLogin(res);
  const registrosPerfis = await global.banco.buscarPerfis(global.usuarioCodigo);

  if (registrosPerfis.length == 1)
  {
    global.perfilCodigo = registrosPerfis[0].percodigo;
    res.redirect('/browse');
  } 

  res.render('perfis', { titulo: 'MFlix - Escolha de Perfil', registrosPerfis });
});

router.get('/entrarPerfil/:id', async function(req, res, next) {
  verificarLogin(res);
  const codigoPerfil = parseInt(req.params.id);
  const dadosPerfil = await global.banco.buscarPerfil(codigoPerfil);
  global.perfil = dadosPerfil;
  res.redirect('/browse');
});

router.get('/browse', function(req, res, next) {
  verificarLogin(res);
  res.render('browse', { titulo: 'MFlix - Escolha de Vídeo', imagem: global.perfil.perfoto });
});

router.post('/login', async function(req, res, next){
  const email = req.body.email ;
  const senha = req.body.senha;

  const usuario = await global.banco.buscarUsuario({email,senha});

  global.usuarioCodigo = usuario.usucodigo;
  global.usuarioEmail = usuario.usuemail;
  res.redirect('/perfis');
})

function verificarLogin(res)
{
  if (!global.usuarioEmail || global.usuarioEmail == "")
    res.redirect('/');
}


// Rota para relatório completo de notícias (usando VIEW 1)
router.get('/relatorio/noticias', isAdmin, async (req, res) => {
    try {
        const { categoria, status, dias } = req.query;
        
        let whereClause = '';
        let params = [];
        
        if (categoria && categoria !== 'todas') {
            whereClause += ' WHERE categoria_nome = ?';
            params.push(categoria);
        }
        
        if (status && status !== 'todos') {
            whereClause += (whereClause ? ' AND' : ' WHERE') + ' status_publicacao = ?';
            params.push(status);
        }
        
        if (dias) {
            whereClause += (whereClause ? ' AND' : ' WHERE') + ' dias_desde_criacao <= ?';
            params.push(parseInt(dias));
        }

        const noticias = await new Promise((resolve, reject) => {
            db.query(`
                SELECT * FROM vw_noticias_completas 
                ${whereClause}
                ORDER BY criado_em DESC
            `, params, (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        // Buscar categorias para filtro
        const categorias = await new Promise((resolve, reject) => {
            db.query('SELECT nome FROM categorias ORDER BY nome', (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        res.render('admin/relatorio-noticias', {
            title: 'Relatório Completo de Notícias',
            admin: req.admin,
            noticias,
            categorias,
            filtros: { categoria, status, dias }
        });
    } catch (error) {
        console.error('Erro no relatório de notícias:', error);
        res.status(500).send('Erro interno do servidor');
    }
});

// Rota para dashboard de performance (usando VIEW 2)
router.get('/dashboard/performance', isAdmin, async (req, res) => {
    try {
        const performance = await new Promise((resolve, reject) => {
            db.query(`
                SELECT * FROM vw_performance_categorias 
                ORDER BY total_noticias DESC
            `, (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        // Estatísticas gerais
        const estatisticasGerais = await new Promise((resolve, reject) => {
            db.query(`
                SELECT 
                    SUM(total_noticias) as total_sistema,
                    SUM(noticias_publicadas) as total_publicadas,
                    SUM(rascunhos) as total_rascunhos,
                    AVG(taxa_publicacao) as taxa_media_publicacao,
                    COUNT(*) as total_categorias
                FROM vw_performance_categorias
            `, (err, results) => {
                if (err) reject(err);
                else resolve(results[0]);
            });
        });

        res.render('admin/dashboard-performance', {
            title: 'Dashboard de Performance',
            admin: req.admin,
            performance,
            estatisticasGerais
        });
    } catch (error) {
        console.error('Erro no dashboard de performance:', error);
        res.status(500).send('Erro interno do servidor');
    }
});

// API para dados das views (formato JSON)
router.get('/api/noticias-completas', isAdmin, async (req, res) => {
    try {
        const noticias = await new Promise((resolve, reject) => {
            db.query('SELECT * FROM vw_noticias_completas ORDER BY criado_em DESC LIMIT 50', (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
        
        res.json(noticias);
    } catch (error) {
        console.error('Erro API notícias completas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

router.get('/api/performance-categorias', isAdmin, async (req, res) => {
    try {
        const performance = await new Promise((resolve, reject) => {
            db.query('SELECT * FROM vw_performance_categorias ORDER BY total_noticias DESC', (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
        
        res.json(performance);
    } catch (error) {
        console.error('Erro API performance categorias:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
