import { config } from './config.js';
import { prisma } from './db.js';
import { hashPassword } from './auth.js';
import { emailSchema, passwordSchema } from './http.js';
import { logInfo } from './logger.js';

// Cria o primeiro administrador quando ainda não existe nenhum.
// Usa BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL e BOOTSTRAP_ADMIN_PASSWORD.
// Depois do primeiro acesso, remova essas variáveis do painel da hospedagem.
export async function ensureFirstAdmin(): Promise<void> {
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  const { name, email, password } = config.bootstrapAdmin;

  if (adminCount > 0) {
    if (password) {
      logInfo('AVISO: já existe administrador. Remova BOOTSTRAP_ADMIN_PASSWORD das variáveis de ambiente.');
    }
    return;
  }

  if (!name || !email || !password) {
    logInfo(
      'AVISO: nenhum administrador cadastrado. Defina BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL e BOOTSTRAP_ADMIN_PASSWORD e reinicie.',
    );
    return;
  }

  const parsedEmail = emailSchema.safeParse(email);
  const parsedPassword = passwordSchema.safeParse(password);
  if (!parsedEmail.success || !parsedPassword.success || name.trim().length < 3) {
    logInfo('AVISO: BOOTSTRAP_ADMIN_* inválidos (nome com 3+ letras, e-mail válido, senha com 10+ caracteres, letras e números).');
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: parsedEmail.data }, select: { id: true } });
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN', active: true } });
    logInfo('Conta existente promovida a administrador pelo BOOTSTRAP_ADMIN_EMAIL.');
    return;
  }

  await prisma.user.create({
    data: {
      name: name.trim(),
      email: parsedEmail.data,
      password: await hashPassword(parsedPassword.data),
      role: 'ADMIN',
      mustChangePassword: true,
    },
  });
  logInfo('Administrador inicial criado. Ele deverá trocar a senha no primeiro acesso.');
}
