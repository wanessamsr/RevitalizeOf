import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || 'secret';

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

function createToken(user: { id: string; role: string }) {
  return jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '8h' });
}

function requireAuth(req: any, res: any, next: any) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autorização necessária' });
  }

  try {
    req.user = jwt.verify(header.slice(7), SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// --- AUTENTICAÇÃO ---
app.post('/api/login', async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    return res.json({
      token: createToken(user),
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Não foi possível autenticar o usuário' });
  }
});

app.get('/api/patients', requireAuth, async (req: any, res: any) => {
  try {
    const patients = await prisma.patient.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        cpf: true,
        birthDate: true,
        status: true,
      },
    });
    return res.json(patients);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Não foi possível carregar os pacientes' });
  }
});

app.get('/api/patients/:id', requireAuth, async (req: any, res: any) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      select: { id: true, fullName: true, cpf: true, birthDate: true, status: true },
    });

    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });
    return res.json(patient);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Não foi possível carregar o paciente' });
  }
});

// --- ROTA DE TESTE ---
app.get('/api/status', (req, res) => {
  res.json({ message: 'API Revitalize operando com sucesso!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));