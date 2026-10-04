import express from "express";
import bcrypt from "bcryptjs";
import pool from "../../database.js";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";

const router = express.Router();

// US01 - Cadastro de Administrador
router.post("/cadastro", async (req, res) => {
  try {
    const { nome, email, senha } = req.body ?? {};

    // 1. Validar tipos e campos obrigatórios
    if (
      typeof nome !== "string" ||
      typeof email !== "string" ||
      typeof senha !== "string"
    ) {
      return res.status(400).json({
        erro: "Nome, e-mail e senha são obrigatórios."
      });
    }

    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim().toLowerCase();

    // 2. Validar nome e e-mail
    const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      nomeLimpo.length < 2 ||
      nomeLimpo.length > 120 ||
      emailLimpo.length > 180 ||
      !formatoEmail.test(emailLimpo)
    ) {
      return res.status(400).json({
        erro: "Nome ou e-mail inválido."
      });
    }

    // 3. Validar segurança da senha
    if (
      senha.length < 8 ||
      !/[A-Z]/.test(senha) ||
      !/[a-z]/.test(senha) ||
      !/[0-9]/.test(senha) ||
      Buffer.byteLength(senha, "utf8") > 72
    ) {
      return res.status(400).json({
        erro:
          "A senha precisa ter pelo menos 8 caracteres, " +
          "letras maiúsculas, minúsculas e números, " +
          "e no máximo 72 bytes."
      });
    }

    // 4. Verificar duplicidade
    const [usuarios] = await pool.execute(
      "SELECT id_usuario FROM usuario WHERE email = ? LIMIT 1",
      [emailLimpo]
    );

    if (usuarios.length > 0) {
      return res.status(409).json({
        erro: "Este e-mail já está cadastrado."
      });
    }

    // 5. Proteger a senha
    const senhaHash = await bcrypt.hash(senha, 12);

    // 6. Salvar no banco
    const [resultado] = await pool.execute(
      `INSERT INTO usuario
       (nome, email, senha_hash)
       VALUES (?, ?, ?)`,
      [nomeLimpo, emailLimpo, senhaHash]
    );

    // 7. Retornar sucesso sem expor a senha
    return res.status(201).json({
      mensagem: "Administrador cadastrado com sucesso!",
      usuario: {
        id: String(resultado.insertId),
        nome: nomeLimpo,
        email: emailLimpo
      }
    });

  } catch (erro) {
    if (erro.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        erro: "Este e-mail já está cadastrado."
      });
    }

    console.error("Erro no cadastro:", erro);

    return res.status(500).json({
      erro: "Erro interno ao cadastrar administrador."
    });
  }
});

// ============================================================
// US02 - LOGIN DE ADMINISTRADOR
// ============================================================

const limitarTentativas = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    erro: "Muitas tentativas. Tente novamente mais tarde."
  }
});

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 2 * 60 * 60 * 1000
};

router.post("/login", limitarTentativas, async (req, res) => {
  try {
    const { email, senha } = req.body ?? {};

    // 1. Verificar campos
    if (
      typeof email !== "string" ||
      typeof senha !== "string" ||
      !email.trim() ||
      !senha
    ) {
      return res.status(400).json({
        erro: "Informe e-mail e senha."
      });
    }

    const emailLimpo = email.trim().toLowerCase();

    // 2. Procurar administrador
    const [usuarios] = await pool.execute(
      `SELECT
        id_usuario,
        nome,
        email,
        senha_hash,
        ativo
       FROM usuario
       WHERE email = ?
       LIMIT 1`,
      [emailLimpo]
    );

    const usuario = usuarios[0];

    // 3. Verificar credenciais
    if (!usuario || !usuario.ativo) {
      return res.status(401).json({
        erro: "E-mail ou senha inválidos."
      });
    }

    // 4. Comparar a senha com o hash
    const senhaCorreta = await bcrypt.compare(
      senha,
      usuario.senha_hash
    );

    if (!senhaCorreta) {
      return res.status(401).json({
        erro: "E-mail ou senha inválidos."
      });
    }

    // 5. Criar token
    const token = jwt.sign(
      {
        id: String(usuario.id_usuario)
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "2h",
        algorithm: "HS256"
      }
    );

    // 6. Guardar token em cookie HttpOnly
    res.cookie(
      "admin_session",
      token,
      cookieOptions
    );

    // 7. Retornar sucesso
    return res.status(200).json({
      mensagem: "Login realizado com sucesso!",
      usuario: {
        id: String(usuario.id_usuario),
        nome: usuario.nome,
        email: usuario.email
      }
    });

  } catch (erro) {
    console.error("Erro no login:", erro);

    return res.status(500).json({
      erro: "Erro interno ao realizar login."
    });
  }
});


// ============================================================
// VERIFICAR SESSÃO
// ============================================================

async function autenticar(req, res, next) {
  try {
    const token = req.cookies?.admin_session;

    if (!token) {
      return res.status(401).json({
        erro: "Não autenticado."
      });
    }

    const dados = jwt.verify(
      token,
      process.env.JWT_SECRET,
      { algorithms: ["HS256"] }
    );

    const [usuarios] = await pool.execute(
      `SELECT id_usuario, nome, email
       FROM usuario
       WHERE id_usuario = ?
         AND ativo = TRUE
       LIMIT 1`,
      [dados.id]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        erro: "Sessão inválida."
      });
    }

    req.usuario = usuarios[0];
    next();

  } catch {
    return res.status(401).json({
      erro: "Sessão inválida ou expirada."
    });
  }
}

router.get("/me", autenticar, (req, res) => {
  res.json({
    usuario: {
      id: String(req.usuario.id_usuario),
      nome: req.usuario.nome,
      email: req.usuario.email
    }
  });
});


// ============================================================
// LOGOUT
// ============================================================

router.post("/logout", (req, res) => {
  res.clearCookie("admin_session", {
    httpOnly: true,
    secure: cookieOptions.secure,
    sameSite: "lax",
    path: "/"
  });

  res.json({
    mensagem: "Logout realizado com sucesso."
  });
});

export { autenticar };

export default router;