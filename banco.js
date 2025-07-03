const mysql = require('mysql2/promise'); 

async function conectarBD()
{ 
    if(global.conexao && global.conexao.state !== 'disconnected') 
    {
        return global.conexao;
    }
    
    /*
    const connectionString = 'mysql://root:senha@localhost:3306/livraria' 
    const connection= await mysql.createConnection(connectionString)
    */
    
    const conexao = await mysql.createConnection(
        { 
            host     : 'localhost', 
            port     : 3306, 
            user     : 'root',
            password : '', 
            database : 'plataforma_noticias' 
        }); 
        
    console.log('Conectou no MySQL!'); 

    global.conexao = conexao; 
    return global.conexao; 
} 


async function buscarUsuario(usuario)
{
    const conexao = await conectarBD();
    const sql = "select * from usuarios where usuemail=? and ususenha=?;";
    const [usuarioEcontrado] = await conexao.query(sql,[usuario.email, usuario.senha]);
    return usuarioEcontrado && usuarioEcontrado.length>0 ? usuarioEcontrado[0] : {};
}


async function buscarPerfis(usuario)
{
    const conexao = await conectarBD();
    const sql = "select * from perfis where usucodigo=?;";
    const [perfisEcontrados] = await conexao.query(sql,[usuario]);
    return perfisEcontrados;
}


async function buscarPerfil(codigoPerfil)
{
    const conexao = await conectarBD();
    const sql = "select * from perfis where percodigo=?;";
    const [dadosEcontrados] = await conexao.query(sql,[codigoPerfil]);
    return dadosEcontrados[0];
}


// Adicionar estas funções ao seu arquivo banco.js existente

// ========================
// FUNÇÕES DE NOTÍCIAS
// ========================

async function buscarTodasNoticias() {
    const conexao = await conectarBD();
    const sql = `
        SELECT n.*, u.usunome as autor_nome
        FROM noticias n
        LEFT JOIN usuarios u ON n.autor_id = u.usucodigo
        ORDER BY n.criado_em DESC
    `;
    const [noticias] = await conexao.query(sql);
    return noticias;
}

async function buscarNoticiasPublicadas() {
    const conexao = await conectarBD();
    const sql = `
        SELECT n.*, u.usunome as autor_nome
        FROM noticias n
        LEFT JOIN usuarios u ON n.autor_id = u.usucodigo
        WHERE n.publicada = 1
        ORDER BY n.criado_em DESC
    `;
    const [noticias] = await conexao.query(sql);
    return noticias;
}

async function buscarNoticiaPorId(id) {
    const conexao = await conectarBD();
    const sql = `
        SELECT n.*, u.usunome as autor_nome
        FROM noticias n
        LEFT JOIN usuarios u ON n.autor_id = u.usucodigo
        WHERE n.id = ?
    `;
    const [noticia] = await conexao.query(sql, [id]);
    return noticia[0];
}

async function criarNoticia(dadosNoticia) {
    const conexao = await conectarBD();
    const sql = `
        INSERT INTO noticias (titulo, subtitulo, categoria, imagem, conteudo, publicada, autor_id, criado_em)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    const [resultado] = await conexao.query(sql, [
        dadosNoticia.titulo,
        dadosNoticia.subtitulo,
        dadosNoticia.categoria,
        dadosNoticia.imagem,
        dadosNoticia.conteudo,
        dadosNoticia.publicada,
        dadosNoticia.autor_id
    ]);
    return resultado;
}

async function editarNoticia(id, dadosNoticia) {
    const conexao = await conectarBD();
    const sql = `
        UPDATE noticias 
        SET titulo = ?, subtitulo = ?, categoria = ?, imagem = ?, 
            conteudo = ?, publicada = ?, atualizado_em = NOW()
        WHERE id = ?
    `;
    const [resultado] = await conexao.query(sql, [
        dadosNoticia.titulo,
        dadosNoticia.subtitulo,
        dadosNoticia.categoria,
        dadosNoticia.imagem,
        dadosNoticia.conteudo,
        dadosNoticia.publicada,
        id
    ]);
    return resultado;
}

async function deletarNoticia(id) {
    const conexao = await conectarBD();
    const sql = "DELETE FROM noticias WHERE id = ?";
    const [resultado] = await conexao.query(sql, [id]);
    return resultado;
}

// ========================
// CRIAR TABELA DE NOTÍCIAS
// ========================

async function criarTabelaNoticias() {
    const conexao = await conectarBD();
    
    try {
        // Verificar se a tabela já existe
        const [tables] = await conexao.query("SHOW TABLES LIKE 'noticias'");
        
        if (tables.length === 0) {
            // Criar tabela de notícias
            await conexao.query(`
                CREATE TABLE noticias (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    titulo VARCHAR(500) NOT NULL,
                    subtitulo VARCHAR(500),
                    categoria VARCHAR(100),
                    imagem VARCHAR(500),
                    conteudo TEXT NOT NULL,
                    publicada BOOLEAN DEFAULT false,
                    visualizacoes INT DEFAULT 0,
                    autor_id INT,
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (autor_id) REFERENCES usuarios(usucodigo)
                )
            `);
            
            console.log('Tabela de notícias criada com sucesso!');
            
            // Adicionar campo tipo_acesso na tabela perfis se não existir
            try {
                await conexao.query(`
                    ALTER TABLE perfis 
                    ADD COLUMN tipo_acesso ENUM('user', 'admin') DEFAULT 'user'
                `);
                console.log('Campo tipo_acesso adicionado à tabela perfis!');
            } catch (err) {
                // Campo já existe, não é erro
                if (!err.message.includes('Duplicate column')) {
                    console.log('Campo tipo_acesso já existe na tabela perfis');
                }
            }
            
            // Criar usuário admin padrão se não existir
            const [adminExists] = await conexao.query(
                "SELECT * FROM usuarios WHERE usuemail = 'admin@portal.com'"
            );
            
            if (adminExists.length === 0) {
                const [novoAdmin] = await conexao.query(`
                    INSERT INTO usuarios (usuemail, ususenha, usunome) 
                    VALUES ('admin@portal.com', '123456', 'Administrador')
                `);
                
                await conexao.query(`
                    INSERT INTO perfis (usucodigo, pernome, tipo_acesso) 
                    VALUES (?, 'Admin', 'admin')
                `, [novoAdmin.insertId]);
                
                console.log('Usuário admin criado: admin@portal.com / 123456');
            }
        }
    } catch (error) {
        console.error('Erro ao criar estrutura:', error);
    }
}

// Executar criação da tabela quando o arquivo for carregado
criarTabelaNoticias();

// ADICIONAR ao module.exports existente:
module.exports = { 
    // ... suas funções existentes ...
    buscarUsuario, 
    buscarPerfis, 
    buscarPerfil,
    
    // Novas funções de notícias
    buscarTodasNoticias,
    buscarNoticiasPublicadas,
    buscarNoticiaPorId,
    criarNoticia,
    editarNoticia,
    deletarNoticia,
    criarTabelaNoticias
};

conectarBD()

module.exports = { buscarUsuario, buscarPerfis, buscarPerfil }
