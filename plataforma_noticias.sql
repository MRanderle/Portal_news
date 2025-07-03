-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: plataforma_noticias
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `analytics`
--

DROP TABLE IF EXISTS `analytics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `analytics` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) DEFAULT NULL,
  `evento` varchar(100) NOT NULL,
  `pagina` varchar(255) DEFAULT NULL,
  `dados` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`dados`)),
  `ip` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `criado_em` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_analytics_usuario` (`usuario_id`),
  KEY `idx_analytics_evento` (`evento`),
  CONSTRAINT `analytics_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `analytics`
--

LOCK TABLES `analytics` WRITE;
/*!40000 ALTER TABLE `analytics` DISABLE KEYS */;
/*!40000 ALTER TABLE `analytics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categorias`
--

DROP TABLE IF EXISTS `categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categorias` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(50) NOT NULL,
  `descricao` text DEFAULT NULL,
  `icone` varchar(50) DEFAULT NULL,
  `cor` varchar(7) DEFAULT '#6366f1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `nome` (`nome`)
) ENGINE=InnoDB AUTO_INCREMENT=116 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias`
--

LOCK TABLES `categorias` WRITE;
/*!40000 ALTER TABLE `categorias` DISABLE KEYS */;
INSERT INTO `categorias` VALUES (1,'Esportes','Not?cias esportivas','?','#10b981'),(2,'Pol?tica','Not?cias pol?ticas','???','#ef4444'),(3,'Finan?as','Mercado financeiro','??','#f59e0b'),(4,'Tecnologia','Inova??o e tech','??','#3b82f6'),(5,'Sa?de','Sa?de e bem-estar','??','#06b6d4'),(6,'Entretenimento','Cinema, m?sica, celebridades','??','#8b5cf6'),(7,'Ci?ncia','Descobertas cient?ficas','??','#059669'),(8,'Educa??o','Ensino e educa??o','??','#dc2626'),(9,'Meio Ambiente','Sustentabilidade e natureza','??','#16a34a'),(10,'Internacional','Not?cias internacionais','??','#7c3aed'),(12,'Política','Notícias políticas','🏛️','#ef4444'),(13,'Finanças','Mercado financeiro','💰','#f59e0b'),(15,'Saúde','Saúde e bem-estar','🏥','#06b6d4'),(17,'Ciência','Descobertas científicas','🔬','#059669'),(18,'Educação','Ensino e educação','📚','#dc2626');
/*!40000 ALTER TABLE `categorias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comentarios`
--

DROP TABLE IF EXISTS `comentarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `comentarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `noticia_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `comentario` text NOT NULL,
  `aprovado` tinyint(1) DEFAULT 1,
  `criado_em` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `idx_comentarios_noticia` (`noticia_id`),
  CONSTRAINT `comentarios_ibfk_1` FOREIGN KEY (`noticia_id`) REFERENCES `noticias` (`id`) ON DELETE CASCADE,
  CONSTRAINT `comentarios_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comentarios`
--

LOCK TABLES `comentarios` WRITE;
/*!40000 ALTER TABLE `comentarios` DISABLE KEYS */;
/*!40000 ALTER TABLE `comentarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `favoritos`
--

DROP TABLE IF EXISTS `favoritos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `favoritos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `noticia_id` int(11) NOT NULL,
  `criado_em` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_favorito` (`usuario_id`,`noticia_id`),
  KEY `idx_favoritos_usuario` (`usuario_id`),
  KEY `idx_favoritos_noticia` (`noticia_id`),
  CONSTRAINT `favoritos_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `favoritos_ibfk_2` FOREIGN KEY (`noticia_id`) REFERENCES `noticias` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `favoritos`
--

LOCK TABLES `favoritos` WRITE;
/*!40000 ALTER TABLE `favoritos` DISABLE KEYS */;
/*!40000 ALTER TABLE `favoritos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `noticias`
--

DROP TABLE IF EXISTS `noticias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `noticias` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `titulo` varchar(255) NOT NULL,
  `subtitulo` text DEFAULT NULL,
  `conteudo` text NOT NULL,
  `imagem` varchar(255) DEFAULT NULL,
  `categoria_id` int(11) DEFAULT NULL,
  `autor` varchar(100) DEFAULT NULL,
  `fonte` varchar(100) DEFAULT NULL,
  `url_externa` varchar(500) DEFAULT NULL,
  `visualizacoes` int(11) DEFAULT 0,
  `criado_em` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_noticias_categoria` (`categoria_id`),
  KEY `idx_noticias_criado_em` (`criado_em`),
  CONSTRAINT `noticias_ibfk_1` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `noticias`
--

LOCK TABLES `noticias` WRITE;
/*!40000 ALTER TABLE `noticias` DISABLE KEYS */;
INSERT INTO `noticias` VALUES (1,'Brasil vence Copa do Mundo de Futebol','Sele??o brasileira conquista o hexacampeonato mundial','O Brasil conquistou seu sexto t?tulo mundial de futebol ap?s uma final emocionante contra a Argentina. A partida terminou 2x1 para o Brasil, com gols de Neymar e Vinicius Jr. O t?cnico Tite destacou a import?ncia da prepara??o da equipe e o apoio da torcida brasileira. Esta vit?ria marca o retorno do Brasil ao topo do futebol mundial ap?s 20 anos sem conquistar uma Copa do Mundo.',NULL,1,'Jo?o Silva','Globo Esporte',NULL,1250,'2025-05-30 21:48:03'),(2,'Corinthians contrata novo t?cnico','Clube paulista anuncia mudan?a no comando t?cnico','O Sport Club Corinthians Paulista anunciou oficialmente a contrata??o de seu novo t?cnico para a temporada 2025. O profissional chega com a miss?o de reconquistar a torcida e buscar t?tulos importantes. A diretoria investiu pesado na reformula??o do elenco e espera resultados positivos j? nos primeiros jogos do ano.',NULL,1,'Pedro Almeida','Lance!',NULL,432,'2025-05-30 21:48:03'),(3,'Nova lei de prote??o de dados aprovada','Congresso aprova marco regulat?rio para privacidade digital','O Congresso Nacional aprovou por unanimidade a nova lei de prote??o de dados pessoais, que entrar? em vigor no pr?ximo ano. A legisla??o estabelece regras mais r?gidas para empresas que coletam informa??es de usu?rios e prev? multas de at? R$ 50 milh?es para viola??es. Especialistas consideram um avan?o importante para a prote??o da privacidade dos brasileiros.',NULL,2,'Ana Rodrigues','Folha de S.Paulo',NULL,789,'2025-05-30 21:48:03'),(4,'Mercado financeiro em alta nesta semana','Bolsa de valores registra crescimento de 3%','Os principais ?ndices da bolsa brasileira fecharam a semana em alta, impulsionados pelo setor de tecnologia e commodities. O Ibovespa subiu 3,2%, refletindo otimismo dos investidores com os resultados das empresas e perspectivas econ?micas positivas. Analistas preveem continuidade da tend?ncia de alta nas pr?ximas semanas.',NULL,3,'Carlos Oliveira','InfoMoney',NULL,567,'2025-05-30 21:48:03'),(5,'Bitcoin atinge novo recorde hist?rico','Criptomoeda supera marca de US$ 100 mil','O Bitcoin atingiu um novo recorde hist?rico, superando a marca de US$ 100 mil pela primeira vez. O aumento ? atribu?do ? maior ado??o institucional e expectativas de regulamenta??o mais favor?vel. Investidores demonstram otimismo com o futuro das criptomoedas, mas especialistas alertam para a volatilidade do mercado.',NULL,3,'Marcos Ferreira','Valor Econ?mico',NULL,1100,'2025-05-30 21:48:03'),(6,'Nova tecnologia de IA revoluciona medicina','Intelig?ncia artificial ajuda no diagn?stico precoce de doen?as','Pesquisadores da Universidade de S?o Paulo desenvolveram uma nova intelig?ncia artificial capaz de detectar c?ncer com 95% de precis?o. A tecnologia promete revolucionar o diagn?stico m?dico precoce, permitindo tratamentos mais eficazes e salvando milhares de vidas. Os testes cl?nicos come?ar?o no pr?ximo semestre em hospitais de refer?ncia.',NULL,4,'Maria Santos','TechNews',NULL,890,'2025-05-30 21:48:03'),(7,'Apple lan?a novo iPhone com IA integrada','Smartphone traz recursos de intelig?ncia artificial avan?ados','A Apple apresentou seu mais novo iPhone, equipado com chip de intelig?ncia artificial de ?ltima gera??o. O dispositivo promete experi?ncia de usu?rio revolucion?ria, com assistente pessoal mais inteligente e c?mera com capacidades fotogr?ficas profissionais. O lan?amento est? previsto para o pr?ximo m?s no Brasil.',NULL,4,'Roberto Costa','Techbit',NULL,654,'2025-05-30 21:48:03'),(8,'Vacina contra Alzheimer mostra resultados promissores','Pesquisa brasileira desenvolve imunizante contra dem?ncia','Cientistas da USP desenvolveram uma vacina experimental contra o Alzheimer que mostrou resultados promissores em testes com animais. A pesquisa representa um avan?o significativo na luta contra a dem?ncia, oferecendo esperan?a para milh?es de fam?lias afetadas pela doen?a. Os testes em humanos devem come?ar em 2026.',NULL,5,'Dra. Carla Mendes','Sa?de Total',NULL,445,'2025-05-30 21:48:03'),(9,'Festival de cinema movimenta a cidade','Evento re?ne produ??es nacionais e internacionais','O 15? Festival Internacional de Cinema trouxe grandes nomes do cinema mundial para S?o Paulo. Durante uma semana, a cidade recebeu diretores, atores e produtores, movimentando a economia local e promovendo a cultura cinematogr?fica brasileira. O evento premiou 15 filmes em diferentes categorias.',NULL,6,'Pedro Lima','Cultura Viva',NULL,298,'2025-05-30 21:48:03'),(10,'S?rie brasileira ganha Emmy Internacional','Produ??o nacional ? reconhecida mundialmente','A s?rie brasileira \"Cidades Invis?veis\" conquistou o Emmy Internacional na categoria Melhor Drama. O pr?mio marca um momento hist?rico para a televis?o brasileira, reconhecendo a qualidade das produ??es nacionais no cen?rio mundial. O elenco e equipe t?cnica celebraram a conquista em cerim?nia luxuosa.',NULL,6,'Juliana Moraes','TV & Famosos',NULL,876,'2025-05-30 21:48:03'),(11,'Descoberta revolucion?ria na ?rea de energia limpa','Nova c?lula solar atinge efici?ncia de 50%','Cientistas da Universidade Federal do Rio de Janeiro desenvolveram uma c?lula solar com efici?ncia recorde de 50%, superando os 22% das c?lulas convencionais. A descoberta promete revolucionar o setor de energia renov?vel e acelerar a transi??o energ?tica global. A tecnologia deve estar dispon?vel comercialmente em 3 anos.',NULL,7,'Ana Costa','Ci?ncia Hoje',NULL,432,'2025-05-30 21:48:03'),(12,'Telesc?pio brasileiro descobre novo planeta','Exoplaneta pode ter condi??es para vida','Astr?nomos brasileiros descobriram um novo exoplaneta potencialmente habit?vel a 40 anos-luz da Terra. O planeta, batizado de \"Terra Brasilis\", possui caracter?sticas similares ao nosso planeta e pode abrigar ?gua l?quida. A descoberta foi feita usando o telesc?pio do Observat?rio Nacional e ser? publicada na revista Nature.',NULL,7,'Prof. Eduardo Silva','Astronomy Brasil',NULL,721,'2025-05-30 21:48:03'),(13,'Novo modelo de ensino p?blico revoluciona aprendizado','Escolas adotam metodologia inovadora com resultados surpreendentes','Escolas p?blicas de S?o Paulo implementaram um novo modelo pedag?gico que combina tecnologia e m?todos tradicionais. Os resultados mostram melhoria de 40% no aprendizado dos alunos. A metodologia ser? expandida para outras cidades do estado no pr?ximo ano letivo.',NULL,8,'Prof. Sandra Lima','Educa??o & Ensino',NULL,365,'2025-05-30 21:48:03'),(14,'Projeto de reflorestamento da Amaz?nia bate recorde','Iniciativa planta 1 milh?o de ?rvores em um ano','O maior projeto de reflorestamento da Amaz?nia atingiu a marca de 1 milh?o de ?rvores plantadas em apenas um ano. A iniciativa envolve comunidades locais, ONGs e empresas privadas em um esfor?o conjunto para recuperar ?reas desmatadas. O projeto j? gerou mais de 500 empregos diretos na regi?o.',NULL,9,'Bi?logo Jo?o Verde','EcoNews',NULL,543,'2025-05-30 21:48:03'),(15,'Acordo clim?tico hist?rico ? assinado em Dubai','Pa?ses se comprometem com meta ambiciosa de redu??o de emiss?es','Representantes de 195 pa?ses assinaram um acordo clim?tico hist?rico durante a COP30 em Dubai. O acordo estabelece metas ambiciosas para redu??o de emiss?es de carbono at? 2030. Brasil assume papel de lideran?a nas negocia??es, propondo solu??es inovadoras para preserva??o ambiental global.',NULL,10,'Correspondente Internacional','Global News',NULL,987,'2025-05-30 21:48:03');
/*!40000 ALTER TABLE `noticias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notificacoes`
--

DROP TABLE IF EXISTS `notificacoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notificacoes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `mensagem` text DEFAULT NULL,
  `tipo` enum('noticia','sistema','categoria') DEFAULT 'noticia',
  `lida` tinyint(1) DEFAULT 0,
  `dados` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`dados`)),
  `criado_em` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_notificacoes_usuario` (`usuario_id`),
  KEY `idx_notificacoes_lida` (`lida`),
  CONSTRAINT `notificacoes_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notificacoes`
--

LOCK TABLES `notificacoes` WRITE;
/*!40000 ALTER TABLE `notificacoes` DISABLE KEYS */;
/*!40000 ALTER TABLE `notificacoes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuario_categorias`
--

DROP TABLE IF EXISTS `usuario_categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `usuario_categorias` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) DEFAULT NULL,
  `categoria_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_category` (`usuario_id`,`categoria_id`),
  KEY `categoria_id` (`categoria_id`),
  CONSTRAINT `usuario_categorias_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `usuario_categorias_ibfk_2` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuario_categorias`
--

LOCK TABLES `usuario_categorias` WRITE;
/*!40000 ALTER TABLE `usuario_categorias` DISABLE KEYS */;
INSERT INTO `usuario_categorias` VALUES (17,1,4);
/*!40000 ALTER TABLE `usuario_categorias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `senha` varchar(255) NOT NULL,
  `foto_perfil` varchar(255) DEFAULT NULL,
  `verificado` tinyint(1) DEFAULT 0,
  `token_verificacao` varchar(255) DEFAULT NULL,
  `criado_em` timestamp NOT NULL DEFAULT current_timestamp(),
  `atualizado_em` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `dark_mode` tinyint(1) DEFAULT 0,
  `notificacoes_email` tinyint(1) DEFAULT 1,
  `ultimo_acesso` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'Alisson Gabriel Anderle','olokobinchohihi@gmail.com','$2a$10$P0LTmF5LZCFkITxPAgw9x.yilMWO38/VnvZoM8mFToTXLA91CtC8C',NULL,1,NULL,'2025-05-31 12:59:54','2025-05-31 21:30:15',0,1,NULL),(8,'Juarez anderle','alisson.anderle@hotmail.com','$2a$12$iJ35gDNfWZaW7BHfJ2iYPeetXlKLuYwyapSXFfro7qDVl/1BxYrXy',NULL,0,'083a35dfd53ab5672f45d7c3a6ec4cbda161b58689711550e8182b3ab96ba6ae','2025-05-31 21:45:06','2025-05-31 21:45:06',0,1,NULL);
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-05-31 19:12:03
