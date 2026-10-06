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
// --- AUTENTICAÇÃO ---
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
});
// --- ROTA DE TESTE ---
app.get('/api/status', (req, res) => {
    res.json({ message: 'API Revitalize operando com sucesso!' });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
//# sourceMappingURL=server.js.map