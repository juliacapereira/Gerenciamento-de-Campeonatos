-- ============================================================
-- SISTEMA DE GERENCIAMENTO DE CAMPEONATOS AMADORES
-- MySQL 8+ / Aiven
-- Banco utilizado: defaultdb
-- Execução pelo Node.js utilizando mysql2
-- ============================================================


-- ============================================================
-- 1. USUÁRIO / ADMINISTRADOR
-- ============================================================

CREATE TABLE IF NOT EXISTS usuario (
    id_usuario BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 2. ESPORTE
-- ============================================================

CREATE TABLE IF NOT EXISTS esporte (
    id_esporte BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 3. CAMPEONATO
-- ============================================================

CREATE TABLE IF NOT EXISTS campeonato (
    id_campeonato BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_esporte BIGINT UNSIGNED NOT NULL,

    nome VARCHAR(150) NOT NULL,
    descricao TEXT,

    data_inicial DATE NOT NULL,
    data_fim DATE NOT NULL,

    status ENUM(
        'PLANEJADO',
        'INSCRICOES',
        'EM_ANDAMENTO',
        'ENCERRADO'
    ) NOT NULL DEFAULT 'PLANEJADO',

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_campeonato_esporte
        FOREIGN KEY (id_esporte)
        REFERENCES esporte(id_esporte),

    CONSTRAINT ck_campeonato_datas
        CHECK (data_fim >= data_inicial),

    CONSTRAINT uq_campeonato
        UNIQUE (nome, id_esporte, data_inicial)
);


-- ============================================================
-- 4. TIME
-- ============================================================

CREATE TABLE IF NOT EXISTS time (
    id_time BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_esporte BIGINT UNSIGNED,

    nome VARCHAR(150) NOT NULL,
    nome_abreviado VARCHAR(30),

    cidade VARCHAR(100),
    descricao TEXT,

    escudo_url VARCHAR(500),

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_time_esporte
        FOREIGN KEY (id_esporte)
        REFERENCES esporte(id_esporte),

    CONSTRAINT uq_time_nome
        UNIQUE (nome)
);


-- ============================================================
-- 5. JOGADOR
-- ============================================================

CREATE TABLE IF NOT EXISTS jogador (
    id_jogador BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    nome VARCHAR(150) NOT NULL,
    data_nascimento DATE,

    documento VARCHAR(30) UNIQUE,

    foto_url VARCHAR(500),

    posicao VARCHAR(80),

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 6. ELENCO
-- ============================================================

CREATE TABLE IF NOT EXISTS elenco (
    id_elenco BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_time BIGINT UNSIGNED NOT NULL,
    id_jogador BIGINT UNSIGNED NOT NULL,

    numero_camisa INT,
    posicao VARCHAR(80),

    data_entrada DATE NOT NULL DEFAULT (CURRENT_DATE),
    data_saida DATE,

    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_elenco_time
        FOREIGN KEY (id_time)
        REFERENCES time(id_time)
        ON DELETE CASCADE,

    CONSTRAINT fk_elenco_jogador
        FOREIGN KEY (id_jogador)
        REFERENCES jogador(id_jogador)
        ON DELETE CASCADE,

    CONSTRAINT uq_elenco_time_jogador
        UNIQUE (id_time, id_jogador),

    CONSTRAINT ck_elenco_numero_camisa
        CHECK (
            numero_camisa IS NULL
            OR numero_camisa >= 0
        ),

    CONSTRAINT ck_elenco_datas
        CHECK (
            data_saida IS NULL
            OR data_saida >= data_entrada
        )
);


-- ============================================================
-- 7. TIMES INSCRITOS NO CAMPEONATO
-- ============================================================

CREATE TABLE IF NOT EXISTS campeonato_time (
    id_campeonato_time BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_campeonato BIGINT UNSIGNED NOT NULL,
    id_time BIGINT UNSIGNED NOT NULL,

    data_inscricao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_campeonato_time_campeonato
        FOREIGN KEY (id_campeonato)
        REFERENCES campeonato(id_campeonato)
        ON DELETE CASCADE,

    CONSTRAINT fk_campeonato_time_time
        FOREIGN KEY (id_time)
        REFERENCES time(id_time)
        ON DELETE CASCADE,

    CONSTRAINT uq_campeonato_time
        UNIQUE (id_campeonato, id_time)
);


-- ============================================================
-- 8. CONDIÇÕES CLIMÁTICAS
-- ============================================================

CREATE TABLE IF NOT EXISTS condicao_climatica (
    id_condicao BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    descricao VARCHAR(100) NOT NULL UNIQUE
);


-- ============================================================
-- 9. PARTIDA
-- ============================================================

CREATE TABLE IF NOT EXISTS partida (
    id_partida BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_campeonato BIGINT UNSIGNED NOT NULL,

    id_time_a BIGINT UNSIGNED NOT NULL,
    id_time_b BIGINT UNSIGNED NOT NULL,

    data_hora DATETIME NOT NULL,

    local VARCHAR(255),

    id_condicao BIGINT UNSIGNED,

    clima_observacao VARCHAR(255),

    status ENUM(
        'AGENDADA',
        'EM_ANDAMENTO',
        'ENCERRADA',
        'ADIADA',
        'CANCELADA'
    ) NOT NULL DEFAULT 'AGENDADA',

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_partida_campeonato
        FOREIGN KEY (id_campeonato)
        REFERENCES campeonato(id_campeonato)
        ON DELETE CASCADE,

    CONSTRAINT fk_partida_time_a
        FOREIGN KEY (id_time_a)
        REFERENCES time(id_time),

    CONSTRAINT fk_partida_time_b
        FOREIGN KEY (id_time_b)
        REFERENCES time(id_time),

    CONSTRAINT fk_partida_condicao
        FOREIGN KEY (id_condicao)
        REFERENCES condicao_climatica(id_condicao),

    CONSTRAINT ck_times_diferentes
        CHECK (id_time_a <> id_time_b)
);


-- ============================================================
-- 10. RESULTADO
-- ============================================================

CREATE TABLE IF NOT EXISTS resultado (
    id_resultado BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_partida BIGINT UNSIGNED NOT NULL UNIQUE,

    placar_time_a INT NOT NULL,
    placar_time_b INT NOT NULL,

    registrado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_resultado_partida
        FOREIGN KEY (id_partida)
        REFERENCES partida(id_partida)
        ON DELETE CASCADE,

    CONSTRAINT ck_resultado_placar
        CHECK (
            placar_time_a >= 0
            AND placar_time_b >= 0
        )
);


-- ============================================================
-- 11. GOLS / PONTOS
-- ============================================================

CREATE TABLE IF NOT EXISTS pontuacao (
    id_pontuacao BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_partida BIGINT UNSIGNED NOT NULL,
    id_time BIGINT UNSIGNED NOT NULL,
    id_jogador BIGINT UNSIGNED,

    quantidade INT NOT NULL DEFAULT 1,

    minuto INT,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pontuacao_partida
        FOREIGN KEY (id_partida)
        REFERENCES partida(id_partida)
        ON DELETE CASCADE,

    CONSTRAINT fk_pontuacao_time
        FOREIGN KEY (id_time)
        REFERENCES time(id_time),

    CONSTRAINT fk_pontuacao_jogador
        FOREIGN KEY (id_jogador)
        REFERENCES jogador(id_jogador),

    CONSTRAINT ck_pontuacao_quantidade
        CHECK (quantidade > 0),

    CONSTRAINT ck_pontuacao_minuto
        CHECK (
            minuto IS NULL
            OR minuto >= 0
        )
);


-- ============================================================
-- 12. ACONTECIMENTOS
-- ============================================================

CREATE TABLE IF NOT EXISTS acontecimento (
    id_acontecimento BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_partida BIGINT UNSIGNED NOT NULL,

    id_time BIGINT UNSIGNED,
    id_jogador BIGINT UNSIGNED,

    tipo VARCHAR(60) NOT NULL,

    minuto INT,

    descricao TEXT,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_acontecimento_partida
        FOREIGN KEY (id_partida)
        REFERENCES partida(id_partida)
        ON DELETE CASCADE,

    CONSTRAINT fk_acontecimento_time
        FOREIGN KEY (id_time)
        REFERENCES time(id_time),

    CONSTRAINT fk_acontecimento_jogador
        FOREIGN KEY (id_jogador)
        REFERENCES jogador(id_jogador),

    CONSTRAINT ck_acontecimento_minuto
        CHECK (
            minuto IS NULL
            OR minuto >= 0
        )
);


-- ============================================================
-- 13. REGRAS DE PONTUAÇÃO
-- ============================================================

CREATE TABLE IF NOT EXISTS regra_pontuacao (
    id_regra BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_esporte BIGINT UNSIGNED NOT NULL UNIQUE,

    pontos_vitoria INT NOT NULL DEFAULT 3,
    pontos_empate INT NOT NULL DEFAULT 1,
    pontos_derrota INT NOT NULL DEFAULT 0,

    CONSTRAINT fk_regra_esporte
        FOREIGN KEY (id_esporte)
        REFERENCES esporte(id_esporte)
        ON DELETE CASCADE
);


-- ============================================================
-- 14. CRITÉRIOS DE DESEMPATE
-- ============================================================

CREATE TABLE IF NOT EXISTS criterio_desempate (
    id_criterio BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_campeonato BIGINT UNSIGNED NOT NULL,

    ordem INT NOT NULL,

    criterio VARCHAR(50) NOT NULL,

    CONSTRAINT fk_criterio_campeonato
        FOREIGN KEY (id_campeonato)
        REFERENCES campeonato(id_campeonato)
        ON DELETE CASCADE,

    CONSTRAINT uq_criterio_ordem
        UNIQUE (id_campeonato, ordem),

    CONSTRAINT ck_criterio_ordem
        CHECK (ordem > 0)
);


-- ============================================================
-- TRIGGER 1
-- VALIDAR TIMES AO CADASTRAR PARTIDA
-- ============================================================

DROP TRIGGER IF EXISTS trg_validar_times_partida_insert;

CREATE TRIGGER trg_validar_times_partida_insert
BEFORE INSERT ON partida
FOR EACH ROW
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM campeonato_time
        WHERE id_campeonato = NEW.id_campeonato
          AND id_time = NEW.id_time_a
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Time A não está inscrito neste campeonato';

    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM campeonato_time
        WHERE id_campeonato = NEW.id_campeonato
          AND id_time = NEW.id_time_b
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Time B não está inscrito neste campeonato';

    END IF;

END;


-- ============================================================
-- TRIGGER 2
-- VALIDAR TIMES AO ALTERAR PARTIDA
-- ============================================================

DROP TRIGGER IF EXISTS trg_validar_times_partida_update;

CREATE TRIGGER trg_validar_times_partida_update
BEFORE UPDATE ON partida
FOR EACH ROW
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM campeonato_time
        WHERE id_campeonato = NEW.id_campeonato
          AND id_time = NEW.id_time_a
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Time A não está inscrito neste campeonato';

    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM campeonato_time
        WHERE id_campeonato = NEW.id_campeonato
          AND id_time = NEW.id_time_b
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Time B não está inscrito neste campeonato';

    END IF;

END;


-- ============================================================
-- TRIGGER 3
-- CONFLITO DE HORÁRIO NO CADASTRO
-- ============================================================

DROP TRIGGER IF EXISTS trg_conflito_partida_insert;

CREATE TRIGGER trg_conflito_partida_insert
BEFORE INSERT ON partida
FOR EACH ROW
BEGIN

    IF EXISTS (

        SELECT 1

        FROM partida p

        WHERE p.data_hora = NEW.data_hora

          AND p.status NOT IN (
              'CANCELADA',
              'ADIADA'
          )

          AND (
                 p.id_time_a = NEW.id_time_a
              OR p.id_time_b = NEW.id_time_a
              OR p.id_time_a = NEW.id_time_b
              OR p.id_time_b = NEW.id_time_b
          )

    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Existe conflito de horário para uma das equipes';

    END IF;

END;


-- ============================================================
-- TRIGGER 4
-- CONFLITO DE HORÁRIO NA ALTERAÇÃO
-- ============================================================

DROP TRIGGER IF EXISTS trg_conflito_partida_update;

CREATE TRIGGER trg_conflito_partida_update
BEFORE UPDATE ON partida
FOR EACH ROW
BEGIN

    IF EXISTS (

        SELECT 1

        FROM partida p

        WHERE p.id_partida <> OLD.id_partida

          AND p.data_hora = NEW.data_hora

          AND p.status NOT IN (
              'CANCELADA',
              'ADIADA'
          )

          AND (
                 p.id_time_a = NEW.id_time_a
              OR p.id_time_b = NEW.id_time_a
              OR p.id_time_a = NEW.id_time_b
              OR p.id_time_b = NEW.id_time_b
          )

    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Existe conflito de horário para uma das equipes';

    END IF;

END;


-- ============================================================
-- TRIGGER 5
-- ENCERRAR PARTIDA AO CADASTRAR RESULTADO
-- ============================================================

DROP TRIGGER IF EXISTS trg_resultado_finalizar_partida_insert;

CREATE TRIGGER trg_resultado_finalizar_partida_insert
AFTER INSERT ON resultado
FOR EACH ROW
BEGIN

    UPDATE partida

    SET status = 'ENCERRADA'

    WHERE id_partida = NEW.id_partida;

END;


-- ============================================================
-- TRIGGER 6
-- MANTER PARTIDA ENCERRADA AO ALTERAR RESULTADO
-- ============================================================

DROP TRIGGER IF EXISTS trg_resultado_finalizar_partida_update;

CREATE TRIGGER trg_resultado_finalizar_partida_update
AFTER UPDATE ON resultado
FOR EACH ROW
BEGIN

    UPDATE partida

    SET status = 'ENCERRADA'

    WHERE id_partida = NEW.id_partida;

END;


-- ============================================================
-- VIEW 1 - DESEMPENHO DOS TIMES
-- ============================================================

DROP VIEW IF EXISTS vw_desempenho_times;

CREATE VIEW vw_desempenho_times AS

SELECT
    id_campeonato,
    id_time,

    SUM(pj) AS pj,
    SUM(v) AS v,
    SUM(e) AS e,
    SUM(d) AS d,

    SUM(gp) AS gp,
    SUM(gs) AS gs,

    SUM(gp) - SUM(gs) AS sg

FROM (

    SELECT

        p.id_campeonato,

        p.id_time_a AS id_time,

        1 AS pj,

        CASE
            WHEN r.placar_time_a > r.placar_time_b THEN 1
            ELSE 0
        END AS v,

        CASE
            WHEN r.placar_time_a = r.placar_time_b THEN 1
            ELSE 0
        END AS e,

        CASE
            WHEN r.placar_time_a < r.placar_time_b THEN 1
            ELSE 0
        END AS d,

        r.placar_time_a AS gp,
        r.placar_time_b AS gs

    FROM partida p

    INNER JOIN resultado r
        ON r.id_partida = p.id_partida


    UNION ALL


    SELECT

        p.id_campeonato,

        p.id_time_b AS id_time,

        1 AS pj,

        CASE
            WHEN r.placar_time_b > r.placar_time_a THEN 1
            ELSE 0
        END AS v,

        CASE
            WHEN r.placar_time_b = r.placar_time_a THEN 1
            ELSE 0
        END AS e,

        CASE
            WHEN r.placar_time_b < r.placar_time_a THEN 1
            ELSE 0
        END AS d,

        r.placar_time_b AS gp,
        r.placar_time_a AS gs

    FROM partida p

    INNER JOIN resultado r
        ON r.id_partida = p.id_partida

) AS jogos

GROUP BY
    id_campeonato,
    id_time;


-- ============================================================
-- VIEW 2 - CLASSIFICAÇÃO
-- ============================================================

DROP VIEW IF EXISTS vw_classificacao;

CREATE VIEW vw_classificacao AS

SELECT

    ROW_NUMBER() OVER (

        PARTITION BY c.id_campeonato

        ORDER BY

            (
                COALESCE(d.v, 0) * rp.pontos_vitoria
                +
                COALESCE(d.e, 0) * rp.pontos_empate
                +
                COALESCE(d.d, 0) * rp.pontos_derrota
            ) DESC,

            COALESCE(d.v, 0) DESC,

            COALESCE(d.sg, 0) DESC,

            COALESCE(d.gp, 0) DESC

    ) AS posicao,

    c.id_campeonato,

    t.id_time,

    t.nome AS time,

    COALESCE(d.pj, 0) AS pj,
    COALESCE(d.v, 0) AS v,
    COALESCE(d.e, 0) AS e,
    COALESCE(d.d, 0) AS d,

    COALESCE(d.gp, 0) AS gp,
    COALESCE(d.gs, 0) AS gs,
    COALESCE(d.sg, 0) AS sg,

    (
        COALESCE(d.v, 0) * rp.pontos_vitoria
        +
        COALESCE(d.e, 0) * rp.pontos_empate
        +
        COALESCE(d.d, 0) * rp.pontos_derrota
    ) AS pts

FROM campeonato_time ct

INNER JOIN campeonato c
    ON c.id_campeonato = ct.id_campeonato

INNER JOIN time t
    ON t.id_time = ct.id_time

INNER JOIN regra_pontuacao rp
    ON rp.id_esporte = c.id_esporte

LEFT JOIN vw_desempenho_times d
    ON d.id_campeonato = c.id_campeonato
   AND d.id_time = t.id_time;


-- ============================================================
-- VIEW 3 - RANKING DOS JOGADORES
-- ============================================================

DROP VIEW IF EXISTS vw_ranking_jogadores;

CREATE VIEW vw_ranking_jogadores AS

SELECT

    p.id_campeonato,

    j.id_jogador,

    j.nome AS jogador,

    t.id_time,

    t.nome AS time,

    SUM(pt.quantidade) AS pontuacao_total

FROM pontuacao pt

INNER JOIN partida p
    ON p.id_partida = pt.id_partida

INNER JOIN jogador j
    ON j.id_jogador = pt.id_jogador

INNER JOIN time t
    ON t.id_time = pt.id_time

WHERE pt.id_jogador IS NOT NULL

GROUP BY

    p.id_campeonato,

    j.id_jogador,

    j.nome,

    t.id_time,

    t.nome;


-- ============================================================
-- DADOS INICIAIS
-- ============================================================

INSERT IGNORE INTO condicao_climatica (descricao)
VALUES
    ('Ensolarado'),
    ('Nublado'),
    ('Chuva'),
    ('Chuva forte'),
    ('Frio'),
    ('Calor'),
    ('Vento forte');


INSERT IGNORE INTO esporte (
    nome,
    descricao
)
VALUES
    ('Futebol', 'Futebol de campo'),
    ('Futsal', 'Futebol de salão'),
    ('Basquete', 'Basquetebol'),
    ('Vôlei', 'Voleibol');


-- ============================================================
-- REGRAS DO FUTEBOL
-- ============================================================

INSERT IGNORE INTO regra_pontuacao (
    id_esporte,
    pontos_vitoria,
    pontos_empate,
    pontos_derrota
)

SELECT
    id_esporte,
    3,
    1,
    0

FROM esporte

WHERE nome = 'Futebol';


-- ============================================================
-- REGRAS DO FUTSAL
-- ============================================================

INSERT IGNORE INTO regra_pontuacao (
    id_esporte,
    pontos_vitoria,
    pontos_empate,
    pontos_derrota
)

SELECT
    id_esporte,
    3,
    1,
    0

FROM esporte

WHERE nome = 'Futsal';


-- ============================================================
-- REGRAS DO BASQUETE
-- ============================================================

INSERT IGNORE INTO regra_pontuacao (
    id_esporte,
    pontos_vitoria,
    pontos_empate,
    pontos_derrota
)

SELECT
    id_esporte,
    2,
    0,
    1

FROM esporte

WHERE nome = 'Basquete';


-- ============================================================
-- REGRAS DO VÔLEI
-- ============================================================

INSERT IGNORE INTO regra_pontuacao (
    id_esporte,
    pontos_vitoria,
    pontos_empate,
    pontos_derrota
)

SELECT
    id_esporte,
    2,
    0,
    1

FROM esporte

WHERE nome = 'Vôlei';