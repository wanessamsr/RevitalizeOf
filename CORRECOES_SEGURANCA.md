# Correções de segurança do Revitalize

Versão corrigida em 06/10/2026, a partir do commit 4df17b8. Este documento traz, para cada arquivo alterado ou criado: o caminho, o resumo do que mudou, a configuração externa necessária e o código integral, pronto para substituir o original. Os arquivos já foram gravados na pasta RevitalizeOf; este documento serve de registro e conferência.

## O que foi testado

Tudo foi testado junto (MariaDB 10.11 + API + frontend compilado) antes da entrega:

- 39 testes da API: login, cookie httpOnly/Secure/SameSite, troca obrigatória da senha temporária, política de senha, perfis (admin sem pacientes, recepção sem evoluções, enfermagem sem evolução médica), CPF inválido e duplicado, CPF mascarado na lista, autor vindo da sessão, data futura recusada, adendo, ausência de edição, bloqueio após 5 erros, mensagem igual para e-mail inexistente, logout que invalida a sessão, conta desativada perdendo acesso na hora, auditoria e CSRF.
- 24 testes de tela no navegador (Chromium): fluxo completo admin, médica e recepção, do primeiro acesso até acolhimento, evolução, adendo, logout e consulta de auditoria, sem erros de JavaScript nem de CSP.
- Expiração por inatividade (sessão parada 16 minutos é recusada e registrada).
- Travas de produção: o servidor se recusa a subir com usuário root, cookie inseguro, CORS "*" ou sem DATABASE_URL.
- Modo produção: HSTS, CSP, cookie Secure e frontend servido pela própria API.
- `npm audit`: 0 vulnerabilidades no backend e no frontend.

## Configuração (o que você precisa fazer)

### 1. No seu computador, uma vez

```bash
# Backend
cd revitalize-backend
npm install
# Apaga as tabelas antigas do banco LOCAL (só dados de teste) e cria as novas
npx prisma migrate reset

# Frontend
cd ../revitalize1-main
npm install

# Tirar do GitHub o build antigo do frontend (agora é gerado no deploy) e registrar tudo
cd ..
git rm -r --cached revitalize1-main/dist
git add -A
git commit -m "Correções de segurança"
```

No arquivo `revitalize-backend/.env` do seu computador, a linha `JWT_SECRET` pode ser apagada (não é mais usada). Acrescente, só para criar o primeiro administrador:

```
BOOTSTRAP_ADMIN_NAME="Seu Nome"
BOOTSTRAP_ADMIN_EMAIL=seu-email@exemplo.com
BOOTSTRAP_ADMIN_PASSWORD=UmaSenhaInicial2026
```

Depois rode `npm run dev` no backend e `npm run dev` no frontend, entre em http://localhost:5173 com esse e-mail e senha, troque a senha e apague as três linhas do `.env`. As contas da equipe são criadas pela tela "Usuários e Auditoria".

### 2. Na Hostinger

1. Plano com Node.js (Business Web Hosting ou Cloud). Escolha o data center no Brasil e ative o SSL gratuito do domínio.
2. No hPanel, crie o banco MySQL e um usuário exclusivo com senha gerada de 32 caracteres. Deixe o "MySQL remoto" desligado.
3. Crie a aplicação Node.js apontando para este repositório, com pasta raiz `revitalize-backend`, Node 22, comando de build `npm run deploy:hostinger` e arquivo de entrada `dist/server.js` (ou comando de início `npm start`, se o painel pedir comando).
4. Cadastre as variáveis de ambiente no painel:

| Variável | Valor |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `mysql://USUARIO:SENHA@localhost:3306/NOME_DO_BANCO` (caracteres especiais da senha codificados, ex.: `@` vira `%40`) |
| `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` | Só no primeiro deploy; apague depois do primeiro acesso |
| `PORT` | Só se a Hostinger indicar uma porta específica |
| `FORCE_HTTPS` | `true` apenas se o hPanel não estiver forçando HTTPS |

Com isso, o site e a API ficam no mesmo domínio (a API serve o frontend compilado), o cookie de sessão é Secure + SameSite=Strict e não é preciso configurar CORS. Se preferir hospedar o frontend em outro subdomínio, defina `CORS_ORIGINS=https://app.seudominio.com.br` na API e `VITE_API_URL=https://api.seudominio.com.br` no build do frontend.

5. Ative o backup diário do plano e agende uma exportação mensal criptografada do banco guardada fora da Hostinger.
6. No GitHub, deixe o repositório `wanessamsr/RevitalizeOf` como privado (Settings, General, Change visibility).

## O que continua pendente (fora do código)

- Achado 11: backup e teste de restauração dependem da configuração da Hostinger (passo 5 acima). Os dados ficam em banco não exposto à internet; criptografia por campo não foi aplicada porque exigiria guardar uma chave fora do servidor, sem ganho real enquanto API e banco estão na mesma máquina.
- Achado 13: tornar o repositório privado (passo 6 acima).
- Achado 22: segundo fator de autenticação (2FA) não foi implementado; é melhoria de severidade baixa para depois do piloto.
- Telas que já eram demonstração (Agenda, Oficinas, Atendimento em Grupo, Produção Diária, Faltas, Encaminhamentos, Prontuários, Painel) continuam com dados fictícios e sem gravar nada, como antes. Agora só abrem com login e respeitam os perfis.

## Matriz de perfis

| Perfil | Pacientes e acolhimento | Evoluções | Usuários e auditoria |
| --- | --- | --- | --- |
| Administrador do sistema | Não | Não | Sim |
| Médico(a) | Sim | Lê e registra (médica e multiprofissional) | Não |
| Enfermagem | Sim | Lê e registra (enfermagem e multiprofissional) | Não |
| Psicólogo(a), Assistente Social, Terapeuta Ocupacional | Sim | Lê e registra (multiprofissional) | Não |
| Recepção | Sim | Não | Não |

## Arquivos removidos

Compilações antigas que ficavam misturadas ao código-fonte e não devem ir para produção (o `server.js` antigo nem tinha as rotas protegidas):

- `revitalize-backend/src/server.js`, `server.js.map`, `server.d.ts`, `server.d.ts.map`
- `revitalize-backend/prisma.config.js`, `prisma.config.js.map`, `prisma.config.d.ts`, `prisma.config.d.ts.map`

## Arquivos alterados e criados

### 1. `revitalize-backend/package.json` (alterado)

**O que foi corrigido:** Scripts de produção (build, build:full, deploy:hostinger, start com migrações), dependências novas de segurança (helmet, express-rate-limit, zod, cookie-parser), remoção do jsonwebtoken (a sessão agora fica no servidor), ferramentas de build movidas para dependencies (a Hostinger pode instalar sem devDependencies) e override do deepmerge-ts para zerar o npm audit. Achados 1, 5, 9, 15, 16, 17.

**Configuração externa:** Rodar `npm install` dentro de revitalize-backend no seu computador (Windows) depois de copiar.

```json
{
  "name": "revitalize-backend",
  "version": "1.1.0",
  "private": true,
  "type": "module",
  "main": "dist/server.js",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "prisma generate && tsc -p tsconfig.json",
    "build:frontend": "npm --prefix ../revitalize1-main install --include=dev && npm --prefix ../revitalize1-main run build",
    "build:full": "npm run build:frontend && npm run build",
    "deploy:hostinger": "npm run build:full && prisma migrate deploy",
    "start": "prisma migrate deploy && node dist/server.js",
    "migrate:dev": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "license": "UNLICENSED",
  "description": "API do prontuário eletrônico Revitalize (CAPS)",
  "dependencies": {
    "@prisma/client": "^6.19.3",
    "@types/bcrypt": "^6.0.0",
    "@types/cookie-parser": "^1.4.10",
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6",
    "@types/node": "^26.6.4",
    "bcrypt": "^6.0.0",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.6",
    "dotenv": "^18.0.5",
    "express": "^5.2.1",
    "express-rate-limit": "^8.7.1",
    "helmet": "^8.3.0",
    "prisma": "^6.19.3",
    "typescript": "^5.9.3",
    "zod": "^4.6.5"
  },
  "devDependencies": {
    "tsx": "^4.23.15"
  },
  "overrides": {
    "deepmerge-ts": "^8.0.2"
  }
}
```

### 2. `revitalize-backend/package-lock.json` (alterado)

**O que foi corrigido:** Versões exatas das dependências acima, com 0 vulnerabilidades no npm audit. Achado 16.

**Configuração externa:** Nenhuma além do `npm install`.

Arquivo gerado automaticamente pelo npm (milhares de linhas); a versão completa já está na pasta e não deve ser editada à mão.

### 3. `revitalize-backend/tsconfig.json` (alterado)

**O que foi corrigido:** Compila src/ para dist/ (antes os .js eram gerados dentro de src/ e um server.js antigo, sem rotas protegidas, ficava junto). Achado 17.

**Configuração externa:** Nenhuma.

```json
{
  // Visit https://aka.ms/tsconfig to read more about this file
  "compilerOptions": {
    // File Layout
    "rootDir": "./src",
    "outDir": "./dist",

    // Environment Settings
    "module": "nodenext",
    "target": "es2022",
    "lib": ["es2023"],
    "types": ["node"],

    // Other Outputs
    "sourceMap": true,
    "declaration": false,

    // Stricter Typechecking Options
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,

    // Recommended Options
    "strict": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noUncheckedSideEffectImports": true,
    "moduleDetection": "force",
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "prisma.config.ts"]
}
```

### 4. `revitalize-backend/.gitignore` (alterado)

**O que foi corrigido:** Ignora dist/ e qualquer .env.* (mantendo o .env.example).

**Configuração externa:** Nenhuma.

```text
node_modules
# Keep environment variables out of version control
.env
.env.*
!.env.example

# Build output (gerado por "npm run build")
dist

/generated/prisma
```

### 5. `revitalize-backend/.env.example` (criado)

**O que foi corrigido:** Modelo de todas as variáveis de ambiente, sem segredos. O JWT_SECRET deixou de existir.

**Configuração externa:** Ver a seção "Configuração" no início deste documento.

```bash
# Copie este arquivo para .env (desenvolvimento) ou cadastre as variáveis no
# painel da Hostinger (produção). Nunca envie o .env para o GitHub.

# Ambiente: development | production
NODE_ENV=development
PORT=3000

# Banco MySQL. Em produção use o usuário exclusivo criado no hPanel, nunca root.
# Senhas com caracteres especiais precisam ser codificadas (ex.: @ vira %40).
DATABASE_URL="mysql://revitalize_app:SENHA_FORTE@localhost:3306/revitalize_db"

# Sessão: expira após X minutos sem uso e, no máximo, após Y horas.
SESSION_IDLE_MINUTES=15
SESSION_MAX_HOURS=8

# Cookie de sessão. Em produção o padrão já é seguro (Secure + SameSite=Strict).
# Só mude se o frontend e a API ficarem em domínios diferentes (ver documentação).
# COOKIE_SECURE=true
# COOKIE_SAMESITE=strict

# Só preencha se o frontend ficar em outro endereço (ex.: https://app.seudominio.com.br).
# Vários endereços separados por vírgula. Nunca use "*".
# CORS_ORIGINS=

# Quantos proxies ficam na frente da API (Hostinger: 1). Padrão: 1 em produção.
# TRUST_PROXY=1

# Redireciona HTTP para HTTPS pela própria API (deixe false se o hPanel já força HTTPS).
FORCE_HTTPS=false

# Caminho do frontend compilado que a API serve no mesmo domínio.
# Em produção, se ficar vazio, a API usa ../revitalize1-main/dist automaticamente.
# FRONTEND_DIST=../revitalize1-main/dist

# Bloqueio de conta após erros seguidos de senha.
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCK_MINUTES=15

# Primeiro administrador (usado só se ainda não existir nenhum). Remova depois do primeiro acesso.
BOOTSTRAP_ADMIN_NAME=
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_PASSWORD=
```

### 6. `revitalize-backend/prisma/schema.prisma` (alterado)

**O que foi corrigido:** Perfis como enum (Role), status do paciente como enum, tabelas novas Session (sessão no servidor) e AuditLog (trilha de auditoria), autor obrigatório (authorId) em evolução, acolhimento, prontuário e encaminhamento, adendo por amendsId, bloqueio de conta (failedLoginCount, lockedUntil), senha temporária (mustChangePassword), CPF só com dígitos e todas as relações com onDelete: Restrict (nada clínico pode ser apagado em cascata). Achados 2, 3, 4, 5, 10, 14.

**Configuração externa:** Banco MySQL/MariaDB. Localmente: `npx prisma migrate reset` (apaga os dados de teste do banco local e recria as tabelas). Na Hostinger: `prisma migrate deploy` roda sozinho no build e no start.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// Perfis de acesso. A matriz do que cada perfil pode fazer fica em src/roles.ts.
enum Role {
  ADMIN
  MEDICO
  ENFERMAGEM
  PSICOLOGO
  ASSISTENTE_SOCIAL
  TERAPEUTA_OCUPACIONAL
  RECEPCAO
}

enum PatientStatus {
  ATIVO
  EM_CRISE
  INATIVO
}

enum EvolutionType {
  MEDICA
  ENFERMAGEM
  MULTIPROFISSIONAL
}

model User {
  id                 String    @id @default(uuid())
  name               String    @db.VarChar(150)
  email              String    @unique @db.VarChar(191)
  password           String    @db.VarChar(100)
  role               Role
  active             Boolean   @default(true)
  mustChangePassword Boolean   @default(true)
  failedLoginCount   Int       @default(0)
  lockedUntil        DateTime?
  passwordChangedAt  DateTime?
  lastLoginAt        DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  sessions         Session[]
  auditLogs        AuditLog[]
  evolutions       Evolution[]
  medicalRecords   MedicalRecord[]
  admissions       Admission[]
  referrals        Referral[]
  absences         Absence[]
  appointments     Appointment[]
  patientsCreated  Patient[]
}

// Sessão no servidor. O navegador guarda apenas um identificador aleatório em
// cookie httpOnly; aqui fica somente o hash SHA-256 desse identificador.
model Session {
  id         String    @id @db.VarChar(64)
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Restrict)
  createdAt  DateTime  @default(now())
  lastSeenAt DateTime  @default(now())
  expiresAt  DateTime
  revokedAt  DateTime?
  ip         String?   @db.VarChar(64)
  userAgent  String?   @db.VarChar(255)

  @@index([userId])
}

// Trilha de auditoria. A aplicação só faz INSERT nesta tabela.
model AuditLog {
  id        String   @id @default(uuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: Restrict)
  action    String   @db.VarChar(40)
  entity    String   @db.VarChar(40)
  entityId  String?  @db.VarChar(64)
  details   String?  @db.VarChar(500)
  ip        String?  @db.VarChar(64)
  userAgent String?  @db.VarChar(255)
  createdAt DateTime @default(now())

  @@index([entity, entityId])
  @@index([userId])
  @@index([createdAt])
}

model Patient {
  id          String        @id @default(uuid())
  fullName    String        @db.VarChar(150)
  socialName  String?       @db.VarChar(150)
  cpf         String        @unique @db.VarChar(11)
  birthDate   DateTime      @db.Date
  status      PatientStatus @default(ATIVO)
  createdById String?
  createdBy   User?         @relation(fields: [createdById], references: [id], onDelete: Restrict)

  medicalRecords MedicalRecord[]
  evolutions     Evolution[]
  admissions     Admission[]
  referrals      Referral[]
  absences       Absence[]
  appointments   Appointment[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([fullName])
}

model MedicalRecord {
  id          String   @id @default(uuid())
  patientId   String
  patient     Patient  @relation(fields: [patientId], references: [id], onDelete: Restrict)
  authorId    String
  author      User     @relation(fields: [authorId], references: [id], onDelete: Restrict)
  description String   @db.Text
  date        DateTime @default(now())

  @@index([patientId])
}

// Evolução clínica: imutável. Correções entram como adendo (amendsId aponta
// para a evolução original); não existem rotas de edição nem de exclusão.
model Evolution {
  id             String        @id @default(uuid())
  patientId      String
  patient        Patient       @relation(fields: [patientId], references: [id], onDelete: Restrict)
  authorId       String
  author         User          @relation(fields: [authorId], references: [id], onDelete: Restrict)
  type           EvolutionType
  attendanceType String        @db.VarChar(60)
  occurredAt     DateTime
  notes          String        @db.Text
  details        Json?
  amendsId       String?
  amends         Evolution?    @relation("EvolutionAddenda", fields: [amendsId], references: [id], onDelete: Restrict)
  addenda        Evolution[]   @relation("EvolutionAddenda")
  createdAt      DateTime      @default(now())

  @@index([patientId, occurredAt])
  @@index([amendsId])
}

model Admission {
  id        String   @id @default(uuid())
  patientId String
  patient   Patient  @relation(fields: [patientId], references: [id], onDelete: Restrict)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Restrict)
  type      String   @db.VarChar(40)
  reason    String   @db.Text
  details   Json?
  date      DateTime @default(now())

  @@index([patientId])
}

model Referral {
  id          String   @id @default(uuid())
  patientId   String
  patient     Patient  @relation(fields: [patientId], references: [id], onDelete: Restrict)
  authorId    String
  author      User     @relation(fields: [authorId], references: [id], onDelete: Restrict)
  destination String
  reason      String   @db.Text
  date        DateTime @default(now())

  @@index([patientId])
}

model Absence {
  id           String   @id @default(uuid())
  patientId    String
  patient      Patient  @relation(fields: [patientId], references: [id], onDelete: Restrict)
  recordedById String?
  recordedBy   User?    @relation(fields: [recordedById], references: [id], onDelete: Restrict)
  reason       String?
  date         DateTime

  @@index([patientId])
}

model Appointment {
  id          String   @id @default(uuid())
  patientId   String
  patient     Patient  @relation(fields: [patientId], references: [id], onDelete: Restrict)
  createdById String?
  createdBy   User?    @relation(fields: [createdById], references: [id], onDelete: Restrict)
  date        DateTime
  status      String   @default("SCHEDULED")

  @@index([patientId])
}

model Medicine {
  id          String @id @default(uuid())
  name        String
  quantity    Int
  minQuantity Int
}

model Workshop {
  id          String   @id @default(uuid())
  title       String
  description String?
  date        DateTime
}

model GroupSession {
  id    String   @id @default(uuid())
  theme String
  date  DateTime
}

model DailyProduction {
  id         String   @id @default(uuid())
  metricName String
  value      Int
  date       DateTime @default(now())
}
```

### 7. `revitalize-backend/prisma/migrations/migration_lock.toml` (criado)

**O que foi corrigido:** Arquivo padrão do Prisma que fixa o provedor mysql para as migrações.

**Configuração externa:** Nenhuma.

```toml
# Please do not edit this file manually
# It should be added in your version-control system (e.g., Git)
provider = "mysql"
```

### 8. `revitalize-backend/prisma/migrations/20261006220000_init/migration.sql` (criado)

**O que foi corrigido:** Primeira migração versionada, com todas as tabelas, índices e chaves estrangeiras. Testada em MariaDB 10.11 (mesma família usada pela Hostinger). Achado 18.

**Configuração externa:** Nenhuma; é aplicada por `prisma migrate deploy` ou `prisma migrate reset`.

```sql
-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(100) NOT NULL,
    `role` ENUM('ADMIN', 'MEDICO', 'ENFERMAGEM', 'PSICOLOGO', 'ASSISTENTE_SOCIAL', 'TERAPEUTA_OCUPACIONAL', 'RECEPCAO') NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT true,
    `failedLoginCount` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `passwordChangedAt` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(64) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `ip` VARCHAR(64) NULL,
    `userAgent` VARCHAR(255) NULL,

    INDEX `Session_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(40) NOT NULL,
    `entity` VARCHAR(40) NOT NULL,
    `entityId` VARCHAR(64) NULL,
    `details` VARCHAR(500) NULL,
    `ip` VARCHAR(64) NULL,
    `userAgent` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entity_entityId_idx`(`entity`, `entityId`),
    INDEX `AuditLog_userId_idx`(`userId`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Patient` (
    `id` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(150) NOT NULL,
    `socialName` VARCHAR(150) NULL,
    `cpf` VARCHAR(11) NOT NULL,
    `birthDate` DATE NOT NULL,
    `status` ENUM('ATIVO', 'EM_CRISE', 'INATIVO') NOT NULL DEFAULT 'ATIVO',
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Patient_cpf_key`(`cpf`),
    INDEX `Patient_fullName_idx`(`fullName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MedicalRecord` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MedicalRecord_patientId_idx`(`patientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Evolution` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `type` ENUM('MEDICA', 'ENFERMAGEM', 'MULTIPROFISSIONAL') NOT NULL,
    `attendanceType` VARCHAR(60) NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL,
    `notes` TEXT NOT NULL,
    `details` JSON NULL,
    `amendsId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Evolution_patientId_occurredAt_idx`(`patientId`, `occurredAt`),
    INDEX `Evolution_amendsId_idx`(`amendsId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Admission` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(40) NOT NULL,
    `reason` TEXT NOT NULL,
    `details` JSON NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Admission_patientId_idx`(`patientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Referral` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `destination` VARCHAR(191) NOT NULL,
    `reason` TEXT NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Referral_patientId_idx`(`patientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Absence` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `recordedById` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NULL,
    `date` DATETIME(3) NOT NULL,

    INDEX `Absence_patientId_idx`(`patientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Appointment` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NULL,
    `date` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SCHEDULED',

    INDEX `Appointment_patientId_idx`(`patientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Medicine` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `minQuantity` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Workshop` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `date` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GroupSession` (
    `id` VARCHAR(191) NOT NULL,
    `theme` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyProduction` (
    `id` VARCHAR(191) NOT NULL,
    `metricName` VARCHAR(191) NOT NULL,
    `value` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Patient` ADD CONSTRAINT `Patient_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MedicalRecord` ADD CONSTRAINT `MedicalRecord_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MedicalRecord` ADD CONSTRAINT `MedicalRecord_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evolution` ADD CONSTRAINT `Evolution_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evolution` ADD CONSTRAINT `Evolution_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evolution` ADD CONSTRAINT `Evolution_amendsId_fkey` FOREIGN KEY (`amendsId`) REFERENCES `Evolution`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Admission` ADD CONSTRAINT `Admission_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Admission` ADD CONSTRAINT `Admission_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Referral` ADD CONSTRAINT `Referral_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Referral` ADD CONSTRAINT `Referral_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Absence` ADD CONSTRAINT `Absence_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Absence` ADD CONSTRAINT `Absence_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
```

### 9. `revitalize-backend/src/config.ts` (criado)

**O que foi corrigido:** Lê e valida todas as variáveis de ambiente. O servidor não sobe se faltar DATABASE_URL, se em produção usar o usuário root do MySQL, se o cookie não for seguro em produção ou se CORS_ORIGINS for "*". Achados 1, 10, 12.

**Configuração externa:** Variáveis da seção "Configuração".

```ts
import 'dotenv/config';
import { z } from 'zod';

const booleanFromEnv = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z
    .string({ error: 'DATABASE_URL não definida' })
    .startsWith('mysql://', { error: 'DATABASE_URL deve começar com mysql://' }),

  SESSION_IDLE_MINUTES: z.coerce.number().int().min(5).max(120).default(15),
  SESSION_MAX_HOURS: z.coerce.number().int().min(1).max(24).default(8),
  COOKIE_SECURE: booleanFromEnv.optional(),
  COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('strict'),

  CORS_ORIGINS: z.string().optional(),
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).optional(),
  FORCE_HTTPS: booleanFromEnv.default(false),
  FRONTEND_DIST: z.string().optional(),

  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),

  BOOTSTRAP_ADMIN_NAME: z.string().optional(),
  BOOTSTRAP_ADMIN_EMAIL: z.string().optional(),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
  console.error(`Configuração inválida. Corrija as variáveis de ambiente:\n${problems.join('\n')}`);
  process.exit(1);
}

const env = parsed.data;
const isProduction = env.NODE_ENV === 'production';

const cookieSecure = env.COOKIE_SECURE ?? isProduction;

if (env.COOKIE_SAMESITE === 'none' && !cookieSecure) {
  console.error('COOKIE_SAMESITE=none exige COOKIE_SECURE=true (HTTPS).');
  process.exit(1);
}

if (isProduction) {
  if (!cookieSecure) {
    console.error('Em produção o cookie de sessão precisa ser seguro: remova COOKIE_SECURE=false e use HTTPS.');
    process.exit(1);
  }
  try {
    const dbUser = decodeURIComponent(new URL(env.DATABASE_URL).username);
    if (dbUser === 'root') {
      console.error('Em produção não use o usuário root do MySQL. Crie um usuário exclusivo para o Revitalize.');
      process.exit(1);
    }
  } catch {
    console.error('DATABASE_URL inválida.');
    process.exit(1);
  }
}

const corsOrigins = (env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter((origin) => origin.length > 0);

if (corsOrigins.includes('*')) {
  console.error('CORS_ORIGINS não pode ser "*". Liste os endereços exatos do frontend.');
  process.exit(1);
}

export const config = {
  env: env.NODE_ENV,
  isProduction,
  port: env.PORT,
  session: {
    cookieName: 'revitalize_sid',
    idleMs: env.SESSION_IDLE_MINUTES * 60 * 1000,
    maxAgeMs: env.SESSION_MAX_HOURS * 60 * 60 * 1000,
    idleMinutes: env.SESSION_IDLE_MINUTES,
    cookieSecure,
    sameSite: env.COOKIE_SAMESITE,
  },
  login: {
    maxAttempts: env.LOGIN_MAX_ATTEMPTS,
    lockMs: env.LOGIN_LOCK_MINUTES * 60 * 1000,
  },
  corsOrigins,
  trustProxy: env.TRUST_PROXY ?? (isProduction ? 1 : 0),
  forceHttps: env.FORCE_HTTPS,
  frontendDist: env.FRONTEND_DIST,
  bootstrapAdmin: {
    name: env.BOOTSTRAP_ADMIN_NAME,
    email: env.BOOTSTRAP_ADMIN_EMAIL,
    password: env.BOOTSTRAP_ADMIN_PASSWORD,
  },
} as const;
```

### 10. `revitalize-backend/src/db.ts` (criado)

**O que foi corrigido:** Conexão única do Prisma com log só de avisos e erros.

**Configuração externa:** Nenhuma.

```ts
import { PrismaClient } from '@prisma/client';

// Uma única conexão compartilhada por toda a aplicação.
export const prisma = new PrismaClient({
  log: ['warn', 'error'],
});
```

### 11. `revitalize-backend/src/logger.ts` (criado)

**O que foi corrigido:** Log de erros sem dados de paciente: só contexto, tipo e código do erro. Achado 21.

**Configuração externa:** Nenhuma.

```ts
// Registro de erros sem dados pessoais: apenas o contexto, o tipo e o código do
// erro. Nunca registrar corpo de requisição, CPF, nomes ou texto clínico.
export function logError(context: string, error: unknown): void {
  const timestamp = new Date().toISOString();
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    const codeText = typeof code === 'string' ? ` [${code}]` : '';
    const firstLine = (error.message.split('\n').find((line) => line.trim().length > 0) ?? '').slice(0, 200);
    console.error(`${timestamp} ERRO ${context}: ${error.name}${codeText} ${firstLine}`);
    return;
  }
  console.error(`${timestamp} ERRO ${context}: erro desconhecido`);
}

export function logInfo(message: string): void {
  console.log(`${new Date().toISOString()} ${message}`);
}
```

### 12. `revitalize-backend/src/roles.ts` (criado)

**O que foi corrigido:** Matriz de acesso em um só lugar: clínicos leem e escrevem evoluções; recepção vê cadastro e faz acolhimento; administrador gerencia contas e auditoria, sem acesso a pacientes; evolução médica só por médico, de enfermagem só por enfermagem. Achado 2.

**Configuração externa:** Para mudar quem pode o quê, edite este arquivo e o espelho revitalize1-main/src/app/roles.ts.

```ts
import type { EvolutionType, Role } from '@prisma/client';

// Matriz de acesso do Revitalize. Para mudar quem pode fazer o quê, altere
// somente este arquivo (e o espelho em revitalize1-main/src/app/roles.ts).

export const ALL_ROLES: readonly Role[] = [
  'ADMIN',
  'MEDICO',
  'ENFERMAGEM',
  'PSICOLOGO',
  'ASSISTENTE_SOCIAL',
  'TERAPEUTA_OCUPACIONAL',
  'RECEPCAO',
];

// Profissionais que leem e escrevem conteúdo clínico (evoluções).
export const CLINICAL_ROLES: readonly Role[] = [
  'MEDICO',
  'ENFERMAGEM',
  'PSICOLOGO',
  'ASSISTENTE_SOCIAL',
  'TERAPEUTA_OCUPACIONAL',
];

// Quem vê cadastro de pacientes (nome, CPF, nascimento, status) e faz acolhimento.
// O administrador do sistema gerencia contas e auditoria, mas não acessa pacientes.
export const PATIENT_ROLES: readonly Role[] = [...CLINICAL_ROLES, 'RECEPCAO'];

export const ADMIN_ROLES: readonly Role[] = ['ADMIN'];

// Quem pode registrar cada tipo de evolução.
export const EVOLUTION_TYPE_ROLES: Record<EvolutionType, readonly Role[]> = {
  MEDICA: ['MEDICO'],
  ENFERMAGEM: ['ENFERMAGEM'],
  MULTIPROFISSIONAL: CLINICAL_ROLES,
};

export function hasRole(role: Role, allowed: readonly Role[]): boolean {
  return allowed.includes(role);
}
```

### 13. `revitalize-backend/src/http.ts` (criado)

**O que foi corrigido:** Validação de entrada com zod (erros sem ecoar o valor enviado), política de senha (10 a 72 caracteres, letras e números), validação de CPF com dígitos verificadores, máscara de CPF para listas. Achados 2, 14, 15.

**Configuração externa:** Nenhuma.

```ts
import { z } from 'zod';

// Erro com status HTTP e mensagem segura para mostrar ao usuário.
export class HttpError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly fields: Record<string, string> | undefined;

  constructor(status: number, message: string, code?: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

// Valida dados de entrada com zod. Em caso de erro, responde 400 com a primeira
// mensagem de cada campo, sem ecoar o valor recebido.
export function parseInput<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_';
    if (!(key in fields)) fields[key] = issue.message;
  }
  const first = Object.values(fields)[0] ?? 'Dados inválidos';
  throw new HttpError(400, first, 'VALIDATION_ERROR', fields);
}

// ---------- Regras de validação reutilizáveis ----------

export const idParam = z.object({
  id: z.uuid({ error: 'Identificador inválido' }),
});

export const emailSchema = z
  .string({ error: 'Informe o e-mail' })
  .trim()
  .toLowerCase()
  .max(191, { error: 'E-mail muito longo' })
  .pipe(z.email({ error: 'E-mail inválido' }));

// Política de senha: 10 a 72 caracteres (limite do bcrypt), com letras e números.
export const passwordSchema = z
  .string({ error: 'Informe a senha' })
  .min(10, { error: 'A senha deve ter pelo menos 10 caracteres' })
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, { error: 'A senha deve ter no máximo 72 caracteres' })
  .refine((value) => /[A-Za-zÀ-ÿ]/.test(value) && /\d/.test(value), {
    error: 'A senha deve ter letras e números',
  });

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digits = cpf.split('').map(Number);
  const calc = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) sum += (digits[i] ?? 0) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === digits[9] && calc(10) === digits[10];
}

export const cpfSchema = z
  .string({ error: 'Informe o CPF' })
  .transform(onlyDigits)
  .refine(isValidCpf, { error: 'CPF inválido' });

export function maskCpf(cpf: string): string {
  const digits = onlyDigits(cpf);
  if (digits.length !== 11) return '***.***.***-**';
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

export function formatCpf(cpf: string): string {
  const digits = onlyDigits(cpf);
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

// Data no formato AAAA-MM-DD (campo <input type="date">).
export const dateOnlySchema = z
  .string({ error: 'Informe a data' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Data inválida' })
  .transform((value) => new Date(`${value}T00:00:00.000Z`))
  .refine((date) => !Number.isNaN(date.getTime()), { error: 'Data inválida' });
```

### 14. `revitalize-backend/src/audit.ts` (criado)

**O que foi corrigido:** Grava a trilha de auditoria (quem, o quê, qual registro, IP, navegador, quando). A gravação é aguardada: se a auditoria falhar, a operação falha. Achado 3.

**Configuração externa:** Nenhuma.

```ts
import type { Request } from 'express';
import { prisma } from './db.js';

export type AuditAction =
  | 'LOGIN'
  | 'LOGIN_FAIL'
  | 'LOGIN_BLOCKED'
  | 'LOGOUT'
  | 'SESSION_EXPIRED'
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET'
  | 'LIST'
  | 'VIEW'
  | 'CREATE'
  | 'ADDENDUM'
  | 'UPDATE'
  | 'ACCESS_DENIED';

export type AuditEntity = 'Auth' | 'User' | 'Patient' | 'Evolution' | 'Admission' | 'AuditLog';

interface AuditInput {
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string | null;
  details?: string | null;
  userId?: string | null;
}

export function clientIp(req: Request): string | null {
  return (req.ip ?? '').slice(0, 64) || null;
}

export function clientAgent(req: Request): string | null {
  const agent = req.get('user-agent');
  return agent ? agent.slice(0, 255) : null;
}

// Para registros ligados a um paciente, entityId é sempre o id do paciente,
// assim o filtro da tela de auditoria mostra tudo o que aconteceu com ele.
// Grava um registro de auditoria. É aguardado de propósito: se a trilha não
// puder ser gravada, a operação falha em vez de acontecer sem registro.
export async function recordAudit(req: Request, input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.userId !== undefined ? input.userId : (req.auth?.user.id ?? null),
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      details: input.details ? input.details.slice(0, 500) : null,
      ip: clientIp(req),
      userAgent: clientAgent(req),
    },
  });
}
```

### 15. `revitalize-backend/src/auth.ts` (criado)

**O que foi corrigido:** Sessão no servidor com identificador aleatório de 256 bits em cookie httpOnly + Secure + SameSite=Strict (só o hash fica no banco), expiração por inatividade e por tempo máximo, revogação no logout, bcrypt custo 12, comparação com hash fictício para não revelar e-mails pelo tempo de resposta, senha temporária, controle por perfil com registro de acesso negado e proteção contra CSRF por cabeçalho obrigatório. Achados 1, 2, 6, 7, 19.

**Configuração externa:** SESSION_IDLE_MINUTES, SESSION_MAX_HOURS, COOKIE_SECURE, COOKIE_SAMESITE (opcionais).

```ts
import { createHash, randomBytes, randomInt } from 'node:crypto';
import bcrypt from 'bcrypt';
import type { CookieOptions, NextFunction, Request, Response } from 'express';
import type { Role, User } from '@prisma/client';
import { config } from './config.js';
import { prisma } from './db.js';
import { clientAgent, clientIp, recordAudit } from './audit.js';
import { HttpError } from './http.js';
import { hasRole } from './roles.js';

export type SessionUser = Pick<User, 'id' | 'name' | 'email' | 'role' | 'mustChangePassword'>;

export interface AuthContext {
  user: SessionUser;
  sessionId: string;
  expiresAt: Date;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

// ---------- Senhas ----------

const BCRYPT_COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

// Hash fixo usado quando o e-mail não existe, para que o tempo de resposta do
// login seja o mesmo com ou sem usuário cadastrado.
const dummyHashPromise = bcrypt.hash(randomBytes(16).toString('hex'), BCRYPT_COST);

export async function verifyPassword(plain: string, hash: string | null): Promise<boolean> {
  if (!hash) {
    await bcrypt.compare(plain, await dummyHashPromise);
    return false;
  }
  return bcrypt.compare(plain, hash);
}

// Senha temporária legível (sem caracteres ambíguos), entregue uma única vez ao administrador.
export function generateTemporaryPassword(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = letters + digits;
  const chars: string[] = [];
  chars.push(letters.charAt(randomInt(letters.length)));
  chars.push(digits.charAt(randomInt(digits.length)));
  while (chars.length < 14) chars.push(all.charAt(randomInt(all.length)));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    const tmp = chars[i] as string;
    chars[i] = chars[j] as string;
    chars[j] = tmp;
  }
  return chars.join('');
}

// ---------- Sessões ----------

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: config.session.cookieSecure,
    sameSite: config.session.sameSite,
    path: '/',
    maxAge: config.session.maxAgeMs,
  };
}

export function clearSessionCookie(res: Response): void {
  const { maxAge: _maxAge, ...options } = cookieOptions();
  res.clearCookie(config.session.cookieName, options);
}

export async function createSession(req: Request, res: Response, userId: string): Promise<{ sessionId: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const sessionId = hashToken(token);
  const expiresAt = new Date(Date.now() + config.session.maxAgeMs);

  await prisma.session.create({
    data: {
      id: sessionId,
      userId,
      expiresAt,
      ip: clientIp(req),
      userAgent: clientAgent(req),
    },
  });

  res.cookie(config.session.cookieName, token, cookieOptions());
  return { sessionId, expiresAt };
}

export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { NOT: { id: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}

// Só atualiza lastSeenAt se passou mais de 1 minuto, para não gravar no banco a cada clique.
const LAST_SEEN_WRITE_INTERVAL_MS = 60 * 1000;

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token: unknown = req.cookies?.[config.session.cookieName];
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) {
    res.status(401).json({ error: 'Faça login para continuar', code: 'UNAUTHENTICATED' });
    return;
  }

  const sessionId = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, mustChangePassword: true, active: true } },
    },
  });

  const now = Date.now();
  const expired =
    !session ||
    session.revokedAt !== null ||
    session.expiresAt.getTime() <= now ||
    now - session.lastSeenAt.getTime() > config.session.idleMs ||
    !session.user.active;

  if (expired) {
    if (session && session.revokedAt === null) {
      await revokeSession(session.id);
      await recordAudit(req, { action: 'SESSION_EXPIRED', entity: 'Auth', userId: session.userId });
    }
    clearSessionCookie(res);
    res.status(401).json({ error: 'Sua sessão expirou. Entre novamente.', code: 'SESSION_EXPIRED' });
    return;
  }

  if (now - session.lastSeenAt.getTime() > LAST_SEEN_WRITE_INTERVAL_MS) {
    await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date(now) } });
  }

  const { active: _active, ...user } = session.user;
  req.auth = { user, sessionId: session.id, expiresAt: session.expiresAt };
  next();
}

// Bloqueia tudo (exceto as rotas de conta) enquanto o usuário não trocar a senha temporária.
export function requirePasswordChanged(req: Request, res: Response, next: NextFunction): void {
  if (req.auth?.user.mustChangePassword) {
    res.status(403).json({ error: 'Troque sua senha temporária para continuar.', code: 'PASSWORD_CHANGE_REQUIRED' });
    return;
  }
  next();
}

export function requireRole(allowed: readonly Role[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.auth?.user;
    if (!user) {
      res.status(401).json({ error: 'Faça login para continuar', code: 'UNAUTHENTICATED' });
      return;
    }
    if (!hasRole(user.role, allowed)) {
      await recordAudit(req, {
        action: 'ACCESS_DENIED',
        entity: 'Auth',
        details: `${req.method} ${req.baseUrl}${req.route?.path ?? ''}`.slice(0, 200),
      });
      res.status(403).json({ error: 'Seu perfil não tem permissão para esta ação.', code: 'FORBIDDEN' });
      return;
    }
    next();
  };
}

export function currentUser(req: Request): SessionUser {
  if (!req.auth) throw new HttpError(401, 'Faça login para continuar', 'UNAUTHENTICATED');
  return req.auth.user;
}

// Proteção contra CSRF: toda requisição que altera dados precisa do cabeçalho
// X-Revitalize-Client, que um site de terceiros não consegue enviar sem
// passar pelo CORS. Somado ao cookie SameSite=Strict.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function requireClientHeader(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }
  if (req.get('x-revitalize-client') !== 'web') {
    res.status(403).json({ error: 'Requisição recusada.', code: 'CSRF' });
    return;
  }
  next();
}
```

### 16. `revitalize-backend/src/bootstrap.ts` (criado)

**O que foi corrigido:** Cria o primeiro administrador a partir de variáveis de ambiente, só quando ainda não existe nenhum, com troca de senha obrigatória no primeiro acesso. Achado 14.

**Configuração externa:** BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD na primeira execução; apague depois.

```ts
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
```

### 17. `revitalize-backend/src/routes/auth.ts` (criado)

**O que foi corrigido:** Login com limite de tentativas por IP e bloqueio da conta após 5 erros seguidos por 15 minutos, mensagem igual para e-mail inexistente e senha errada, /me, /ping (mantém a sessão viva), logout que revoga a sessão no servidor e troca de senha que encerra as outras sessões. Achados 5, 6, 14, 19.

**Configuração externa:** LOGIN_MAX_ATTEMPTS e LOGIN_LOCK_MINUTES (opcionais).

```ts
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { recordAudit } from '../audit.js';
import {
  clearSessionCookie,
  createSession,
  currentUser,
  hashPassword,
  requireAuth,
  revokeSession,
  revokeUserSessions,
  verifyPassword,
} from '../auth.js';
import { HttpError, emailSchema, parseInput, passwordSchema } from '../http.js';

export const authRouter = Router();

// No máximo 30 tentativas ERRADAS de login a cada 15 minutos por endereço IP
// (logins certos não contam, porque toda a equipe do CAPS sai pelo mesmo IP).
// Além disso, cada conta é bloqueada após LOGIN_MAX_ATTEMPTS erros seguidos.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Aguarde 15 minutos e tente novamente.', code: 'RATE_LIMIT' },
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: 'Informe a senha' }).min(1, { error: 'Informe a senha' }).max(200),
});

const INVALID_CREDENTIALS = 'E-mail ou senha incorretos.';

function sessionInfo(expiresAt: Date) {
  return { idleMinutes: config.session.idleMinutes, expiresAt: expiresAt.toISOString() };
}

authRouter.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = parseInput(loginSchema, req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  const now = new Date();

  if (user?.lockedUntil && user.lockedUntil > now) {
    await verifyPassword(password, null);
    await recordAudit(req, { action: 'LOGIN_BLOCKED', entity: 'Auth', userId: user.id });
    res.status(429).json({
      error: 'Acesso bloqueado temporariamente por excesso de tentativas. Tente mais tarde ou procure o administrador.',
      code: 'ACCOUNT_LOCKED',
    });
    return;
  }

  const passwordOk = await verifyPassword(password, user?.password ?? null);

  if (!user || !passwordOk || !user.active) {
    if (user) {
      const failures = user.failedLoginCount + 1;
      const lock = failures >= config.login.maxAttempts;
      await prisma.user.update({
        where: { id: user.id },
        data: lock
          ? { failedLoginCount: 0, lockedUntil: new Date(now.getTime() + config.login.lockMs) }
          : { failedLoginCount: failures },
      });
      await recordAudit(req, {
        action: lock ? 'LOGIN_BLOCKED' : 'LOGIN_FAIL',
        entity: 'Auth',
        userId: user.id,
        details: user.active ? null : 'conta desativada',
      });
    } else {
      await recordAudit(req, { action: 'LOGIN_FAIL', entity: 'Auth', userId: null, details: 'e-mail não cadastrado' });
    }
    res.status(401).json({ error: INVALID_CREDENTIALS, code: 'INVALID_CREDENTIALS' });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
  });

  const { expiresAt } = await createSession(req, res, user.id);
  await recordAudit(req, { action: 'LOGIN', entity: 'Auth', userId: user.id });

  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, mustChangePassword: user.mustChangePassword },
    session: sessionInfo(expiresAt),
  });
});

authRouter.get('/me', requireAuth, (req, res) => {
  const auth = req.auth;
  if (!auth) throw new HttpError(401, 'Faça login para continuar', 'UNAUTHENTICATED');
  res.json({ user: auth.user, session: sessionInfo(auth.expiresAt) });
});

// Mantém a sessão ativa enquanto o profissional está usando a tela.
authRouter.post('/ping', requireAuth, (_req, res) => {
  res.status(204).end();
});

authRouter.post('/logout', async (req, res) => {
  const token: unknown = req.cookies?.[config.session.cookieName];
  if (typeof token === 'string' && token.length >= 20 && token.length <= 100) {
    const sessionId = createHash('sha256').update(token).digest('hex');
    const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { id: true, userId: true, revokedAt: true } });
    if (session && session.revokedAt === null) {
      await revokeSession(session.id);
      await recordAudit(req, { action: 'LOGOUT', entity: 'Auth', userId: session.userId });
    }
  }
  clearSessionCookie(res);
  res.status(204).end();
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string({ error: 'Informe a senha atual' }).min(1, { error: 'Informe a senha atual' }).max(200),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    error: 'A nova senha deve ser diferente da atual',
    path: ['newPassword'],
  });

authRouter.post('/change-password', requireAuth, async (req, res) => {
  const sessionUser = currentUser(req);
  const { currentPassword, newPassword } = parseInput(changePasswordSchema, req.body);

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user || !(await verifyPassword(currentPassword, user.password))) {
    throw new HttpError(400, 'Senha atual incorreta.', 'VALIDATION_ERROR', { currentPassword: 'Senha atual incorreta' });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await hashPassword(newPassword),
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    },
    select: { id: true, name: true, email: true, role: true, mustChangePassword: true },
  });

  // Encerra as outras sessões abertas com a senha antiga.
  await revokeUserSessions(user.id, req.auth?.sessionId);
  await recordAudit(req, { action: 'PASSWORD_CHANGE', entity: 'User', entityId: user.id });

  res.json({ user: updated });
});
```

### 18. `revitalize-backend/src/routes/patients.ts` (criado)

**O que foi corrigido:** Lista paginada com CPF mascarado e busca no servidor, detalhe com CPF completo, troca de status e acolhimento (cria paciente e ficha juntos, autor vindo da sessão). Toda leitura e escrita vai para a auditoria. Achados 2, 3, 4, 15.

**Configuração externa:** Nenhuma.

```ts
import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { recordAudit } from '../audit.js';
import { currentUser, requireRole } from '../auth.js';
import { HttpError, cpfSchema, dateOnlySchema, formatCpf, idParam, maskCpf, onlyDigits, parseInput } from '../http.js';
import { PATIENT_ROLES } from '../roles.js';

export const patientsRouter = Router();

patientsRouter.use(requireRole(PATIENT_ROLES));

const PAGE_SIZE = 50;

const listQuerySchema = z.object({
  search: z.string().trim().max(150).optional(),
  status: z.enum(['ATIVO', 'EM_CRISE', 'INATIVO']).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Lista paginada. O CPF vem mascarado; a busca por CPF exige os 11 dígitos.
patientsRouter.get('/', async (req, res) => {
  const { search, status, page } = parseInput(listQuerySchema, req.query);

  const where: Prisma.PatientWhereInput = {};
  if (status) where.status = status;
  if (search) {
    const digits = onlyDigits(search);
    where.OR = digits.length === 11 ? [{ cpf: digits }] : [{ fullName: { contains: search } }, { socialName: { contains: search } }];
  }

  const [total, patients] = await prisma.$transaction([
    prisma.patient.count({ where }),
    prisma.patient.findMany({
      where,
      orderBy: { fullName: 'asc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, fullName: true, socialName: true, cpf: true, birthDate: true, status: true, createdAt: true },
    }),
  ]);

  await recordAudit(req, {
    action: 'LIST',
    entity: 'Patient',
    details: `página ${page}${search ? ', com busca' : ''}${status ? `, status ${status}` : ''}`,
  });

  res.json({
    items: patients.map((patient) => ({
      ...patient,
      cpf: maskCpf(patient.cpf),
      birthDate: toDateOnly(patient.birthDate),
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
  });
});

patientsRouter.get('/:id', async (req, res) => {
  const { id } = parseInput(idParam, req.params);

  const patient = await prisma.patient.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      socialName: true,
      cpf: true,
      birthDate: true,
      status: true,
      createdAt: true,
      admissions: {
        orderBy: { date: 'desc' },
        take: 1,
        select: { id: true, type: true, date: true, author: { select: { name: true, role: true } } },
      },
    },
  });

  if (!patient) throw new HttpError(404, 'Paciente não encontrado', 'NOT_FOUND');

  await recordAudit(req, { action: 'VIEW', entity: 'Patient', entityId: patient.id });

  const { admissions, ...rest } = patient;
  res.json({
    ...rest,
    cpf: formatCpf(rest.cpf),
    birthDate: toDateOnly(rest.birthDate),
    lastAdmission: admissions[0] ?? null,
  });
});

const updateStatusSchema = z.object({
  status: z.enum(['ATIVO', 'EM_CRISE', 'INATIVO'], { error: 'Status inválido' }),
});

patientsRouter.patch('/:id/status', async (req, res) => {
  const { id } = parseInput(idParam, req.params);
  const { status } = parseInput(updateStatusSchema, req.body);

  const exists = await prisma.patient.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!exists) throw new HttpError(404, 'Paciente não encontrado', 'NOT_FOUND');

  const patient = await prisma.patient.update({ where: { id }, data: { status }, select: { id: true, status: true } });
  await recordAudit(req, { action: 'UPDATE', entity: 'Patient', entityId: id, details: `status ${exists.status} para ${status}` });
  res.json(patient);
});

// ---------- Acolhimento: cria o paciente e a ficha de acolhimento juntos ----------

const ADMISSION_TYPES = ['geral', 'transtorno-mental', 'alcool-drogas'] as const;

// Os demais campos da ficha chegam como lista de pares pergunta/resposta.
const admissionDetailsSchema = z
  .array(
    z.object({
      section: z.string().max(150),
      label: z.string().max(200),
      value: z.string().max(5000),
    }),
  )
  .max(400);

const admissionSchema = z.object({
  type: z.enum(ADMISSION_TYPES, { error: 'Tipo de acolhimento inválido' }),
  patient: z.object({
    fullName: z.string({ error: 'Informe o nome completo' }).trim().min(3, { error: 'Informe o nome completo' }).max(150),
    socialName: z.string().trim().max(150).optional(),
    cpf: cpfSchema,
    birthDate: dateOnlySchema.refine((date) => date.getTime() <= Date.now(), { error: 'Data de nascimento no futuro' }),
  }),
  reason: z.string({ error: 'Informe a demanda / queixa principal' }).trim().min(3, { error: 'Informe a demanda / queixa principal' }).max(5000),
  details: admissionDetailsSchema.default([]),
});

export const admissionsRouter = Router();

admissionsRouter.use(requireRole(PATIENT_ROLES));

admissionsRouter.post('/', async (req, res) => {
  const author = currentUser(req);
  const input = parseInput(admissionSchema, req.body);

  const existing = await prisma.patient.findUnique({ where: { cpf: input.patient.cpf }, select: { id: true } });
  if (existing) {
    throw new HttpError(409, 'Já existe paciente cadastrado com este CPF. Abra o prontuário existente.', 'PATIENT_EXISTS');
  }

  const { patient, admission } = await prisma.$transaction(async (tx) => {
    const createdPatient = await tx.patient.create({
      data: {
        fullName: input.patient.fullName,
        socialName: input.patient.socialName ? input.patient.socialName : null,
        cpf: input.patient.cpf,
        birthDate: input.patient.birthDate,
        createdById: author.id,
      },
      select: { id: true, fullName: true },
    });
    const createdAdmission = await tx.admission.create({
      data: {
        patientId: createdPatient.id,
        authorId: author.id,
        type: input.type,
        reason: input.reason,
        details: input.details as Prisma.InputJsonValue,
      },
      select: { id: true, date: true },
    });
    return { patient: createdPatient, admission: createdAdmission };
  });

  await recordAudit(req, { action: 'CREATE', entity: 'Patient', entityId: patient.id });
  await recordAudit(req, { action: 'CREATE', entity: 'Admission', entityId: patient.id, details: `acolhimento ${admission.id}` });

  res.status(201).json({ patientId: patient.id, admissionId: admission.id });
});
```

### 19. `revitalize-backend/src/routes/evolutions.ts` (criado)

**O que foi corrigido:** Histórico clínico, nova evolução e adendo. Não existem rotas de edição nem de exclusão. O autor vem sempre da sessão (um authorId enviado pelo navegador é ignorado) e o tipo de evolução respeita o perfil. Achados 2, 3, 4.

**Configuração externa:** Nenhuma.

```ts
import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { recordAudit } from '../audit.js';
import { currentUser, requireRole } from '../auth.js';
import { HttpError, idParam, parseInput } from '../http.js';
import { CLINICAL_ROLES, EVOLUTION_TYPE_ROLES, hasRole } from '../roles.js';

// Evoluções são imutáveis: só existem rotas de leitura, criação e adendo.
export const evolutionsRouter = Router();

// Montado em /api: o controle de perfil fica em cada rota para não afetar outras rotas.
const clinicalOnly = requireRole(CLINICAL_ROLES);

const evolutionSelect = {
  id: true,
  patientId: true,
  type: true,
  attendanceType: true,
  occurredAt: true,
  notes: true,
  details: true,
  amendsId: true,
  createdAt: true,
  author: { select: { id: true, name: true, role: true } },
} satisfies Prisma.EvolutionSelect;

async function ensurePatient(patientId: string): Promise<void> {
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!patient) throw new HttpError(404, 'Paciente não encontrado', 'NOT_FOUND');
}

// GET /api/patients/:id/evolutions
evolutionsRouter.get('/patients/:id/evolutions', clinicalOnly, async (req, res) => {
  const { id } = parseInput(idParam, req.params);
  await ensurePatient(id);

  const evolutions = await prisma.evolution.findMany({
    where: { patientId: id },
    orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    take: 500,
    select: evolutionSelect,
  });

  await recordAudit(req, { action: 'VIEW', entity: 'Evolution', entityId: id, details: 'histórico clínico do paciente' });
  res.json(evolutions);
});

const vitalSignsSchema = z
  .object({
    bloodPressure: z.string().trim().max(20).optional(),
    heartRate: z.string().trim().max(10).optional(),
    temperature: z.string().trim().max(10).optional(),
    spo2: z.string().trim().max(10).optional(),
  })
  .optional();

const topicSchema = z.object({
  title: z.string().trim().max(150),
  content: z.string().max(10000),
  isPrivate: z.boolean(),
});

const prescriptionSchema = z.object({
  medicine: z.string().trim().max(150),
  dosage: z.string().trim().max(150),
  frequency: z.string().trim().max(150),
});

const createEvolutionSchema = z
  .object({
    type: z.enum(['MEDICA', 'ENFERMAGEM', 'MULTIPROFISSIONAL'], { error: 'Tipo de evolução inválido' }),
    attendanceType: z.enum(['Atendimento na Unidade', 'Visita Domiciliar', 'Matriciamento'], {
      error: 'Tipo de atendimento inválido',
    }),
    occurredAt: z.iso.datetime({ offset: true, error: 'Data e horário inválidos' }).transform((value) => new Date(value)),
    notes: z.string().max(20000).default(''),
    vitalSigns: vitalSignsSchema,
    topics: z.array(topicSchema).max(30).optional(),
    prescriptions: z.array(prescriptionSchema).max(30).optional(),
  })
  .refine((data) => data.occurredAt.getTime() <= Date.now() + 5 * 60 * 1000, {
    error: 'A data do atendimento não pode estar no futuro',
    path: ['occurredAt'],
  })
  .refine(
    (data) =>
      data.type === 'MULTIPROFISSIONAL'
        ? (data.topics ?? []).some((topic) => topic.content.trim().length > 0)
        : data.notes.trim().length > 0,
    { error: 'Escreva a evolução antes de salvar', path: ['notes'] },
  );

// POST /api/patients/:id/evolutions
evolutionsRouter.post('/patients/:id/evolutions', clinicalOnly, async (req, res) => {
  const author = currentUser(req);
  const { id } = parseInput(idParam, req.params);
  const input = parseInput(createEvolutionSchema, req.body);

  if (!hasRole(author.role, EVOLUTION_TYPE_ROLES[input.type])) {
    await recordAudit(req, { action: 'ACCESS_DENIED', entity: 'Evolution', entityId: id, details: `tentou registrar evolução ${input.type}` });
    throw new HttpError(403, 'Seu perfil não pode registrar este tipo de evolução.', 'FORBIDDEN');
  }

  await ensurePatient(id);

  const details: Prisma.InputJsonObject = {
    ...(input.type === 'ENFERMAGEM' && input.vitalSigns ? { vitalSigns: input.vitalSigns } : {}),
    ...(input.type === 'MULTIPROFISSIONAL' ? { topics: (input.topics ?? []).filter((topic) => topic.content.trim().length > 0) } : {}),
    ...(input.type === 'MEDICA'
      ? { prescriptions: (input.prescriptions ?? []).filter((item) => item.medicine.length > 0) }
      : {}),
  };

  const evolution = await prisma.evolution.create({
    data: {
      patientId: id,
      authorId: author.id,
      type: input.type,
      attendanceType: input.attendanceType,
      occurredAt: input.occurredAt,
      notes: input.notes.trim(),
      details,
    },
    select: evolutionSelect,
  });

  await recordAudit(req, { action: 'CREATE', entity: 'Evolution', entityId: id, details: `evolução ${evolution.id}` });
  res.status(201).json(evolution);
});

const addendumSchema = z.object({
  notes: z.string({ error: 'Escreva o adendo' }).trim().min(3, { error: 'Escreva o adendo' }).max(10000),
});

// POST /api/evolutions/:id/addenda
evolutionsRouter.post('/evolutions/:id/addenda', clinicalOnly, async (req, res) => {
  const author = currentUser(req);
  const { id } = parseInput(idParam, req.params);
  const { notes } = parseInput(addendumSchema, req.body);

  const original = await prisma.evolution.findUnique({
    where: { id },
    select: { id: true, patientId: true, type: true, amendsId: true },
  });
  if (!original) throw new HttpError(404, 'Evolução não encontrada', 'NOT_FOUND');

  // Adendo sempre aponta para a evolução original, nunca para outro adendo.
  const targetId = original.amendsId ?? original.id;

  const addendum = await prisma.evolution.create({
    data: {
      patientId: original.patientId,
      authorId: author.id,
      type: original.type,
      attendanceType: 'Adendo',
      occurredAt: new Date(),
      notes,
      amendsId: targetId,
    },
    select: evolutionSelect,
  });

  await recordAudit(req, {
    action: 'ADDENDUM',
    entity: 'Evolution',
    entityId: original.patientId,
    details: `adendo ${addendum.id} à evolução ${targetId}`,
  });
  res.status(201).json(addendum);
});
```

### 20. `revitalize-backend/src/routes/users.ts` (criado)

**O que foi corrigido:** Administração de contas (criar com senha temporária, mudar perfil, desativar, desbloquear, redefinir senha) e consulta da auditoria, só para o perfil ADMIN. O administrador não consegue se desativar nem tirar o próprio perfil. Achados 2, 3, 14.

**Configuração externa:** Nenhuma.

```ts
import { Router } from 'express';
import { Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { recordAudit } from '../audit.js';
import { currentUser, generateTemporaryPassword, hashPassword, requireRole, revokeUserSessions } from '../auth.js';
import { HttpError, emailSchema, idParam, parseInput } from '../http.js';
import { ADMIN_ROLES } from '../roles.js';

// Administração de contas: somente o perfil ADMIN.
export const usersRouter = Router();

usersRouter.use(requireRole(ADMIN_ROLES));

const roleSchema = z.enum(Role, { error: 'Perfil inválido' });

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  mustChangePassword: true,
  lockedUntil: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

usersRouter.get('/', async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: { name: 'asc' }, select: userSelect });
  await recordAudit(req, { action: 'LIST', entity: 'User' });
  res.json(users);
});

const createUserSchema = z.object({
  name: z.string({ error: 'Informe o nome' }).trim().min(3, { error: 'Informe o nome completo' }).max(150),
  email: emailSchema,
  role: roleSchema,
});

// Cria a conta com senha temporária, mostrada uma única vez ao administrador.
usersRouter.post('/', async (req, res) => {
  const input = parseInput(createUserSchema, req.body);

  const exists = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (exists) throw new HttpError(409, 'Já existe uma conta com este e-mail.', 'USER_EXISTS', { email: 'E-mail já cadastrado' });

  const temporaryPassword = generateTemporaryPassword();
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      password: await hashPassword(temporaryPassword),
      mustChangePassword: true,
    },
    select: userSelect,
  });

  await recordAudit(req, { action: 'CREATE', entity: 'User', entityId: user.id, details: `perfil ${user.role}` });
  res.status(201).json({ user, temporaryPassword });
});

const updateUserSchema = z
  .object({
    name: z.string().trim().min(3).max(150).optional(),
    role: roleSchema.optional(),
    active: z.boolean().optional(),
    unlock: z.literal(true).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { error: 'Nada para alterar' });

usersRouter.patch('/:id', async (req, res) => {
  const admin = currentUser(req);
  const { id } = parseInput(idParam, req.params);
  const input = parseInput(updateUserSchema, req.body);

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, active: true } });
  if (!target) throw new HttpError(404, 'Usuário não encontrado', 'NOT_FOUND');

  if (id === admin.id && (input.active === false || (input.role && input.role !== 'ADMIN'))) {
    throw new HttpError(400, 'Você não pode desativar nem tirar o perfil de administrador da sua própria conta.', 'SELF_LOCKOUT');
  }

  const data: Prisma.UserUpdateInput = {};
  const changes: string[] = [];
  if (input.name !== undefined) {
    data.name = input.name;
    changes.push('nome');
  }
  if (input.role !== undefined && input.role !== target.role) {
    data.role = input.role;
    changes.push(`perfil ${target.role} para ${input.role}`);
  }
  if (input.active !== undefined && input.active !== target.active) {
    data.active = input.active;
    changes.push(input.active ? 'reativada' : 'desativada');
  }
  if (input.unlock) {
    data.lockedUntil = null;
    data.failedLoginCount = 0;
    changes.push('desbloqueada');
  }

  const user = await prisma.user.update({ where: { id }, data, select: userSelect });

  // Mudança de perfil ou desativação encerra as sessões abertas da conta.
  if (data.role !== undefined || data.active === false) await revokeUserSessions(id);

  await recordAudit(req, { action: 'UPDATE', entity: 'User', entityId: id, details: changes.join(', ') || 'sem alteração' });
  res.json(user);
});

usersRouter.post('/:id/reset-password', async (req, res) => {
  const { id } = parseInput(idParam, req.params);

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) throw new HttpError(404, 'Usuário não encontrado', 'NOT_FOUND');

  const temporaryPassword = generateTemporaryPassword();
  const user = await prisma.user.update({
    where: { id },
    data: {
      password: await hashPassword(temporaryPassword),
      mustChangePassword: true,
      failedLoginCount: 0,
      lockedUntil: null,
    },
    select: userSelect,
  });
  await revokeUserSessions(id);

  await recordAudit(req, { action: 'PASSWORD_RESET', entity: 'User', entityId: id });
  res.json({ user, temporaryPassword });
});

// ---------- Consulta da trilha de auditoria (somente leitura) ----------

export const auditRouter = Router();

auditRouter.use(requireRole(ADMIN_ROLES));

const auditQuerySchema = z.object({
  entityId: z.string().trim().max(64).optional(),
  userId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
});

const AUDIT_PAGE_SIZE = 50;

auditRouter.get('/', async (req, res) => {
  const { entityId, userId, page } = parseInput(auditQuerySchema, req.query);

  const where: Prisma.AuditLogWhereInput = {};
  if (entityId) where.entityId = entityId;
  if (userId) where.userId = userId;

  const [total, items] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        details: true,
        ip: true,
        createdAt: true,
        user: { select: { id: true, name: true, role: true } },
      },
    }),
  ]);

  await recordAudit(req, { action: 'VIEW', entity: 'AuditLog', details: `página ${page}` });
  res.json({ items, total, page, pageSize: AUDIT_PAGE_SIZE });
});
```

### 21. `revitalize-backend/src/app.ts` (criado)

**O que foi corrigido:** Monta a API: helmet com CSP e HSTS, x-powered-by desligado, trust proxy para a Hostinger, redirecionamento opcional para HTTPS, CORS só se configurado (com lista exata), Cache-Control: no-store nas respostas com dados, limite global de requisições, JSON de até 1 MB, cookie-parser, CSRF, rotas protegidas e tratamento central de erros sem detalhes internos. Também serve o frontend compilado no mesmo domínio. Achados 9, 12, 15, 21.

**Configuração externa:** TRUST_PROXY, FORCE_HTTPS, CORS_ORIGINS, FRONTEND_DIST (opcionais).

```ts
import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Prisma } from '@prisma/client';
import { config } from './config.js';
import { requireAuth, requireClientHeader, requirePasswordChanged } from './auth.js';
import { HttpError } from './http.js';
import { logError } from './logger.js';
import { authRouter } from './routes/auth.js';
import { evolutionsRouter } from './routes/evolutions.js';
import { admissionsRouter, patientsRouter } from './routes/patients.js';
import { auditRouter, usersRouter } from './routes/users.js';

export function createApp() {
  const app = express();

  // Atrás do proxy da Hostinger: necessário para req.ip, req.secure e o limite de tentativas.
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');

  const connectSrc = ["'self'", ...config.corsOrigins];
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc,
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          ...(config.isProduction ? { upgradeInsecureRequests: [] } : {}),
        },
      },
      strictTransportSecurity: config.isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  if (config.forceHttps) {
    app.use((req, res, next) => {
      if (req.secure) {
        next();
        return;
      }
      res.redirect(308, `https://${req.get('host') ?? ''}${req.originalUrl}`);
    });
  }

  // CORS só é ativado quando o frontend fica em outro endereço (CORS_ORIGINS).
  if (config.corsOrigins.length > 0) {
    app.use(
      '/api',
      cors({
        origin: config.corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PATCH'],
        allowedHeaders: ['Content-Type', 'X-Revitalize-Client'],
        maxAge: 600,
      }),
    );
  }

  app.use('/api', (_req, res, next) => {
    // Respostas com dados de pacientes nunca ficam em cache do navegador ou de proxies.
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      limit: 300,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: 'Muitas requisições. Aguarde um minuto.', code: 'RATE_LIMIT' },
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api', requireClientHeader);

  // ---------- Rotas públicas ----------
  app.get('/api/status', (_req, res) => {
    res.json({ message: 'API Revitalize operando com sucesso!' });
  });
  app.use('/api/auth', authRouter);

  // ---------- Rotas protegidas: sessão válida + senha temporária já trocada ----------
  app.use('/api', requireAuth, requirePasswordChanged);
  app.use('/api/users', usersRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/admissions', admissionsRouter);
  app.use('/api', evolutionsRouter);
  app.use('/api/patients', patientsRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Rota não encontrada', code: 'NOT_FOUND' });
  });

  // ---------- Frontend compilado (mesmo domínio da API) ----------
  // Usa FRONTEND_DIST; em produção, sem a variável, procura revitalize1-main/dist.
  const defaultDist = fileURLToPath(new URL('../../revitalize1-main/dist', import.meta.url));
  const frontendDist = config.frontendDist ?? (config.isProduction ? defaultDist : undefined);
  if (frontendDist) {
    const distDir = path.resolve(frontendDist);
    const indexFile = path.join(distDir, 'index.html');
    if (existsSync(indexFile)) {
      app.use(express.static(distDir, { index: false, maxAge: '1h' }));
      app.get(/^(?!\/api\/).*/, (_req, res) => {
        res.set('Cache-Control', 'no-cache');
        res.sendFile(indexFile);
      });
    } else {
      console.warn(`FRONTEND_DIST definido, mas ${indexFile} não existe. Rode o build do frontend.`);
    }
  }

  // ---------- Tratamento central de erros ----------
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message, code: error.code, fields: error.fields });
      return;
    }
    if (error instanceof SyntaxError && 'body' in error) {
      res.status(400).json({ error: 'JSON inválido', code: 'BAD_JSON' });
      return;
    }
    if (typeof error === 'object' && error !== null && (error as { type?: unknown }).type === 'entity.too.large') {
      res.status(413).json({ error: 'Conteúdo grande demais', code: 'TOO_LARGE' });
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ error: 'Registro já existe.', code: 'CONFLICT' });
      return;
    }
    logError('requisição', error);
    res.status(500).json({ error: 'Erro interno. Tente novamente.', code: 'INTERNAL' });
  });

  return app;
}
```

### 22. `revitalize-backend/src/server.ts` (alterado)

**O que foi corrigido:** Ponto de entrada: conecta ao banco, cria o primeiro administrador se preciso, sobe o servidor e encerra com segurança ao receber SIGTERM. Substitui o server.ts anterior (o código antigo de login e pacientes foi movido para routes/).

**Configuração externa:** PORT (padrão 3000).

```ts
import { config } from './config.js';
import { createApp } from './app.js';
import { prisma } from './db.js';
import { ensureFirstAdmin } from './bootstrap.js';
import { logError, logInfo } from './logger.js';

async function main(): Promise<void> {
  await prisma.$connect();
  await ensureFirstAdmin();

  const app = createApp();
  const server = app.listen(config.port, () => {
    logInfo(`Servidor rodando na porta ${config.port} (${config.env})`);
  });

  const shutdown = (signal: string) => {
    logInfo(`${signal} recebido, encerrando...`);
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(async (error: unknown) => {
  logError('inicialização', error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
```

### 23. `revitalize1-main/package.json` (alterado)

**O que foi corrigido:** react-router 7.13.0 para 7.18.4 e vite 6.3.5 para 6.4.4 (correções de segurança), com npm audit fix. Achado 16.

**Configuração externa:** Rodar `npm install` dentro de revitalize1-main depois de copiar.

```json
{
  "name": "@figma/my-make-file",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "build": "vite build",
    "dev": "vite"
  },
  "dependencies": {
    "@emotion/react": "11.14.0",
    "@emotion/styled": "11.14.1",
    "@mui/icons-material": "7.3.5",
    "@mui/material": "7.3.5",
    "@popperjs/core": "2.11.8",
    "@radix-ui/react-accordion": "1.2.3",
    "@radix-ui/react-alert-dialog": "1.1.6",
    "@radix-ui/react-aspect-ratio": "1.1.2",
    "@radix-ui/react-avatar": "1.1.3",
    "@radix-ui/react-checkbox": "1.1.4",
    "@radix-ui/react-collapsible": "1.1.3",
    "@radix-ui/react-context-menu": "2.2.6",
    "@radix-ui/react-dialog": "1.1.6",
    "@radix-ui/react-dropdown-menu": "2.1.6",
    "@radix-ui/react-hover-card": "1.1.6",
    "@radix-ui/react-label": "2.1.2",
    "@radix-ui/react-menubar": "1.1.6",
    "@radix-ui/react-navigation-menu": "1.2.5",
    "@radix-ui/react-popover": "1.1.6",
    "@radix-ui/react-progress": "1.1.2",
    "@radix-ui/react-radio-group": "1.2.3",
    "@radix-ui/react-scroll-area": "1.2.3",
    "@radix-ui/react-select": "2.1.6",
    "@radix-ui/react-separator": "1.1.2",
    "@radix-ui/react-slider": "1.2.3",
    "@radix-ui/react-slot": "1.1.2",
    "@radix-ui/react-switch": "1.1.3",
    "@radix-ui/react-tabs": "1.1.3",
    "@radix-ui/react-toggle-group": "1.1.2",
    "@radix-ui/react-toggle": "1.1.2",
    "@radix-ui/react-tooltip": "1.1.8",
    "canvas-confetti": "1.9.4",
    "class-variance-authority": "0.7.1",
    "clsx": "2.1.1",
    "cmdk": "1.1.1",
    "date-fns": "3.6.0",
    "embla-carousel-react": "8.6.0",
    "input-otp": "1.4.2",
    "lucide-react": "0.487.0",
    "motion": "12.23.24",
    "next-themes": "0.4.6",
    "react-day-picker": "8.10.1",
    "react-dnd": "16.0.1",
    "react-dnd-html5-backend": "16.0.1",
    "react-hook-form": "7.55.0",
    "react-popper": "2.3.0",
    "react-resizable-panels": "2.1.7",
    "react-responsive-masonry": "2.7.1",
    "react-router": "7.18.4",
    "react-slick": "0.31.0",
    "recharts": "2.15.2",
    "sonner": "2.0.3",
    "tailwind-merge": "3.2.0",
    "tw-animate-css": "1.3.8",
    "vaul": "1.1.2"
  },
  "devDependencies": {
    "@tailwindcss/vite": "4.1.12",
    "@vitejs/plugin-react": "4.7.0",
    "tailwindcss": "4.1.12",
    "vite": "6.4.4"
  },
  "peerDependencies": {
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "peerDependenciesMeta": {
    "react": {
      "optional": true
    },
    "react-dom": {
      "optional": true
    }
  },
  "pnpm": {
    "overrides": {
      "vite": "6.4.4"
    }
  }
}
```

### 24. `revitalize1-main/package-lock.json` (alterado)

**O que foi corrigido:** Versões exatas, com 0 vulnerabilidades no npm audit. Achado 16.

**Configuração externa:** Nenhuma além do `npm install`.

Arquivo gerado automaticamente pelo npm (milhares de linhas); a versão completa já está na pasta e não deve ser editada à mão.

### 25. `revitalize1-main/.gitignore` (alterado)

**O que foi corrigido:** Passa a ignorar dist/ e arquivos .env. Achado 13.

**Configuração externa:** Rodar uma vez `git rm -r --cached revitalize1-main/dist` para tirar o build antigo do repositório.

```text
node_modules

# Build gerado por "npm run build" (não versionar)
dist

# Variáveis de ambiente locais
.env
.env.*
!.env.example
```

### 26. `revitalize1-main/.env.example` (criado)

**O que foi corrigido:** Explica VITE_API_URL, que só é usado se a API ficar em outro domínio.

**Configuração externa:** Normalmente nada: deixe vazio.

```bash
# Deixe VITE_API_URL vazio quando a API e o site ficarem no mesmo domínio
# (recomendado). Só preencha se a API estiver em outro endereço, sempre com https.
# Exemplo: VITE_API_URL=https://api.seudominio.com.br
VITE_API_URL=
```

### 27. `revitalize1-main/index.html` (alterado)

**O que foi corrigido:** Idioma pt-BR, título sem "protótipo" e política de referrer que não vaza endereços internos.

**Configuração externa:** Nenhuma.

```html

  <!DOCTYPE html>
  <html lang="pt-BR">
    <head>
      
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Revitalize - Prontuário Eletrônico</title>
      <meta name="description" content="Revitalize: prontuário eletrônico para CAPS." />
      <meta name="robots" content="noindex, nofollow" />
      <meta name="referrer" content="no-referrer" />
      <style>html, body { height: 100%; margin: 0; } #root { height: 100%; }</style>
      
    </head>

    <body>
      
      <div id="root"></div>
      <script type="module" src="/src/main.tsx"></script>
      
    </body>
  </html>
```

### 28. `revitalize1-main/vite.config.ts` (alterado)

**O que foi corrigido:** Proxy de /api para o backend local em desenvolvimento (site e API na mesma origem, cookie funciona) e build sem sourcemaps. Achado 12.

**Configuração externa:** Em desenvolvimento o backend precisa estar em http://localhost:3000 (ou defina VITE_DEV_API_TARGET).

```ts
import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Em desenvolvimento, /api é repassado para o backend local. Assim o site e a
  // API ficam na mesma origem e o cookie de sessão (SameSite=Strict) funciona.
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_TARGET || 'http://localhost:3000',
        changeOrigin: false,
      },
    },
  },

  build: {
    // Não publica mapas do código-fonte em produção.
    sourcemap: false,
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
```

### 29. `revitalize1-main/src/app/roles.ts` (criado)

**O que foi corrigido:** Espelho da matriz de perfis do backend, usado para esconder menus e botões que o perfil não pode usar. Achado 2.

**Configuração externa:** Nenhuma.

```ts
// Espelho da matriz de acesso do backend (revitalize-backend/src/roles.ts).
// O backend é quem realmente bloqueia; aqui serve só para esconder o que o
// perfil não pode usar.

export type Role =
  | "ADMIN"
  | "MEDICO"
  | "ENFERMAGEM"
  | "PSICOLOGO"
  | "ASSISTENTE_SOCIAL"
  | "TERAPEUTA_OCUPACIONAL"
  | "RECEPCAO";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador do sistema",
  MEDICO: "Médico(a)",
  ENFERMAGEM: "Enfermagem",
  PSICOLOGO: "Psicólogo(a)",
  ASSISTENTE_SOCIAL: "Assistente Social",
  TERAPEUTA_OCUPACIONAL: "Terapeuta Ocupacional",
  RECEPCAO: "Recepção",
};

export const ALL_ROLES = Object.keys(ROLE_LABELS) as Role[];

export const CLINICAL_ROLES: Role[] = ["MEDICO", "ENFERMAGEM", "PSICOLOGO", "ASSISTENTE_SOCIAL", "TERAPEUTA_OCUPACIONAL"];

export const PATIENT_ROLES: Role[] = [...CLINICAL_ROLES, "RECEPCAO"];

export const ADMIN_ROLES: Role[] = ["ADMIN"];

// Perfis que usam as telas de rotina do CAPS (todos, exceto o administrador do sistema).
export const STAFF_ROLES: Role[] = PATIENT_ROLES;

export type EvolutionType = "MEDICA" | "ENFERMAGEM" | "MULTIPROFISSIONAL";

export const EVOLUTION_TYPE_ROLES: Record<EvolutionType, Role[]> = {
  MEDICA: ["MEDICO"],
  ENFERMAGEM: ["ENFERMAGEM"],
  MULTIPROFISSIONAL: CLINICAL_ROLES,
};

export function hasRole(role: Role | undefined, allowed: Role[]): boolean {
  return role !== undefined && allowed.includes(role);
}
```

### 30. `revitalize1-main/src/app/api.ts` (alterado)

**O que foi corrigido:** Cliente HTTP sem token no navegador: usa o cookie httpOnly (credentials: include), envia o cabeçalho anti-CSRF, URL relativa por padrão, avisa a aplicação em qualquer 401 e traz as funções de todas as rotas novas. Achados 7, 12, 20.

**Configuração externa:** VITE_API_URL só se a API ficar em outro domínio.

```ts
import type { EvolutionType, Role } from "./roles";

// Por padrão a API fica no mesmo endereço do site (em desenvolvimento o Vite
// repassa /api para http://localhost:3000). Só defina VITE_API_URL se a API
// ficar em outro domínio, sempre com https.
const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export const UNAUTHORIZED_EVENT = "revitalize:unauthorized";
export const PASSWORD_CHANGE_EVENT = "revitalize:password-change-required";

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, message: string, code?: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

// ---------- Tipos ----------

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
};

export type SessionInfo = {
  idleMinutes: number;
  expiresAt: string;
};

export type PatientStatus = "ATIVO" | "EM_CRISE" | "INATIVO";

export const PATIENT_STATUS_LABELS: Record<PatientStatus, string> = {
  ATIVO: "Ativo",
  EM_CRISE: "Em Crise",
  INATIVO: "Inativo",
};

export type Patient = {
  id: string;
  fullName: string;
  socialName: string | null;
  cpf: string;
  birthDate: string;
  status: PatientStatus;
  createdAt: string;
};

export type PatientDetail = Patient & {
  lastAdmission: {
    id: string;
    type: string;
    date: string;
    author: { name: string; role: Role };
  } | null;
};

export type PatientPage = {
  items: Patient[];
  total: number;
  page: number;
  pageSize: number;
};

export type VitalSigns = {
  bloodPressure?: string;
  heartRate?: string;
  temperature?: string;
  spo2?: string;
};

export type EvolutionTopic = { title: string; content: string; isPrivate: boolean };

export type Prescription = { medicine: string; dosage: string; frequency: string };

export type Evolution = {
  id: string;
  patientId: string;
  type: EvolutionType;
  attendanceType: string;
  occurredAt: string;
  notes: string;
  details: {
    vitalSigns?: VitalSigns;
    topics?: EvolutionTopic[];
    prescriptions?: Prescription[];
  } | null;
  amendsId: string | null;
  createdAt: string;
  author: { id: string; name: string; role: Role };
};

export type NewEvolutionInput = {
  type: EvolutionType;
  attendanceType: string;
  occurredAt: string;
  notes: string;
  vitalSigns?: VitalSigns;
  topics?: EvolutionTopic[];
  prescriptions?: Prescription[];
};

export type AdmissionDetail = { section: string; label: string; value: string };

export type NewAdmissionInput = {
  type: "geral" | "transtorno-mental" | "alcool-drogas";
  patient: { fullName: string; socialName?: string; cpf: string; birthDate: string };
  reason: string;
  details: AdmissionDetail[];
};

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  mustChangePassword: boolean;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

export type AuditEntry = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  ip: string | null;
  createdAt: string;
  user: { id: string; name: string; role: Role } | null;
};

// ---------- Cliente HTTP ----------

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      // A sessão viaja só no cookie httpOnly; nenhum token fica no navegador.
      credentials: "include",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-Revitalize-Client": "web",
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(0, "Não foi possível conectar ao servidor. Verifique a internet.");
  }

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const isLoginAttempt = path.startsWith("/api/auth/login");
    if (response.status === 401 && !isLoginAttempt) {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: data.code }));
    }
    if (response.status === 403 && data.code === "PASSWORD_CHANGE_REQUIRED") {
      window.dispatchEvent(new CustomEvent(PASSWORD_CHANGE_EVENT));
    }
    throw new ApiError(response.status, data.error || "Não foi possível concluir a operação.", data.code, data.fields);
  }

  return data as T;
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
}

function patch<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

// ---------- Autenticação ----------

export function login(email: string, password: string) {
  return post<{ user: AuthUser; session: SessionInfo }>("/api/auth/login", { email, password });
}

export function getMe() {
  return apiRequest<{ user: AuthUser; session: SessionInfo }>("/api/auth/me");
}

export function pingSession() {
  return post<void>("/api/auth/ping");
}

export function logout() {
  return post<void>("/api/auth/logout");
}

export function changePassword(currentPassword: string, newPassword: string) {
  return post<{ user: AuthUser }>("/api/auth/change-password", { currentPassword, newPassword });
}

// ---------- Pacientes ----------

export function getPatients(params: { search?: string; status?: PatientStatus; page?: number } = {}): Promise<PatientPage> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.page) query.set("page", String(params.page));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<PatientPage>(`/api/patients${suffix}`);
}

export function getPatient(id: string): Promise<PatientDetail> {
  return apiRequest<PatientDetail>(`/api/patients/${encodeURIComponent(id)}`);
}

export function updatePatientStatus(id: string, status: PatientStatus) {
  return patch<{ id: string; status: PatientStatus }>(`/api/patients/${encodeURIComponent(id)}/status`, { status });
}

export function createAdmission(input: NewAdmissionInput) {
  return post<{ patientId: string; admissionId: string }>("/api/admissions", input);
}

// ---------- Evoluções ----------

export function getEvolutions(patientId: string): Promise<Evolution[]> {
  return apiRequest<Evolution[]>(`/api/patients/${encodeURIComponent(patientId)}/evolutions`);
}

export function createEvolution(patientId: string, input: NewEvolutionInput): Promise<Evolution> {
  return post<Evolution>(`/api/patients/${encodeURIComponent(patientId)}/evolutions`, input);
}

export function createAddendum(evolutionId: string, notes: string): Promise<Evolution> {
  return post<Evolution>(`/api/evolutions/${encodeURIComponent(evolutionId)}/addenda`, { notes });
}

// ---------- Administração ----------

export function getUsers(): Promise<ManagedUser[]> {
  return apiRequest<ManagedUser[]>("/api/users");
}

export function createUser(input: { name: string; email: string; role: Role }) {
  return post<{ user: ManagedUser; temporaryPassword: string }>("/api/users", input);
}

export function updateUser(id: string, input: { name?: string; role?: Role; active?: boolean; unlock?: true }) {
  return patch<ManagedUser>(`/api/users/${encodeURIComponent(id)}`, input);
}

export function resetUserPassword(id: string) {
  return post<{ user: ManagedUser; temporaryPassword: string }>(`/api/users/${encodeURIComponent(id)}/reset-password`);
}

export function getAuditLog(params: { entityId?: string; page?: number } = {}) {
  const query = new URLSearchParams();
  if (params.entityId) query.set("entityId", params.entityId);
  if (params.page) query.set("page", String(params.page));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<{ items: AuditEntry[]; total: number; page: number; pageSize: number }>(`/api/audit${suffix}`);
}

// ---------- Utilidades de exibição ----------

export function formatDateBR(isoDate: string): string {
  // Datas "AAAA-MM-DD" são mostradas sem conversão de fuso para não voltar um dia.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? isoDate : date.toLocaleDateString("pt-BR");
}

export function formatDateTimeBR(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ageFrom(isoDate: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const today = new Date();
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1;
  return age;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter((part) => part.length > 0)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
```

### 31. `revitalize1-main/src/app/contexts/AuthContext.tsx` (criado)

**O que foi corrigido:** Estado de login vindo do servidor (/api/auth/me), logout real, encerramento automático após 15 minutos sem uso, ping para manter a sessão enquanto a pessoa trabalha e limpeza de dados que versões antigas deixavam no navegador. Achados 6, 7, 8, 20.

**Configuração externa:** Nenhuma.

```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  PASSWORD_CHANGE_EVENT,
  UNAUTHORIZED_EVENT,
  getMe,
  login as loginRequest,
  logout as logoutRequest,
  pingSession,
  type AuthUser,
} from "../api";

type LogoutReason = "manual" | "idle" | "expired";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  // Mensagem mostrada na tela de login (ex.: sessão encerrada por inatividade).
  notice: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: (reason?: LogoutReason) => Promise<void>;
  setUser: (user: AuthUser) => void;
  clearNotice: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll", "wheel"] as const;
// Avisa o servidor no máximo a cada 2 minutos que a pessoa continua usando o sistema.
const PING_INTERVAL_MS = 2 * 60 * 1000;
const CHECK_INTERVAL_MS = 15 * 1000;
const LEGACY_STORAGE_KEYS = ["revitalize-token", "currentAppointment", "appointmentNotes"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [idleMinutes, setIdleMinutes] = useState(15);

  const lastActivity = useRef(Date.now());
  const lastPing = useRef(Date.now());

  // Ao abrir o sistema, pergunta ao servidor se o cookie de sessão ainda é válido.
  useEffect(() => {
    // Remove dados que versões antigas do sistema gravavam no navegador.
    LEGACY_STORAGE_KEYS.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // Navegador sem acesso ao armazenamento: nada a limpar.
      }
    });

    let active = true;
    getMe()
      .then(({ user: me, session }) => {
        if (!active) return;
        setUserState(me);
        setIdleMinutes(session.idleMinutes);
      })
      .catch(() => {
        if (active) setUserState(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const endLocalSession = useCallback((message: string | null) => {
    setUserState(null);
    setNotice(message);
  }, []);

  const logout = useCallback(
    async (reason: LogoutReason = "manual") => {
      try {
        await logoutRequest();
      } catch {
        // Mesmo sem resposta do servidor, a tela é fechada.
      }
      endLocalSession(
        reason === "idle"
          ? "Sua sessão foi encerrada após um período sem uso. Entre novamente."
          : reason === "expired"
            ? "Sua sessão expirou. Entre novamente."
            : null,
      );
    },
    [endLocalSession],
  );

  // Qualquer resposta 401 da API fecha a sessão na tela.
  useEffect(() => {
    const onUnauthorized = () => {
      setUserState((current) => {
        if (current) setNotice("Sua sessão expirou. Entre novamente.");
        return null;
      });
    };
    const onPasswordChange = () => {
      setUserState((current) => (current ? { ...current, mustChangePassword: true } : current));
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    window.addEventListener(PASSWORD_CHANGE_EVENT, onPasswordChange);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
      window.removeEventListener(PASSWORD_CHANGE_EVENT, onPasswordChange);
    };
  }, []);

  // Controle de inatividade: encerra a sessão após o tempo definido no servidor
  // e mantém a sessão viva no servidor enquanto houver uso da tela.
  useEffect(() => {
    if (!user) return;
    lastActivity.current = Date.now();
    lastPing.current = Date.now();

    const onActivity = () => {
      lastActivity.current = Date.now();
    };
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));

    const timer = window.setInterval(() => {
      const now = Date.now();
      if (now - lastActivity.current > idleMinutes * 60 * 1000) {
        void logout("idle");
        return;
      }
      if (lastActivity.current > lastPing.current && now - lastPing.current > PING_INTERVAL_MS) {
        lastPing.current = now;
        pingSession().catch(() => undefined);
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity));
      window.clearInterval(timer);
    };
  }, [user, idleMinutes, logout]);

  const login = useCallback(async (email: string, password: string) => {
    const { user: loggedUser, session } = await loginRequest(email, password);
    setIdleMinutes(session.idleMinutes);
    setNotice(null);
    setUserState(loggedUser);
    return loggedUser;
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      notice,
      login,
      logout,
      setUser: (next: AuthUser) => setUserState(next),
      clearNotice: () => setNotice(null),
    }),
    [user, loading, notice, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

### 32. `revitalize1-main/src/app/components/PrivateRoute.tsx` (alterado)

**O que foi corrigido:** Só libera a tela com sessão válida conferida no servidor, força a troca da senha temporária e bloqueia telas por perfil. Achados 2, 20.

**Configuração externa:** Nenhuma.

```tsx
import { Navigate, Outlet, useLocation } from "react-router";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { hasRole, type Role } from "../roles";

type PrivateRouteProps = {
  // Perfis que podem abrir as telas filhas. Sem a lista, basta estar logado.
  roles?: Role[];
};

export default function PrivateRoute({ roles }: PrivateRouteProps) {
  const location = useLocation();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Verificando sessão...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (user.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (roles && !hasRole(user.role, roles)) {
    return (
      <div className="p-6">
        <div className="max-w-lg mx-auto mt-12 bg-card rounded-xl border border-border p-8 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-semibold text-foreground">Acesso não permitido</h1>
          <p className="text-sm text-muted-foreground">
            Seu perfil não tem permissão para abrir esta tela. Se precisar de acesso, procure o administrador do sistema.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
```

### 33. `revitalize1-main/src/app/routes.tsx` (alterado)

**O que foi corrigido:** Rotas agrupadas por perfil, tela de troca de senha e tela de Usuários e Auditoria. Achado 2.

**Configuração externa:** Nenhuma.

```tsx
import { createBrowserRouter } from "react-router";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import PatientProfile from "./pages/PatientProfile";
import NewAdmission from "./pages/NewAdmission";
import NewEvolution from "./pages/NewEvolution";
import Workshops from "./pages/Workshops";
import GroupSession from "./pages/GroupSession";
import DailyProduction from "./pages/DailyProduction";
import Absences from "./pages/Absences";
import Referrals from "./pages/Referrals";
import AppointmentSession from "./pages/AppointmentSession";
import Schedule from "./pages/Schedule";
import MedicalRecords from "./pages/MedicalRecords";
import Users from "./pages/Users";
import Layout from "./components/Layout";
import PrivateRoute from "./components/PrivateRoute";
import { ADMIN_ROLES, CLINICAL_ROLES, PATIENT_ROLES, STAFF_ROLES } from "./roles";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    element: <PrivateRoute />,
    children: [
      { path: "/change-password", element: <ChangePassword /> },
      {
        element: <Layout />,
        children: [
          {
            element: <PrivateRoute roles={STAFF_ROLES} />,
            children: [
              { path: "/dashboard", element: <Dashboard /> },
              { path: "/schedule", element: <Schedule /> },
              { path: "/workshops", element: <Workshops /> },
              { path: "/group-session", element: <GroupSession /> },
              { path: "/daily-production", element: <DailyProduction /> },
              { path: "/absences", element: <Absences /> },
              { path: "/referrals", element: <Referrals /> },
              { path: "/appointment-session", element: <AppointmentSession /> },
            ],
          },
          {
            element: <PrivateRoute roles={PATIENT_ROLES} />,
            children: [
              { path: "/patients", element: <Patients /> },
              { path: "/patients/:id", element: <PatientProfile /> },
              { path: "/admission", element: <NewAdmission /> },
            ],
          },
          {
            element: <PrivateRoute roles={CLINICAL_ROLES} />,
            children: [
              { path: "/medical-records", element: <MedicalRecords /> },
              { path: "/evolution/:patientId", element: <NewEvolution /> },
            ],
          },
          {
            element: <PrivateRoute roles={ADMIN_ROLES} />,
            children: [{ path: "/users", element: <Users /> }],
          },
        ],
      },
    ],
  },
]);
```

### 34. `revitalize1-main/src/app/App.tsx` (alterado)

**O que foi corrigido:** Envolve o app com o AuthProvider.

**Configuração externa:** Nenhuma.

```tsx
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}
```

### 35. `revitalize1-main/src/app/components/Layout.tsx` (alterado)

**O que foi corrigido:** Botão Sair funcionando (desktop e celular), menu filtrado por perfil, nome e perfil reais do usuário no cabeçalho e atalho para trocar a senha. Achados 2, 6.

**Configuração externa:** Nenhuma.

```tsx
import { Outlet, Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  FileText,
  Palette,
  UsersRound,
  BarChart3,
  CalendarX,
  ArrowRightLeft,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Calendar,
  FolderOpen,
  ShieldCheck,
  KeyRound
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { initials } from "../api";
import { ADMIN_ROLES, CLINICAL_ROLES, PATIENT_ROLES, ROLE_LABELS, STAFF_ROLES, hasRole } from "../roles";
import logoLight from "../../imports/Logos_Revitalize.png";
import logoDark from "../../imports/Logos_Revitalize_(1).png";

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  // Sidebar is always dark blue, so we always use the light/white logo version (logoDark)
  const sidebarLogo = logoDark;
  const logo = theme === "dark" ? logoDark : logoLight;

  const allNavigation = [
    { name: "Painel de Indicadores", href: "/dashboard", icon: LayoutDashboard, roles: STAFF_ROLES },
    { name: "Agenda", href: "/schedule", icon: Calendar, roles: STAFF_ROLES },
    { name: "Prontuários", href: "/medical-records", icon: FolderOpen, roles: CLINICAL_ROLES },
    { name: "Pacientes", href: "/patients", icon: Users, roles: PATIENT_ROLES },
    { name: "Acolhimento", href: "/admission", icon: UserPlus, roles: PATIENT_ROLES },
    { name: "Oficinas Terapêuticas", href: "/workshops", icon: Palette, roles: STAFF_ROLES },
    { name: "Atendimento em Grupo", href: "/group-session", icon: UsersRound, roles: STAFF_ROLES },
    { name: "Produção Diária", href: "/daily-production", icon: BarChart3, roles: STAFF_ROLES },
    { name: "Gestão de Faltas", href: "/absences", icon: CalendarX, roles: STAFF_ROLES },
    { name: "Encaminhamentos", href: "/referrals", icon: ArrowRightLeft, roles: STAFF_ROLES },
    { name: "Usuários e Auditoria", href: "/users", icon: ShieldCheck, roles: ADMIN_ROLES },
  ];

  // Cada perfil vê só os itens que pode abrir.
  const navigation = allNavigation.filter((item) => hasRole(user?.role, item.roles));

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setSidebarOpen(false);
    await logout("manual");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-sidebar border-r border-sidebar-border">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <img src={sidebarLogo} alt="Revitalize" className="h-12" />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all disabled:opacity-60"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">{loggingOut ? "Saindo..." : "Sair"}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
            <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-border">
              <img src={sidebarLogo} alt="Revitalize" className="h-12" />
              <button onClick={() => setSidebarOpen(false)} className="text-sidebar-foreground">
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="p-3 border-t border-sidebar-border">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all disabled:opacity-60"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm">{loggingOut ? "Saindo..." : "Sair"}</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-foreground"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-foreground transition-all"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
            <Link
              to="/change-password"
              title="Trocar senha"
              className="w-9 h-9 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-foreground transition-all"
              aria-label="Trocar senha"
            >
              <KeyRound className="w-4 h-4" />
            </Link>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{user?.name ?? ""}</p>
              <p className="text-xs text-muted-foreground">{user ? ROLE_LABELS[user.role] : ""}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
              {user ? initials(user.name) : ""}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

### 36. `revitalize1-main/src/app/pages/Login.tsx` (alterado)

**O que foi corrigido:** Login pelo AuthContext (sem gravar token), campo de e-mail correto (o backend nunca aceitou CPF), aviso de sessão encerrada, remoção do "Lembrar-me" sem função e troca do falso "E-mail enviado" por orientação real de procurar o administrador. Achados 6, 7, 14.

**Configuração externa:** Nenhuma.

```tsx
import { Navigate, useNavigate } from "react-router";
import { Lock, User, Moon, Sun, X, ShieldCheck } from "lucide-react";
import logoLight from "../../imports/Logos_Revitalize.png";
import logoDark from "../../imports/Logos_Revitalize_(1).png";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import type { AuthUser } from "../api";

function homeFor(user: AuthUser): string {
  if (user.mustChangePassword) return "/change-password";
  return user.role === "ADMIN" ? "/users" : "/dashboard";
}

export default function Login() {
  const navigate = useNavigate();
  const { user, loading, notice, login, clearNotice } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const logo = isDark ? logoDark : logoLight;

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);

    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);

    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    clearNotice();

    try {
      const loggedUser = await login(email.trim(), password);
      setPassword("");
      navigate(homeFor(loggedUser), { replace: true });
    } catch (error) {
      setPassword("");
      setLoginError(error instanceof Error ? error.message : "Não foi possível efetuar o login.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Quem já tem sessão válida não precisa ver a tela de login.
  if (!loading && user) {
    return <Navigate to={homeFor(user)} replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1433] via-[#1A2847] to-[#2A3B5F] flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
      </div>

      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-lg group"
        aria-label="Toggle theme"
      >
        {isDark ? (
          <Sun className="w-5 h-5 group-hover:scale-110 transition-transform" />
        ) : (
          <Moon className="w-5 h-5 group-hover:scale-110 transition-transform" />
        )}
      </button>

      <div className="w-full max-w-md relative">
        <div className="bg-card rounded-2xl shadow-2xl p-8 space-y-8 border border-border">
          <div className="text-center space-y-4">
            <img src={logo} alt="Revitalize" className="h-32 mx-auto" />
            <p className="text-sm text-muted-foreground">
              Prontuário Eletrônico para CAPS
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  E-mail
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    maxLength={191}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    placeholder="Digite seu e-mail"
                    className="w-full pl-10 pr-4 py-3 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    maxLength={200}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    placeholder="Digite sua senha"
                    className="w-full pl-10 pr-4 py-3 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end text-sm">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-primary hover:underline"
              >
                Esqueceu a senha?
              </button>
            </div>

            {notice && !loginError && (
              <p className="rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                {notice}
              </p>
            )}

            {loginError && (
              <p className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoggingIn || loading}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl disabled:opacity-60"
            >
              {isLoggingIn ? "Entrando..." : "Entrar no Sistema"}
            </button>
          </form>

          <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
            <p>© 2026 Revitalize</p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-white/60">
            Tema: {isDark ? "Escuro" : "Claro"}
          </p>
        </div>
      </div>

      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowForgotPassword(false)}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Recuperar Senha</h3>
              <button onClick={() => setShowForgotPassword(false)} className="p-2 hover:bg-muted rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center py-4 space-y-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <p className="font-medium text-foreground">A senha é redefinida pelo administrador</p>
              <p className="text-sm text-muted-foreground">
                Por segurança dos prontuários, o Revitalize não envia senhas por e-mail. Procure o administrador do
                sistema ou a coordenação do CAPS: ele gera uma senha temporária, que você troca no primeiro acesso.
              </p>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 37. `revitalize1-main/src/app/pages/ChangePassword.tsx` (criado)

**O que foi corrigido:** Nova tela para trocar a senha temporária no primeiro acesso ou a qualquer momento, com as regras da política de senha. Achado 14.

**Configuração externa:** Nenhuma.

```tsx
import { useState } from "react";
import { useNavigate } from "react-router";
import { KeyRound, LogOut } from "lucide-react";
import { ApiError, changePassword } from "../api";
import { useAuth } from "../contexts/AuthContext";

function passwordProblems(value: string): string[] {
  const problems: string[] = [];
  if (value.length < 10) problems.push("pelo menos 10 caracteres");
  if (new TextEncoder().encode(value).length > 72) problems.push("no máximo 72 caracteres");
  if (!/[A-Za-zÀ-ÿ]/.test(value)) problems.push("pelo menos uma letra");
  if (!/\d/.test(value)) problems.push("pelo menos um número");
  return problems;
}

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const problems = passwordProblems(newPassword);
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const forced = user?.mustChangePassword ?? false;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (problems.length > 0) {
      setError(`A nova senha precisa ter ${problems.join(", ")}.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("A confirmação não confere com a nova senha.");
      return;
    }
    setSaving(true);
    try {
      const { user: updated } = await changePassword(currentPassword, newPassword);
      setUser(updated);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      navigate(updated.role === "ADMIN" ? "/users" : "/dashboard", { replace: true });
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.fields) {
        setError(Object.values(requestError.fields)[0] ?? requestError.message);
      } else {
        setError(requestError instanceof Error ? requestError.message : "Não foi possível trocar a senha.");
      }
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <KeyRound className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Trocar senha</h1>
          <p className="text-sm text-muted-foreground">
            {forced
              ? "Você entrou com uma senha temporária. Crie uma senha pessoal para continuar."
              : "Crie uma nova senha pessoal. Não compartilhe sua senha com ninguém."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="current" className="block text-sm font-medium text-foreground mb-2">
              {forced ? "Senha temporária" : "Senha atual"}
            </label>
            <input
              id="current"
              type="password"
              autoComplete="current-password"
              required
              maxLength={200}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="new" className="block text-sm font-medium text-foreground mb-2">Nova senha</label>
            <input
              id="new"
              type="password"
              autoComplete="new-password"
              required
              maxLength={72}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
            <p className={`text-xs mt-1 ${newPassword && problems.length > 0 ? "text-red-600" : "text-muted-foreground"}`}>
              Mínimo de 10 caracteres, com letras e números.
            </p>
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-foreground mb-2">Confirme a nova senha</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              maxLength={72}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
            {mismatch && <p className="text-xs mt-1 text-red-600">As senhas não conferem.</p>}
          </div>

          {error && (
            <p className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>

        <div className="flex justify-between text-sm">
          {!forced ? (
            <button type="button" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
              Voltar
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => void logout()}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 38. `revitalize1-main/src/app/pages/Users.tsx` (criado)

**O que foi corrigido:** Nova tela do administrador: criar contas com senha temporária mostrada uma única vez, mudar perfil, desativar, desbloquear, redefinir senha e consultar a trilha de auditoria (filtrando por paciente). Achados 2, 3, 14.

**Configuração externa:** Nenhuma.

```tsx
import { useCallback, useEffect, useState } from "react";
import { KeyRound, Lock, ShieldCheck, Unlock, UserPlus, X } from "lucide-react";
import {
  createUser,
  formatDateTimeBR,
  getAuditLog,
  getUsers,
  resetUserPassword,
  updateUser,
  type AuditEntry,
  type ManagedUser,
} from "../api";
import { useAuth } from "../contexts/AuthContext";
import { ALL_ROLES, ROLE_LABELS, type Role } from "../roles";

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Entrou no sistema",
  LOGIN_FAIL: "Senha incorreta",
  LOGIN_BLOCKED: "Conta bloqueada por tentativas",
  LOGOUT: "Saiu do sistema",
  SESSION_EXPIRED: "Sessão expirada",
  PASSWORD_CHANGE: "Trocou a senha",
  PASSWORD_RESET: "Senha redefinida",
  LIST: "Listou",
  VIEW: "Visualizou",
  CREATE: "Criou",
  ADDENDUM: "Adendo",
  UPDATE: "Alterou",
  ACCESS_DENIED: "Acesso negado",
};

type TemporaryPassword = { name: string; email: string; password: string };

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<{ name: string; email: string; role: Role }>({ name: "", email: "", role: "RECEPCAO" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [temporary, setTemporary] = useState<TemporaryPassword | null>(null);

  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditFilter, setAuditFilter] = useState("");
  const [auditQuery, setAuditQuery] = useState("");
  const auditPageSize = 50;

  const loadUsers = useCallback(async () => {
    try {
      setUsers(await getUsers());
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível carregar os usuários.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    let active = true;
    getAuditLog({ page: auditPage, entityId: auditQuery || undefined })
      .then((data) => {
        if (!active) return;
        setAudit(data.items);
        setAuditTotal(data.total);
      })
      .catch(() => {
        if (active) setAudit([]);
      });
    return () => {
      active = false;
    };
  }, [auditPage, auditQuery]);

  const replaceUser = (updated: ManagedUser) => {
    setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const { user, temporaryPassword } = await createUser({ name: form.name.trim(), email: form.email.trim(), role: form.role });
      setUsers((current) => [...current, user].sort((a, b) => a.name.localeCompare(b.name)));
      setTemporary({ name: user.name, email: user.email, password: temporaryPassword });
      setForm({ name: "", email: "", role: "RECEPCAO" });
      setShowCreate(false);
    } catch (requestError) {
      setFormError(requestError instanceof Error ? requestError.message : "Não foi possível criar a conta.");
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (target: ManagedUser, role: Role) => {
    if (role === target.role) return;
    if (!confirm(`Mudar o perfil de ${target.name} para ${ROLE_LABELS[role]}? As sessões abertas dessa pessoa serão encerradas.`)) return;
    try {
      replaceUser(await updateUser(target.id, { role }));
    } catch (requestError) {
      alert(requestError instanceof Error ? requestError.message : "Não foi possível alterar o perfil.");
    }
  };

  const handleToggleActive = async (target: ManagedUser) => {
    const action = target.active ? "desativar" : "reativar";
    if (!confirm(`Deseja ${action} a conta de ${target.name}?`)) return;
    try {
      replaceUser(await updateUser(target.id, { active: !target.active }));
    } catch (requestError) {
      alert(requestError instanceof Error ? requestError.message : "Não foi possível alterar a conta.");
    }
  };

  const handleUnlock = async (target: ManagedUser) => {
    try {
      replaceUser(await updateUser(target.id, { unlock: true }));
    } catch (requestError) {
      alert(requestError instanceof Error ? requestError.message : "Não foi possível desbloquear a conta.");
    }
  };

  const handleReset = async (target: ManagedUser) => {
    if (!confirm(`Gerar nova senha temporária para ${target.name}? A senha atual deixa de funcionar e as sessões abertas serão encerradas.`)) return;
    try {
      const { user, temporaryPassword } = await resetUserPassword(target.id);
      replaceUser(user);
      setTemporary({ name: user.name, email: user.email, password: temporaryPassword });
    } catch (requestError) {
      alert(requestError instanceof Error ? requestError.message : "Não foi possível redefinir a senha.");
    }
  };

  const isLocked = (target: ManagedUser) => target.lockedUntil !== null && new Date(target.lockedUntil) > new Date();
  const userName = (id: string | null) => users.find((item) => item.id === id)?.name;
  const auditPages = Math.max(1, Math.ceil(auditTotal / auditPageSize));
  const inputClass =
    "w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Usuários e Auditoria</h1>
          <p className="text-muted-foreground mt-1">Contas de acesso da equipe e registro de quem acessou o quê</p>
        </div>
        <button
          onClick={() => {
            setShowCreate(true);
            setFormError("");
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all"
        >
          <UserPlus className="w-5 h-5" />
          Nova conta
        </button>
      </div>

      {temporary && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-5 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Senha temporária de {temporary.name}</p>
              <p className="text-sm text-muted-foreground">
                Entregue pessoalmente para {temporary.email}. Ela aparece só agora e será trocada no primeiro acesso.
              </p>
              <p className="font-mono text-lg tracking-wider text-foreground select-all">{temporary.password}</p>
            </div>
            <button onClick={() => setTemporary(null)} className="p-2 hover:bg-muted rounded-lg" aria-label="Fechar">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 px-4 py-3 rounded-lg text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Perfil</th>
              <th className="px-4 py-3 font-medium">Situação</th>
              <th className="px-4 py-3 font-medium">Último acesso</th>
              <th className="px-4 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td>
              </tr>
            )}
            {users.map((item) => (
              <tr key={item.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{item.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={item.role}
                    disabled={item.id === me?.id}
                    onChange={(e) => void handleRoleChange(item, e.target.value as Role)}
                    className="px-2 py-1.5 bg-input-background border border-input rounded-lg disabled:opacity-60"
                  >
                    {ALL_ROLES.map((role) => (
                      <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                      {item.active ? "Ativa" : "Desativada"}
                    </span>
                    {item.mustChangePassword && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Senha temporária</span>
                    )}
                    {isLocked(item) && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Bloqueada</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{item.lastLoginAt ? formatDateTimeBR(item.lastLoginAt) : "Nunca"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {isLocked(item) && (
                      <button onClick={() => void handleUnlock(item)} title="Desbloquear" className="p-2 hover:bg-muted rounded-lg">
                        <Unlock className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => void handleReset(item)} title="Gerar senha temporária" className="p-2 hover:bg-muted rounded-lg">
                      <KeyRound className="w-4 h-4" />
                    </button>
                    {item.id !== me?.id && (
                      <button
                        onClick={() => void handleToggleActive(item)}
                        title={item.active ? "Desativar conta" : "Reativar conta"}
                        className="p-2 hover:bg-muted rounded-lg"
                      >
                        {item.active ? <Lock className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Registro de acessos</h2>
            <p className="text-sm text-muted-foreground">
              {auditTotal} registro(s). Para ver quem abriu um prontuário, cole o código do paciente (o final do endereço da página dele).
            </p>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setAuditPage(1);
              setAuditQuery(auditFilter.trim());
            }}
          >
            <input
              value={auditFilter}
              onChange={(e) => setAuditFilter(e.target.value)}
              placeholder="Código do paciente ou registro"
              maxLength={64}
              className="px-3 py-2 bg-input-background border border-input rounded-lg text-sm w-72"
            />
            <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">Filtrar</button>
            {auditQuery && (
              <button
                type="button"
                onClick={() => {
                  setAuditFilter("");
                  setAuditQuery("");
                  setAuditPage(1);
                }}
                className="px-4 py-2 border border-border rounded-lg text-sm"
              >
                Limpar
              </button>
            )}
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Data e hora</th>
                <th className="px-3 py-2 font-medium">Pessoa</th>
                <th className="px-3 py-2 font-medium">Ação</th>
                <th className="px-3 py-2 font-medium">Registro</th>
                <th className="px-3 py-2 font-medium">Detalhe</th>
                <th className="px-3 py-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((entry) => (
                <tr key={entry.id} className="border-t border-border">
                  <td className="px-3 py-2 whitespace-nowrap">{formatDateTimeBR(entry.createdAt)}</td>
                  <td className="px-3 py-2">{entry.user ? `${entry.user.name} (${ROLE_LABELS[entry.user.role]})` : "Não identificado"}</td>
                  <td className="px-3 py-2">{ACTION_LABELS[entry.action] ?? entry.action}</td>
                  <td className="px-3 py-2">
                    {entry.entity}
                    {entry.entityId && (
                      <span className="block text-xs text-muted-foreground font-mono">
                        {entry.entity === "User" ? (userName(entry.entityId) ?? entry.entityId) : entry.entityId}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{entry.details ?? ""}</td>
                  <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{entry.ip ?? ""}</td>
                </tr>
              ))}
              {audit.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Nenhum registro encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-2 text-sm">
          <button
            disabled={auditPage <= 1}
            onClick={() => setAuditPage((page) => page - 1)}
            className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-muted-foreground">Página {auditPage} de {auditPages}</span>
          <button
            disabled={auditPage >= auditPages}
            onClick={() => setAuditPage((page) => page + 1)}
            className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Nova conta</h3>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Nome completo *</label>
                <input
                  required
                  minLength={3}
                  maxLength={150}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">E-mail *</label>
                <input
                  required
                  type="email"
                  maxLength={191}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Perfil *</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className={inputClass}>
                  {ALL_ROLES.map((role) => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  O perfil define o que a pessoa vê. Recepção não acessa evoluções; administrador não acessa pacientes.
                </p>
              </div>
              {formError && (
                <p className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{formError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-border rounded-lg font-medium hover:bg-muted">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-60"
                >
                  {saving ? "Criando..." : "Criar conta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 39. `revitalize1-main/src/app/pages/Patients.tsx` (alterado)

**O que foi corrigido:** Busca e filtro feitos no servidor, paginação, CPF mascarado, status com os valores do banco e data no formato brasileiro. Achado 2.

**Configuração externa:** Nenhuma.

```tsx
import { Search, Filter, UserPlus, Calendar, Phone } from "lucide-react";
import { Link } from "react-router";
import { useEffect, useState } from "react";
import { PATIENT_STATUS_LABELS, formatDateBR, getPatients, initials, type Patient, type PatientStatus } from "../api";

export default function Patients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | PatientStatus>("all");
  const [page, setPage] = useState(1);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // A busca é feita no servidor (o CPF chega mascarado na lista).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    getPatients({
      search: debouncedSearch || undefined,
      status: filterStatus === "all" ? undefined : filterStatus,
      page,
    })
      .then((data) => {
        if (!active) return;
        setPatients(data.items);
        setTotal(data.total);
        setPageSize(data.pageSize);
        setError("");
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Não foi possível carregar os pacientes.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [debouncedSearch, filterStatus, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Pacientes</h1>
          <p className="text-muted-foreground mt-1">Gerenciamento de prontuários eletrônicos</p>
        </div>
        <Link
          to="/admission"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all"
        >
          <UserPlus className="w-5 h-5" />
          Novo Acolhimento
        </Link>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome ou CPF completo..."
              maxLength={150}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as "all" | PatientStatus);
                setPage(1);
              }}
              className="px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todos os Status</option>
              <option value="ATIVO">Ativo</option>
              <option value="EM_CRISE">Em Crise</option>
              <option value="INATIVO">Inativo</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-input-background border border-input rounded-lg hover:bg-muted transition-all">
              <Filter className="w-5 h-5" />
              Filtros
            </button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Mostrando {patients.length} de {total} paciente(s)
        </div>
      </div>

      {isLoading && (
        <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
          Carregando pacientes...
        </div>
      )}

      {error && (
        <div className="bg-red-100 px-4 py-3 rounded-lg text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {!isLoading && !error && patients.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
            Nenhum paciente encontrado.
          </div>
        )}
        {patients.map((patient) => (
          <Link
            key={patient.id}
            to={`/patients/${patient.id}`}
            className="bg-card rounded-xl border border-border p-6 hover:shadow-lg hover:border-primary/50 transition-all"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-lg">
                  {initials(patient.fullName)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-lg">
                    {patient.fullName}
                    {patient.socialName && <span className="text-sm font-normal text-muted-foreground"> ({patient.socialName})</span>}
                  </h3>
                  <p className="text-sm text-muted-foreground">CPF: {patient.cpf}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Nasc: {formatDateBR(patient.birthDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      Telefone na ficha de acolhimento
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="text-sm">
                  <p className="text-muted-foreground">Cadastrado em</p>
                  <p className="font-medium text-foreground">{formatDateBR(patient.createdAt)}</p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                  patient.status === "ATIVO" ? "bg-green-100 text-green-700" :
                  patient.status === "EM_CRISE" ? "bg-red-100 text-red-700" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  {PATIENT_STATUS_LABELS[patient.status]}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
            className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-muted-foreground">Página {page} de {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
            className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
```

### 40. `revitalize1-main/src/app/pages/PatientProfile.tsx` (alterado)

**O que foi corrigido:** Deixa de mostrar dados fictícios (medicação e diagnóstico inventados sob o nome de um paciente real seriam um risco clínico): carrega o paciente e o histórico reais, mostra autor de cada registro, adendos, prescrições, esconde tópicos privados na impressão e bloqueia o histórico para quem não é clínico. Achados 2, 4.

**Configuração externa:** Nenhuma.

```tsx
import { useParams, Link } from "react-router";
import { ArrowLeft, FileText, Calendar, Pill, User, AlertCircle, EyeOff, PlusCircle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  PATIENT_STATUS_LABELS,
  ageFrom,
  createAddendum,
  formatDateBR,
  formatDateTimeBR,
  getEvolutions,
  getPatient,
  initials,
  updatePatientStatus,
  type Evolution,
  type PatientDetail,
  type PatientStatus,
} from "../api";
import { useAuth } from "../contexts/AuthContext";
import { CLINICAL_ROLES, ROLE_LABELS, hasRole } from "../roles";

const EVOLUTION_TYPE_LABELS: Record<Evolution["type"], string> = {
  MEDICA: "Evolução Médica",
  ENFERMAGEM: "Evolução de Enfermagem",
  MULTIPROFISSIONAL: "Evolução Multiprofissional",
};

const ADMISSION_TYPE_LABELS: Record<string, string> = {
  geral: "Geral",
  "transtorno-mental": "Transtorno Mental",
  "alcool-drogas": "Álcool e Drogas",
};

export default function PatientProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const canSeeClinical = hasRole(user?.role, CLINICAL_ROLES);
  const [activeTab, setActiveTab] = useState("overview");

  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [evolutions, setEvolutions] = useState<Evolution[]>([]);
  const [evolutionsError, setEvolutionsError] = useState("");

  const [addendumFor, setAddendumFor] = useState<Evolution | null>(null);
  const [addendumText, setAddendumText] = useState("");
  const [addendumError, setAddendumError] = useState("");
  const [savingAddendum, setSavingAddendum] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    getPatient(id)
      .then((data) => {
        if (active) setPatient(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Não foi possível carregar o paciente.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    if (canSeeClinical) {
      getEvolutions(id)
        .then((data) => {
          if (active) setEvolutions(data);
        })
        .catch((requestError) => {
          if (active) setEvolutionsError(requestError instanceof Error ? requestError.message : "Não foi possível carregar o histórico.");
        });
    }
    return () => {
      active = false;
    };
  }, [id, canSeeClinical]);

  // Evoluções originais com seus adendos logo abaixo.
  const timeline = useMemo(() => {
    const originals = evolutions.filter((item) => item.amendsId === null);
    return originals.map((original) => ({
      original,
      addenda: evolutions
        .filter((item) => item.amendsId === original.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    }));
  }, [evolutions]);

  // Prescrições registradas nas evoluções médicas, da mais recente para a mais antiga.
  const medications = useMemo(() => {
    const seen = new Set<string>();
    const list: { name: string; dose: string; frequency: string; startDate: string; prescriber: string }[] = [];
    for (const evolution of evolutions) {
      if (evolution.type !== "MEDICA" || evolution.amendsId !== null) continue;
      for (const item of evolution.details?.prescriptions ?? []) {
        const key = item.medicine.trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        list.push({
          name: item.medicine,
          dose: item.dosage,
          frequency: item.frequency,
          startDate: formatDateBR(evolution.occurredAt),
          prescriber: evolution.author.name,
        });
      }
    }
    return list;
  }, [evolutions]);

  const tabs = [
    { id: "overview", label: "Visão Geral" },
    { id: "timeline", label: "Histórico Clínico" },
    { id: "medications", label: "Medicamentos" },
  ];

  const handleStatusChange = async (status: PatientStatus) => {
    if (!patient || status === patient.status) return;
    try {
      const updated = await updatePatientStatus(patient.id, status);
      setPatient({ ...patient, status: updated.status });
    } catch (requestError) {
      alert(requestError instanceof Error ? requestError.message : "Não foi possível alterar o status.");
    }
  };

  const handleAddendum = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!addendumFor) return;
    setAddendumError("");
    setSavingAddendum(true);
    try {
      const created = await createAddendum(addendumFor.id, addendumText.trim());
      setEvolutions((current) => [created, ...current]);
      setAddendumFor(null);
      setAddendumText("");
    } catch (requestError) {
      setAddendumError(requestError instanceof Error ? requestError.message : "Não foi possível salvar o adendo.");
    } finally {
      setSavingAddendum(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-muted-foreground">Carregando prontuário...</div>;
  }

  if (error || !patient) {
    return (
      <div className="p-6 space-y-4">
        <Link to="/patients" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Voltar para pacientes
        </Link>
        <div className="bg-red-100 px-4 py-3 rounded-lg text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error || "Paciente não encontrado."}
        </div>
      </div>
    );
  }

  const age = ageFrom(patient.birthDate);
  const clinicalBlocked = (
    <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
      Seu perfil não tem acesso ao histórico clínico.
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/patients" className="p-2 hover:bg-muted rounded-lg transition-all print:hidden">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Prontuário do Paciente</h1>
          <p className="text-muted-foreground mt-1">Visualização completa do histórico clínico</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary to-secondary rounded-xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center font-semibold text-2xl">
              {initials(patient.fullName)}
            </div>
            <div>
              <h2 className="text-2xl font-semibold">{patient.fullName}</h2>
              {patient.socialName && <p className="text-white/90">Nome social: {patient.socialName}</p>}
              <p className="text-white/80 mt-1">
                CPF: {patient.cpf}
                {age !== null ? ` • ${age} anos` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 print:hidden">
            {canSeeClinical && (
              <Link
                to={`/evolution/${patient.id}`}
                className="px-4 py-2 bg-white text-primary rounded-lg font-medium hover:bg-white/90 transition-all"
              >
                Nova Evolução
              </Link>
            )}
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-white/20 backdrop-blur text-white rounded-lg font-medium hover:bg-white/30 transition-all"
            >
              Imprimir Prontuário
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-border print:hidden">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium transition-all ${
                activeTab === tab.id
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <User className="w-5 h-5" />
              Informações Pessoais
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data de Nascimento:</span>
                <span className="font-medium">{formatDateBR(patient.birthDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Idade:</span>
                <span className="font-medium">{age !== null ? `${age} anos` : "Não informado"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nome social:</span>
                <span className="font-medium">{patient.socialName || "Não informado"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cadastrado em:</span>
                <span className="font-medium">{formatDateBR(patient.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Informações Clínicas
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                <select
                  value={patient.status}
                  onChange={(e) => void handleStatusChange(e.target.value as PatientStatus)}
                  className={`px-3 py-1 rounded-full font-medium border-none ${
                    patient.status === "ATIVO"
                      ? "bg-green-100 text-green-700"
                      : patient.status === "EM_CRISE"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {(Object.keys(PATIENT_STATUS_LABELS) as PatientStatus[]).map((status) => (
                    <option key={status} value={status}>{PATIENT_STATUS_LABELS[status]}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Último acolhimento:</span>
                <span className="font-medium">
                  {patient.lastAdmission ? formatDateBR(patient.lastAdmission.date) : "Não registrado"}
                </span>
              </div>
              {patient.lastAdmission && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo de acolhimento:</span>
                    <span className="font-medium">{ADMISSION_TYPE_LABELS[patient.lastAdmission.type] ?? patient.lastAdmission.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Acolhido por:</span>
                    <span className="font-medium">
                      {patient.lastAdmission.author.name} ({ROLE_LABELS[patient.lastAdmission.author.role]})
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <Pill className="w-5 h-5" />
              Medicamentos em Uso
            </h3>
            {!canSeeClinical ? (
              <p className="text-sm text-muted-foreground">Seu perfil não tem acesso a prescrições.</p>
            ) : medications.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma prescrição registrada em evolução médica.</p>
            ) : (
              <div className="space-y-3">
                {medications.map((med) => (
                  <div key={med.name} className="p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-foreground">{med.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {med.dose} - {med.frequency}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">Desde {med.startDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "timeline" &&
        (!canSeeClinical ? (
          clinicalBlocked
        ) : (
          <div className="space-y-4">
            {evolutionsError && (
              <div className="bg-red-100 px-4 py-3 rounded-lg text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{evolutionsError}</div>
            )}
            {timeline.length === 0 && !evolutionsError && (
              <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
                Nenhuma evolução registrada.
              </div>
            )}
            {timeline.map(({ original, addenda }) => (
              <div key={original.id} className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-semibold text-foreground">{EVOLUTION_TYPE_LABELS[original.type]}</h4>
                        <p className="text-sm text-muted-foreground">
                          {original.author.name} ({ROLE_LABELS[original.author.role]}) • {original.attendanceType}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                        <Calendar className="w-4 h-4" />
                        {formatDateTimeBR(original.occurredAt)}
                      </div>
                    </div>

                    {original.details?.vitalSigns && (
                      <p className="text-sm text-muted-foreground">
                        Sinais vitais:
                        {original.details.vitalSigns.bloodPressure ? ` PA ${original.details.vitalSigns.bloodPressure} mmHg;` : ""}
                        {original.details.vitalSigns.heartRate ? ` FC ${original.details.vitalSigns.heartRate} bpm;` : ""}
                        {original.details.vitalSigns.temperature ? ` Temp. ${original.details.vitalSigns.temperature} °C;` : ""}
                        {original.details.vitalSigns.spo2 ? ` SpO2 ${original.details.vitalSigns.spo2}%` : ""}
                      </p>
                    )}

                    {original.notes && <p className="text-sm text-foreground whitespace-pre-wrap">{original.notes}</p>}

                    {(original.details?.topics ?? []).map((topic, index) => (
                      <div
                        key={index}
                        className={`rounded-lg p-3 ${topic.isPrivate ? "bg-amber-50 dark:bg-amber-950/20 print:hidden" : "bg-muted/50"}`}
                      >
                        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                          {topic.title}
                          {topic.isPrivate && (
                            <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                              <EyeOff className="w-3 h-3" /> Privado
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-foreground whitespace-pre-wrap mt-1">{topic.content}</p>
                      </div>
                    ))}

                    {(original.details?.prescriptions ?? []).length > 0 && (
                      <div className="text-sm">
                        <p className="font-medium text-foreground">Prescrição:</p>
                        <ul className="list-disc pl-5 text-foreground">
                          {(original.details?.prescriptions ?? []).map((item, index) => (
                            <li key={index}>
                              {item.medicine} - {item.dosage} - {item.frequency}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {addenda.map((addendum) => (
                      <div key={addendum.id} className="border-l-4 border-primary/40 pl-4 py-1">
                        <p className="text-xs text-muted-foreground">
                          Adendo de {addendum.author.name} ({ROLE_LABELS[addendum.author.role]}) em {formatDateTimeBR(addendum.createdAt)}
                        </p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{addendum.notes}</p>
                      </div>
                    ))}

                    <div className="flex justify-between items-center pt-1 print:hidden">
                      <p className="text-xs text-muted-foreground">Registrado em {formatDateTimeBR(original.createdAt)}. Registros não podem ser editados.</p>
                      <button
                        onClick={() => {
                          setAddendumFor(original);
                          setAddendumText("");
                          setAddendumError("");
                        }}
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Adicionar adendo
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

      {activeTab === "medications" &&
        (!canSeeClinical ? (
          clinicalBlocked
        ) : (
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-foreground">Histórico de Medicamentos</h3>
              {hasRole(user?.role, ["MEDICO"]) && (
                <Link
                  to={`/evolution/${patient.id}`}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all print:hidden"
                >
                  Prescrever Medicamento
                </Link>
              )}
            </div>
            {medications.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma prescrição registrada em evolução médica.</p>
            ) : (
              <div className="space-y-4">
                {medications.map((med) => (
                  <div key={med.name} className="p-6 bg-muted/50 rounded-lg border border-border">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground text-lg">{med.name}</h4>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Dose:</span>
                            <p className="font-medium mt-1">{med.dose}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Frequência:</span>
                            <p className="font-medium mt-1">{med.frequency}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Início:</span>
                            <p className="font-medium mt-1">{med.startDate}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Prescrito por:</span>
                            <p className="font-medium mt-1">{med.prescriber}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

      {addendumFor && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setAddendumFor(null)}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Adendo à evolução de {formatDateTimeBR(addendumFor.occurredAt)}</h3>
              <button onClick={() => setAddendumFor(null)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              A evolução original não é alterada. O adendo fica registrado com seu nome, data e hora.
            </p>
            <form onSubmit={handleAddendum} className="space-y-4">
              <textarea
                rows={6}
                required
                minLength={3}
                maxLength={10000}
                value={addendumText}
                onChange={(e) => setAddendumText(e.target.value)}
                className="w-full px-4 py-3 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                placeholder="Descreva a correção ou complemento..."
              />
              {addendumError && (
                <p className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{addendumError}</p>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setAddendumFor(null)} className="flex-1 py-2.5 border border-border rounded-lg font-medium hover:bg-muted">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAddendum}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-60"
                >
                  {savingAddendum ? "Salvando..." : "Salvar adendo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 41. `revitalize1-main/src/app/pages/NewEvolution.tsx` (alterado)

**O que foi corrigido:** Formulário ligado à API: grava a evolução com data, horário, tipo de atendimento, sinais vitais, tópicos e prescrição; tipos de evolução limitados ao perfil; remoção do "Salvar Rascunho" que não salvava. Achados 4, 8.

**Configuração externa:** Nenhuma.

```tsx
import { ArrowLeft, Save, FileText, Activity, Stethoscope, Plus, Trash2, EyeOff, Eye, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import { ApiError, createEvolution, getPatient, initials, type PatientDetail, type Prescription, type VitalSigns } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { EVOLUTION_TYPE_ROLES, hasRole, type EvolutionType } from "../roles";

type UiEvolutionType = "medica" | "enfermagem" | "multiprofissional";

const TYPE_MAP: Record<UiEvolutionType, EvolutionType> = {
  medica: "MEDICA",
  enfermagem: "ENFERMAGEM",
  multiprofissional: "MULTIPROFISSIONAL",
};

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function localDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function localTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type Topic = {
  id: number;
  title: string;
  content: string;
  isPrivate: boolean;
};

export default function NewEvolution() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Cada perfil só registra os tipos de evolução permitidos (o servidor também confere).
  const allowedTypes = (Object.keys(TYPE_MAP) as UiEvolutionType[]).filter((type) =>
    hasRole(user?.role, EVOLUTION_TYPE_ROLES[TYPE_MAP[type]]),
  );
  const [evolutionType, setEvolutionType] = useState<UiEvolutionType>(allowedTypes[0] ?? "multiprofissional");

  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [now] = useState(() => new Date());
  const [date, setDate] = useState(localDate(now));
  const [time, setTime] = useState(localTime(now));
  const [attendanceType, setAttendanceType] = useState("Atendimento na Unidade");
  const [notes, setNotes] = useState("");
  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({ bloodPressure: "", heartRate: "", temperature: "", spo2: "" });
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([{ medicine: "", dosage: "", frequency: "" }]);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    let active = true;
    getPatient(patientId)
      .then((data) => {
        if (active) setPatient(data);
      })
      .catch((requestError) => {
        if (active) setLoadError(requestError instanceof Error ? requestError.message : "Não foi possível carregar o paciente.");
      });
    return () => {
      active = false;
    };
  }, [patientId]);

  const [topics, setTopics] = useState<Topic[]>([
    { id: 1, title: "Queixa Principal", content: "", isPrivate: false },
    { id: 2, title: "Avaliação Clínica", content: "", isPrivate: false },
    { id: 3, title: "Conduta / Plano Terapêutico", content: "", isPrivate: false },
  ]);
  const [nextId, setNextId] = useState(4);


  const addTopic = () => {
    setTopics([...topics, { id: nextId, title: "Novo Tópico", content: "", isPrivate: false }]);
    setNextId(nextId + 1);
  };

  const removeTopic = (id: number) => {
    setTopics(topics.filter(t => t.id !== id));
  };

  const togglePrivate = (id: number) => {
    setTopics(topics.map(t => t.id === id ? { ...t, isPrivate: !t.isPrivate } : t));
  };

  const updateTopic = (id: number, field: "title" | "content", value: string) => {
    setTopics(topics.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...topics];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setTopics(updated);
  };

  const moveDown = (index: number) => {
    if (index === topics.length - 1) return;
    const updated = [...topics];
    [updated[index + 1], updated[index]] = [updated[index], updated[index + 1]];
    setTopics(updated);
  };

  const updatePrescription = (index: number, field: keyof Prescription, value: string) => {
    setPrescriptions(prescriptions.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addPrescription = () => {
    setPrescriptions([...prescriptions, { medicine: "", dosage: "", frequency: "" }]);
  };

  const removePrescription = (index: number) => {
    setPrescriptions(prescriptions.length === 1 ? [{ medicine: "", dosage: "", frequency: "" }] : prescriptions.filter((_, i) => i !== index));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!patientId) return;
    setSaveError("");

    const occurredAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(occurredAt.getTime())) {
      setSaveError("Informe data e horário válidos.");
      return;
    }

    const type = TYPE_MAP[evolutionType];
    setSaving(true);
    try {
      await createEvolution(patientId, {
        type,
        attendanceType,
        occurredAt: occurredAt.toISOString(),
        notes: type === "MULTIPROFISSIONAL" ? "" : notes,
        vitalSigns: type === "ENFERMAGEM" ? vitalSigns : undefined,
        topics: type === "MULTIPROFISSIONAL" ? topics.map(({ title, content, isPrivate }) => ({ title, content, isPrivate })) : undefined,
        prescriptions: type === "MEDICA" ? prescriptions.filter((item) => item.medicine.trim().length > 0) : undefined,
      });
      navigate(`/patients/${patientId}`, { replace: true });
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.fields) {
        setSaveError(Object.values(requestError.fields)[0] ?? requestError.message);
      } else {
        setSaveError(requestError instanceof Error ? requestError.message : "Não foi possível salvar a evolução.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className="p-6 space-y-4">
        <Link to="/patients" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Voltar para pacientes
        </Link>
        <div className="bg-red-100 px-4 py-3 rounded-lg text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{loadError}</div>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/patients/${patientId}`} className="p-2 hover:bg-muted rounded-lg transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Nova Evolução</h1>
          <p className="text-muted-foreground mt-1">Registro de atendimento clínico</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-6 border border-primary/20">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-lg">
            {patient ? initials(patient.fullName) : ""}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{patient ? patient.fullName : "Carregando..."}</h2>
            <p className="text-sm text-muted-foreground">CPF: {patient?.cpf ?? ""}</p>
            <p className="text-sm text-muted-foreground">Profissional: {user?.name ?? ""}</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <form className="space-y-6" onSubmit={handleSave}>
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">Tipo de Evolução *</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { value: "medica", label: "Evolução Médica", icon: Stethoscope },
                { value: "enfermagem", label: "Evolução de Enfermagem", icon: Activity },
                { value: "multiprofissional", label: "Evolução Multiprofissional", icon: FileText },
              ].map((type) => {
                const Icon = type.icon;
                const allowed = allowedTypes.includes(type.value as UiEvolutionType);
                return (
                  <button
                    key={type.value}
                    type="button"
                    disabled={!allowed}
                    title={allowed ? undefined : "Seu perfil não registra este tipo de evolução"}
                    onClick={() => setEvolutionType(type.value as UiEvolutionType)}
                    className={`p-4 rounded-lg border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      evolutionType === type.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-2 ${evolutionType === type.value ? "text-primary" : "text-muted-foreground"}`} />
                    <p className={`font-medium text-sm ${evolutionType === type.value ? "text-primary" : "text-foreground"}`}>
                      {type.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Data do Atendimento *</label>
              <input
                type="date"
                required
                value={date}
                max={localDate(new Date())}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Horário *</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Tipo de Atendimento *</label>
              <select value={attendanceType} onChange={(e) => setAttendanceType(e.target.value)} className={inputClass}>
                <option>Atendimento na Unidade</option>
                <option>Visita Domiciliar</option>
                <option>Matriciamento</option>
              </select>
            </div>
          </div>

          {evolutionType === "enfermagem" && (
            <div className="bg-muted/50 p-6 rounded-lg space-y-4">
              <h3 className="font-semibold text-foreground">Sinais Vitais</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">PA (mmHg)</label>
                  <input type="text" maxLength={20} value={vitalSigns.bloodPressure ?? ""} onChange={(e) => setVitalSigns({ ...vitalSigns, bloodPressure: e.target.value })} placeholder="120/80" className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">FC (bpm)</label>
                  <input type="number" min={0} max={300} value={vitalSigns.heartRate ?? ""} onChange={(e) => setVitalSigns({ ...vitalSigns, heartRate: e.target.value })} placeholder="72" className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Temp. (°C)</label>
                  <input type="number" step="0.1" min={30} max={45} value={vitalSigns.temperature ?? ""} onChange={(e) => setVitalSigns({ ...vitalSigns, temperature: e.target.value })} placeholder="36.5" className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">SpO2 (%)</label>
                  <input type="number" min={0} max={100} value={vitalSigns.spo2 ?? ""} onChange={(e) => setVitalSigns({ ...vitalSigns, spo2: e.target.value })} placeholder="98" className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
            </div>
          )}

          {evolutionType !== "multiprofissional" ? (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Evolução do Paciente *
              </label>
              <textarea
                rows={12}
                required
                maxLength={20000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono text-sm"
                placeholder="Digite aqui a evolução do atendimento..."
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-foreground">
                  Evolução por Tópicos
                </label>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
                  <EyeOff className="w-3.5 h-3.5" />
                  Tópicos privados não aparecem na impressão do prontuário
                </div>
              </div>

              <div className="space-y-3">
                {topics.map((topic, index) => (
                  <div
                    key={topic.id}
                    className={`rounded-xl border-2 transition-all ${
                      topic.isPrivate
                        ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-2 p-3 border-b border-border/50">
                      <GripVertical className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />

                      <input
                        type="text"
                        maxLength={150}
                        value={topic.title}
                        onChange={(e) => updateTopic(topic.id, "title", e.target.value)}
                        className="flex-1 font-semibold text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
                        placeholder="Título do tópico..."
                      />

                      {topic.isPrivate && (
                        <span className="text-xs text-amber-600 font-medium px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 rounded-full">
                          Privado
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                          title="Mover para cima"
                          className="p-1.5 hover:bg-muted rounded-lg transition-all disabled:opacity-30"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDown(index)}
                          disabled={index === topics.length - 1}
                          title="Mover para baixo"
                          className="p-1.5 hover:bg-muted rounded-lg transition-all disabled:opacity-30"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePrivate(topic.id)}
                          title={topic.isPrivate ? "Tornar público" : "Tornar privado"}
                          className={`p-1.5 rounded-lg transition-all ${
                            topic.isPrivate ? "text-amber-600 hover:bg-amber-100" : "hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          {topic.isPrivate ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTopic(topic.id)}
                          title="Excluir tópico"
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3">
                      <textarea
                        rows={4}
                        maxLength={10000}
                        value={topic.content}
                        onChange={(e) => updateTopic(topic.id, "content", e.target.value)}
                        placeholder="Descreva este tópico..."
                        className="w-full bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addTopic}
                className="w-full py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar Tópico
              </button>
            </div>
          )}

          {evolutionType === "medica" && (
            <div className="bg-muted/50 p-6 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Prescrição Médica</h3>
                <button type="button" onClick={addPrescription} className="text-sm text-primary hover:underline">
                  + Adicionar Medicamento
                </button>
              </div>
              <div className="space-y-3">
                {prescriptions.map((item, index) => (
                  <div key={index} className="p-4 bg-background rounded-lg border border-border">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Medicamento</label>
                        <input type="text" maxLength={150} value={item.medicine} onChange={(e) => updatePrescription(index, "medicine", e.target.value)} placeholder="Ex: Fluoxetina 20mg" className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Posologia</label>
                        <input type="text" maxLength={150} value={item.dosage} onChange={(e) => updatePrescription(index, "dosage", e.target.value)} placeholder="Ex: 1 comprimido" className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Frequência</label>
                        <input type="text" maxLength={150} value={item.frequency} onChange={(e) => updatePrescription(index, "frequency", e.target.value)} placeholder="Ex: 1x ao dia (manhã)" className={inputClass} />
                      </div>
                      <button
                        type="button"
                        onClick={() => removePrescription(index)}
                        title="Remover medicamento"
                        className="p-2.5 hover:bg-red-50 text-red-500 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {saveError && (
            <p className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{saveError}</p>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Link
              to={`/patients/${patientId}`}
              className="px-6 py-2.5 border border-border rounded-lg font-medium hover:bg-muted transition-all"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving || !patient || allowedTypes.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all disabled:opacity-60"
            >
              <Save className="w-5 h-5" />
              {saving ? "Salvando..." : "Salvar Evolução"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 42. `revitalize1-main/src/app/pages/NewAdmission.tsx` (alterado)

**O que foi corrigido:** Ficha de acolhimento ligada à API: nome, nome social, nascimento, CPF (com máscara) e demanda principal são gravados no paciente e no acolhimento; todas as outras respostas da ficha vão junto como detalhes; profissional responsável preenchido pela conta logada. Achado 4.

**Configuração externa:** Nenhuma.

```tsx
import { useState } from "react";
import { ArrowLeft, Save, User, FileText, Heart, AlertTriangle, Users, Home, Briefcase, Activity } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { ApiError, createAdmission, type AdmissionDetail, type NewAdmissionInput } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { ROLE_LABELS } from "../roles";

type AdmissionType = NewAdmissionInput["type"];

function formatCpfInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

// Junta as demais respostas da ficha (campos sem estado próprio) em pares
// seção / pergunta / resposta, para que nada do que foi preenchido se perca.
function collectAdmissionDetails(form: HTMLFormElement): AdmissionDetail[] {
  const grouped = new Map<string, AdmissionDetail>();
  const elements = form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea");

  elements.forEach((element) => {
    if (element.dataset.core === "true" || element.disabled) return;
    const section =
      element.closest('[class*="bg-muted/50"]')?.querySelector("h3")?.textContent?.replace(/\s+/g, " ").trim() ?? "Ficha";

    let label = "";
    let value = "";

    if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
      if (!element.checked) return;
      const optionLabel = element.closest("label");
      const groupTitle = optionLabel?.parentElement?.previousElementSibling;
      label = groupTitle?.tagName === "LABEL" ? (groupTitle.textContent ?? "").trim() : element.name || "Opções";
      value =
        element.type === "radio" && element.value && element.value !== "on"
          ? element.value
          : (optionLabel?.textContent ?? "Sim").replace(/\s+/g, " ").trim();
    } else {
      value = element.value.trim();
      if (!value || (element instanceof HTMLSelectElement && value === "Selecione...")) return;
      let node: HTMLElement | null = element.parentElement;
      while (node && node !== form && !label) {
        const own = node.querySelector(":scope > label");
        if (own) label = (own.textContent ?? "").trim();
        node = node.parentElement;
      }
      if (!label) label = element.getAttribute("placeholder") ?? "Campo";
    }

    const key = `${section}|${label}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.value = `${existing.value}, ${value}`.slice(0, 5000);
    } else {
      grouped.set(key, { section: section.slice(0, 150), label: label.replace(/\s*\*$/, "").slice(0, 200), value: value.slice(0, 5000) });
    }
  });

  return Array.from(grouped.values()).slice(0, 400);
}

export default function NewAdmission() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [admissionType, setAdmissionType] = useState<AdmissionType>("geral");
  const [hasSpouse, setHasSpouse] = useState(false);
  const [childrenCount, setChildrenCount] = useState(0);
  const [fullName, setFullName] = useState("");
  const [socialName, setSocialName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cpf, setCpf] = useState("");
  const [reason, setReason] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError("");
    setSaving(true);
    try {
      const { patientId } = await createAdmission({
        type: admissionType,
        patient: {
          fullName: fullName.trim(),
          socialName: socialName.trim() || undefined,
          cpf,
          birthDate,
        },
        reason: reason.trim(),
        details: collectAdmissionDetails(event.currentTarget),
      });
      navigate(`/patients/${patientId}`, { replace: true });
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.fields) {
        setSaveError(Object.values(requestError.fields)[0] ?? requestError.message);
      } else {
        setSaveError(requestError instanceof Error ? requestError.message : "Não foi possível salvar o acolhimento.");
      }
    } finally {
      setSaving(false);
    }
  };

  const sinaisESintomas = [
    "Agitação Psicomotora", "Agressividade", "Alucinação Auditiva", "Alucinação Visual",
    "Ansiedade", "Apragmatismo", "Avolição", "Bradipsiquismo", "Confusão Mental",
    "Delírios", "Desorganização", "Embotamento Afetivo", "Hiperatividade",
    "Ideação Suicida", "Inquietação", "Insônia", "Labilidade Emocional",
    "Mutismo", "Pensamento Acelerado", "Pensamento Desorganizado", "Prostração",
    "Queixas Somáticas", "Retardo Psicomotor", "Tentativa de Suicídio", "Tristeza"
  ];

  const drogasExperimentadas = [
    "Álcool", "Anfetamina", "Benzodiazepínicos", "Cannabis", "Cocaína", "Crack",
    "Ecstasy", "Inalantes", "LSD", "Medicamentos", "Nicotina", "Outras"
  ];

  const doencasERiscos = [
    "AVC (Derrame)", "Câncer", "DPOC (Doença Pulmonar)", "Diabetes",
    "Dislipidemia (Colesterol Alto)", "Hipertensão Arterial", "Infarto",
    "Obesidade", "Problemas Renais", "Tabagismo", "Outro"
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Link to="/dashboard" className="p-2 hover:bg-muted rounded-lg transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Ficha de Acolhimento</h1>
          <p className="text-muted-foreground mt-1">Registro completo de admissão de novo paciente</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-3">Tipo de Acolhimento *</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { value: "geral", label: "Geral", icon: User },
              { value: "transtorno-mental", label: "Transtorno Mental", icon: Heart },
              { value: "alcool-drogas", label: "Álcool e Drogas", icon: AlertTriangle },
            ].map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setAdmissionType(type.value as AdmissionType)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    admissionType === type.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${admissionType === type.value ? "text-primary" : "text-muted-foreground"}`} />
                  <p className={`font-medium ${admissionType === type.value ? "text-primary" : "text-foreground"}`}>
                    {type.label}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="bg-muted/50 p-6 rounded-lg space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-lg">
              <User className="w-5 h-5" />
              1.1 Dados Pessoais do Paciente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">CNS</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Número CNS"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Cartão SUS</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Número do Cartão SUS"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">PSF</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="PSF de referência"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Nome Completo *</label>
                <input
                  type="text"
                  data-core="true"
                  required
                  minLength={3}
                  maxLength={150}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Digite o nome completo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Nome Social</label>
                <input
                  type="text"
                  data-core="true"
                  maxLength={150}
                  value={socialName}
                  onChange={(e) => setSocialName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Nome social (se aplicável)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Data de Nascimento *</label>
                <input
                  type="date"
                  data-core="true"
                  required
                  max={new Date().toISOString().slice(0, 10)}
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">CPF *</label>
                <input
                  type="text"
                  data-core="true"
                  required
                  inputMode="numeric"
                  pattern="\d{3}\.\d{3}\.\d{3}-\d{2}"
                  title="CPF no formato 000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpfInput(e.target.value))}
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">RG</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="00.000.000-0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Naturalidade</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Cidade/Estado"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Raça/Cor/Etnia</label>
                <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Selecione...</option>
                  <option>Branca</option>
                  <option>Preta</option>
                  <option>Parda</option>
                  <option>Amarela</option>
                  <option>Indígena</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Escolaridade</label>
                <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Selecione...</option>
                  <option>Analfabeto</option>
                  <option>Fundamental Incompleto</option>
                  <option>Fundamental Completo</option>
                  <option>Médio Incompleto</option>
                  <option>Médio Completo</option>
                  <option>Superior Incompleto</option>
                  <option>Superior Completo</option>
                  <option>Pós-graduação</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Profissão</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Profissão"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Ocupação Atual</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ocupação"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Gestante</label>
                <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Não se aplica</option>
                  <option>Sim</option>
                  <option>Não</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-foreground mb-2">Endereço Completo</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Rua, número, complemento, bairro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Cidade</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Cidade"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">CEP</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="00000-000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Telefone</label>
                <input
                  type="tel"
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Telefone Recado</label>
                <input
                  type="tel"
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Responsável Legal (se menor ou incapaz)</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Nome do responsável"
                />
              </div>
            </div>
          </div>

          <div className="bg-muted/50 p-6 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2 text-lg">
                <Users className="w-5 h-5" />
                1.2 Dados do Cônjuge
              </h3>
              <button
                type="button"
                onClick={() => setHasSpouse(!hasSpouse)}
                className="text-sm px-4 py-2 border border-border rounded-lg hover:bg-muted transition-all"
              >
                {hasSpouse ? "Remover Cônjuge" : "Adicionar Cônjuge"}
              </button>
            </div>

            {hasSpouse && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-200">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">Nome Completo</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Nome do cônjuge"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Data de Nascimento</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">CPF</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Profissão</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Profissão"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Telefone</label>
                  <input
                    type="tel"
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-muted/50 p-6 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2 text-lg">
                <Users className="w-5 h-5" />
                1.3 Filhos
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setChildrenCount(Math.max(0, childrenCount - 1))}
                  className="text-sm px-3 py-2 border border-border rounded-lg hover:bg-muted transition-all"
                >
                  -
                </button>
                <span className="px-4 py-2 bg-input-background border border-input rounded-lg text-sm">
                  {childrenCount} filho{childrenCount !== 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setChildrenCount(childrenCount + 1)}
                  className="text-sm px-3 py-2 border border-border rounded-lg hover:bg-muted transition-all"
                >
                  +
                </button>
              </div>
            </div>

            {childrenCount > 0 && (
              <div className="space-y-3">
                {Array.from({ length: childrenCount }).map((_, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-background rounded-lg border border-border">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Nome do Filho {index + 1}</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Nome"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Idade</label>
                      <input
                        type="number"
                        className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Idade"
                        min="0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-muted/50 p-6 rounded-lg space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-lg">
              <Briefcase className="w-5 h-5" />
              2. Situação Social Atual
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Situação de Trabalho</label>
                <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Selecione...</option>
                  <option>Empregado</option>
                  <option>Desempregado</option>
                  <option>Autônomo</option>
                  <option>Aposentado</option>
                  <option>Estudante</option>
                  <option>Do lar</option>
                  <option>Auxílio-doença</option>
                  <option>Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Benefícios Sociais</label>
                <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Nenhum</option>
                  <option>Bolsa Família</option>
                  <option>BPC/LOAS</option>
                  <option>Seguro Desemprego</option>
                  <option>Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Renda Familiar</label>
                <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Selecione...</option>
                  <option>Sem renda</option>
                  <option>Até 1 salário mínimo</option>
                  <option>1 a 2 salários mínimos</option>
                  <option>2 a 3 salários mínimos</option>
                  <option>3 a 5 salários mínimos</option>
                  <option>Acima de 5 salários mínimos</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Estado Civil</label>
                <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Selecione...</option>
                  <option>Solteiro(a)</option>
                  <option>Casado(a)</option>
                  <option>União Estável</option>
                  <option>Divorciado(a)</option>
                  <option>Viúvo(a)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tipo de Moradia</label>
                <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Selecione...</option>
                  <option>Própria</option>
                  <option>Alugada</option>
                  <option>Cedida</option>
                  <option>Situação de Rua</option>
                  <option>Abrigo</option>
                  <option>Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Com quem Mora</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ex: Família, Sozinho, Amigos..."
                />
              </div>
            </div>
          </div>

          <div className="bg-muted/50 p-6 rounded-lg space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-lg">
              <Activity className="w-5 h-5" />
              3. Roteiro de Acolhimento
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">3.1 Demanda / Queixa Principal *</label>
                <textarea
                  rows={4}
                  data-core="true"
                  required
                  minLength={3}
                  maxLength={5000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Descreva a demanda ou queixa principal apresentada pelo paciente..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-3">3.2 Sinais e Sintomas</label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {sinaisESintomas.map((sintoma) => (
                    <label key={sintoma} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" className="w-4 h-4 rounded border-input" />
                      <span>{sintoma}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">3.3 Encaminhado por</label>
                  <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>Selecione...</option>
                    <option>PSF - Programa Saúde da Família</option>
                    <option>CRAS</option>
                    <option>CREAS</option>
                    <option>Demanda Espontânea</option>
                    <option>Hospital</option>
                    <option>Familiar</option>
                    <option>Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">3.4 Acompanhante</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Nome do acompanhante"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">3.5 Início dos Sintomas</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ex: Há 2 meses, Infância..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">3.6 Estado Emocional Atual</label>
                  <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>Selecione...</option>
                    <option>Calmo</option>
                    <option>Ansioso</option>
                    <option>Agitado</option>
                    <option>Deprimido</option>
                    <option>Confuso</option>
                    <option>Agressivo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">3.7 Estado Físico / Problemas de Saúde</label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Descreva o estado físico atual e problemas de saúde conhecidos..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">3.8 Medicamentos em Uso</label>
                <textarea
                  rows={2}
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Liste os medicamentos em uso (nome, dosagem, frequência)..."
                />
              </div>
            </div>
          </div>

          {admissionType === "alcool-drogas" && (
            <div className="bg-red-50 dark:bg-red-950/20 p-6 rounded-lg space-y-4 border border-red-200 dark:border-red-800">
              <h3 className="font-semibold text-foreground flex items-center gap-2 text-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Seção Específica: Álcool e Drogas
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">3.9 Idade de Início do Uso</label>
                    <input
                      type="number"
                      className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Idade"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">3.10 Primeira Droga Utilizada</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Nome da substância"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">3.11 Drogas já Experimentadas</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {drogasExperimentadas.map((droga) => (
                      <label key={droga} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" className="w-4 h-4 rounded border-input" />
                        <span>{droga}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">3.12 Droga de Preferência Atual</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Substância principal"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">3.13 Frequência de Uso</label>
                    <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                      <option>Selecione...</option>
                      <option>Diária</option>
                      <option>Semanal (2-6x)</option>
                      <option>Semanal (1x)</option>
                      <option>Quinzenal</option>
                      <option>Mensal</option>
                      <option>Ocasional</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">3.14 Quantidade Diária (se aplicável)</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Ex: 10 pedras, 1 garrafa..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">3.15 Local de Uso Preferencial</label>
                    <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                      <option>Selecione...</option>
                      <option>Em casa</option>
                      <option>Na rua</option>
                      <option>Bares/Festas</option>
                      <option>Cracolândia</option>
                      <option>Casa de amigos</option>
                      <option>Trabalho</option>
                      <option>Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">3.16 Forma de Uso</label>
                    <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                      <option>Selecione...</option>
                      <option>Fumada</option>
                      <option>Inalada</option>
                      <option>Injetada</option>
                      <option>Oral</option>
                      <option>Mista</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">3.17 Motivação para o Uso</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="O que leva o paciente a usar? Ex: Alívio de ansiedade, influência de amigos, prazer..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">3.18 Problemas Causados pelo Uso</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Problemas familiares, de saúde, legais, financeiros, sociais..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">3.19 Tentativas de Parar</label>
                    <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                      <option>Selecione...</option>
                      <option>Nunca tentou</option>
                      <option>1 vez</option>
                      <option>2-3 vezes</option>
                      <option>4-5 vezes</option>
                      <option>Mais de 5 vezes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">3.20 Maior Tempo de Abstinência</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Ex: 6 meses, 1 ano..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">3.21 Histórico de Tratamentos Anteriores</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Tratamentos já realizados (onde, quando, resultado)..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">3.22 Família e Uso de Drogas</label>
                  <textarea
                    rows={2}
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Histórico familiar de uso de substâncias..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">3.23 Motivação para Tratamento</label>
                  <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>Selecione...</option>
                    <option>Muito motivado</option>
                    <option>Motivado</option>
                    <option>Pouco motivado</option>
                    <option>Sem motivação (pressão familiar/judicial)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">3.24 Sintomas de Abstinência</label>
                  <textarea
                    rows={2}
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Descreva sintomas apresentados quando fica sem usar..."
                  />
                </div>
              </div>
            </div>
          )}

          {admissionType === "transtorno-mental" && (
            <div className="bg-purple-50 dark:bg-purple-950/20 p-6 rounded-lg space-y-4 border border-purple-200 dark:border-purple-800">
              <h3 className="font-semibold text-foreground flex items-center gap-2 text-lg">
                <Heart className="w-5 h-5 text-purple-600" />
                Seção Específica: Transtorno Mental
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">3.9 Histórico Psiquiátrico Pessoal</label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Diagnósticos anteriores, internações psiquiátricas, tratamentos prévios..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">3.10 Histórico Psiquiátrico Familiar</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Casos de transtornos mentais na família (quem, diagnóstico)..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">3.11 Tentativas de Suicídio / Autolesão</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Histórico de tentativas, métodos, quando ocorreram..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">3.12 Infância e Adolescência</label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Desenvolvimento, escolaridade, relacionamentos, traumas, eventos significativos..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">3.13 Vida Adulta</label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Relacionamentos, trabalho, vida social, eventos marcantes..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">3.14 Dinâmica Familiar Atual</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Como é a relação com a família atualmente? Apoio familiar?"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">3.15 Padrão de Sono</label>
                    <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                      <option>Selecione...</option>
                      <option>Normal</option>
                      <option>Insônia Inicial</option>
                      <option>Insônia Terminal</option>
                      <option>Sono Excessivo</option>
                      <option>Sono Fragmentado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">3.16 Apetite</label>
                    <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                      <option>Selecione...</option>
                      <option>Normal</option>
                      <option>Aumentado</option>
                      <option>Diminuído</option>
                      <option>Muito Diminuído</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">3.17 Nível de Funcionamento Social</label>
                  <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>Selecione...</option>
                    <option>Bom - Mantém atividades e relações</option>
                    <option>Moderado - Prejuízo parcial</option>
                    <option>Ruim - Isolamento e dificuldade em atividades</option>
                    <option>Muito Ruim - Incapaz de realizar atividades básicas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">3.18 Rede de Suporte Social</label>
                  <textarea
                    rows={2}
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Amigos, grupos, igreja, instituições que oferecem suporte..."
                  />
                </div>
              </div>
            </div>
          )}

          {admissionType === "geral" && (
            <div className="bg-blue-50 dark:bg-blue-950/20 p-6 rounded-lg space-y-4 border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-foreground flex items-center gap-2 text-lg">
                <Home className="w-5 h-5 text-blue-600" />
                Seção Específica: Acolhimento Geral
              </h3>

              <div>
                <label className="block text-sm font-medium text-foreground mb-3">Doenças e Fatores de Risco</label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {doencasERiscos.map((doenca) => (
                    <label key={doenca} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" className="w-4 h-4 rounded border-input" />
                      <span>{doenca}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Outras Condições de Saúde</label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Descreva outras condições de saúde não listadas acima..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Alergias</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Liste alergias conhecidas (medicamentos, alimentos, etc.)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Histórico de Cirurgias</label>
                <textarea
                  rows={2}
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Liste cirurgias realizadas e quando..."
                />
              </div>
            </div>
          )}

          <div className="bg-muted/50 p-6 rounded-lg space-y-4">
            <h3 className="font-semibold text-foreground text-lg">Informações Complementares</h3>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Participação da Família no Tratamento</label>
              <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                <option>Selecione...</option>
                <option>Muito Participativa</option>
                <option>Participativa</option>
                <option>Pouco Participativa</option>
                <option>Não Participativa</option>
                <option>Família Ausente</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Expectativas em Relação ao Tratamento</label>
              <textarea
                rows={3}
                className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="O que o paciente espera do tratamento no CAPS?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">O que Gosta de Fazer / Hobbies / Interesses</label>
              <textarea
                rows={2}
                className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Atividades, hobbies, coisas que gosta de fazer..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Comentários e Observações Adicionais</label>
              <textarea
                rows={4}
                className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Observações importantes, informações relevantes não contempladas acima..."
              />
            </div>
          </div>

          <div className="bg-primary/5 p-6 rounded-lg border-2 border-primary/20 space-y-4">
            <h3 className="font-semibold text-foreground text-lg">Modalidade de Tratamento *</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { value: "intensivo", label: "Intensivo", desc: "Atendimento diário" },
                { value: "semi-intensivo", label: "Semi-Intensivo", desc: "Até 12 dias/mês" },
                { value: "nao-intensivo", label: "Não Intensivo", desc: "Até 3 dias/mês" },
              ].map((mode) => (
                <label
                  key={mode.value}
                  className="flex flex-col p-4 border-2 border-border rounded-lg cursor-pointer hover:border-primary/50 transition-all bg-card"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="modalidade"
                      value={mode.value}
                      className="w-5 h-5"
                    />
                    <div>
                      <p className="font-medium text-foreground">{mode.label}</p>
                      <p className="text-xs text-muted-foreground">{mode.desc}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-muted/50 p-6 rounded-lg space-y-4">
            <h3 className="font-semibold text-foreground text-lg">Profissional Responsável</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Nome do Profissional</label>
                <input
                  type="text"
                  data-core="true"
                  readOnly
                  value={user?.name ?? ""}
                  className="w-full px-4 py-2.5 bg-muted border border-input rounded-lg text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Categoria Profissional</label>
                <input
                  type="text"
                  data-core="true"
                  readOnly
                  value={user ? ROLE_LABELS[user.role] : ""}
                  className="w-full px-4 py-2.5 bg-muted border border-input rounded-lg text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">Preenchido automaticamente pela conta que está registrando.</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Assinatura / Carimbo</label>
                <div className="w-full h-24 px-4 py-2.5 bg-input-background border border-input rounded-lg flex items-center justify-center text-muted-foreground text-sm">
                  Espaço reservado para assinatura e carimbo
                </div>
              </div>
            </div>
          </div>

          {saveError && (
            <p className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{saveError}</p>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Link
              to="/dashboard"
              className="px-6 py-3 border border-border rounded-lg font-medium hover:bg-muted transition-all"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all disabled:opacity-60"
            >
              <Save className="w-5 h-5" />
              {saving ? "Salvando..." : "Salvar Acolhimento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 43. `revitalize1-main/src/app/pages/AppointmentSession.tsx` (alterado)

**O que foi corrigido:** Os dados do atendimento chegam pela navegação, não pelo localStorage, e as anotações não são mais gravadas no navegador. Achado 8.

**Configuração externa:** Nenhuma.

```tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, Clock, Users, AlertCircle, ShieldCheck, FileText, Check } from "lucide-react";

export type AppointmentState = {
  id: number;
  time: string;
  activity: string;
  participants: number;
  description: string;
  isUrgent: boolean;
};

export default function AppointmentSession() {
  const navigate = useNavigate();
  const location = useLocation();
  // Os dados do atendimento chegam pela navegação (memória da página), nunca pelo armazenamento do navegador.
  const [appointment, setAppointment] = useState<AppointmentState | null>(null);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [attendees, setAttendees] = useState<string[]>([]);
  const [newAttendee, setNewAttendee] = useState("");

  useEffect(() => {
    const state = location.state as { appointment?: AppointmentState } | null;
    if (state?.appointment) {
      setAppointment(state.appointment);
    } else {
      navigate('/dashboard', { replace: true });
    }
  }, [location.state, navigate]);

  const getElapsedTime = () => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const [elapsedTime, setElapsedTime] = useState("00:00");

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(getElapsedTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const handleAddAttendee = () => {
    if (newAttendee.trim()) {
      setAttendees([...attendees, newAttendee.trim()]);
      setNewAttendee("");
    }
  };

  const handleRemoveAttendee = (index: number) => {
    setAttendees(attendees.filter((_, i) => i !== index));
  };

  const handleFinishAppointment = () => {
    if (confirm("Deseja finalizar o atendimento?")) {
      setNotes("");
      setAttendees([]);
      navigate('/dashboard', { replace: true });
    }
  };

  if (!appointment) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 hover:bg-muted rounded-lg transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold text-foreground">Atendimento em Andamento</h1>
          <p className="text-muted-foreground mt-1">Registre as informações do atendimento</p>
        </div>
        <div className="flex items-center gap-4 bg-card border border-border rounded-lg px-4 py-3">
          <Clock className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Tempo decorrido</p>
            <p className="text-xl font-semibold text-foreground font-mono">{elapsedTime}</p>
          </div>
        </div>
      </div>

      <div className={`rounded-xl p-6 text-white ${
        appointment.isUrgent
          ? "bg-gradient-to-r from-red-600 to-red-700"
          : "bg-gradient-to-r from-primary to-secondary"
      }`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold">{appointment.activity}</h2>
              {appointment.isUrgent && (
                <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-sm flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  ATENDIMENTO URGENTE
                </span>
              )}
            </div>
            <p className="text-white/80 mt-2">Horário agendado: {appointment.time}</p>
            <p className="text-white/80">Participantes esperados: {appointment.participants}</p>
            {appointment.description && (
              <p className="text-white/90 mt-3 text-sm">{appointment.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Registro do Atendimento
            </h3>
            <textarea
              rows={15}
              maxLength={20000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Digite aqui as anotações do atendimento...&#10;&#10;- Principais temas abordados&#10;- Participação dos pacientes&#10;- Observações relevantes&#10;- Encaminhamentos necessários&#10;- Próximos passos"
              className="w-full px-4 py-3 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono text-sm"
            />
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                {notes.length} caracteres
              </p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="w-4 h-4" />
                Por segurança, as anotações não são gravadas no navegador.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Lista de Presença
            </h3>
            <div className="space-y-3 mb-4">
              {attendees.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum participante registrado
                </p>
              ) : (
                attendees.map((attendee, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-foreground">{attendee}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveAttendee(index)}
                      className="text-red-600 hover:text-red-700 text-xs"
                    >
                      Remover
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newAttendee}
                onChange={(e) => setNewAttendee(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddAttendee()}
                placeholder="Nome do participante"
                className="flex-1 px-3 py-2 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
              <button
                onClick={handleAddAttendee}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all text-sm"
              >
                Adicionar
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Total de participantes: {attendees.length}
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Informações do Atendimento</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Início:</span>
                <span className="font-medium">{startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data:</span>
                <span className="font-medium">{startTime.toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duração:</span>
                <span className="font-medium font-mono">{elapsedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo:</span>
                <span className="font-medium">{appointment.activity}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-3 border border-border rounded-lg font-medium hover:bg-muted transition-all"
        >
          Voltar sem Salvar
        </button>
        <button
          onClick={handleFinishAppointment}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all"
        >
          <Check className="w-5 h-5" />
          Finalizar Atendimento
        </button>
      </div>
    </div>
  );
}
```

### 44. `revitalize1-main/src/app/pages/Dashboard.tsx` (alterado)

**O que foi corrigido:** Iniciar atendimento sem gravar no localStorage. Achado 8.

**Configuração externa:** Nenhuma.

```tsx
import { Users, UserPlus, Calendar, AlertCircle, TrendingUp, Activity, Eye, Trash2, Plus, Clock, Play } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useState } from "react";

export default function Dashboard() {
  const navigate = useNavigate();
  const [scheduleItems, setScheduleItems] = useState([
    { id: 1, time: "09:00", activity: "Grupo Terapêutico - Ansiedade", participants: 12, description: "Sessão focada em técnicas de respiração e controle da ansiedade", isUrgent: false },
    { id: 2, time: "11:00", activity: "Oficina de Arte", participants: 8, description: "Expressão artística através de pintura e desenho livre", isUrgent: false },
    { id: 3, time: "14:00", activity: "Atendimento Individual", participants: 15, description: "Consultas individuais agendadas com diversos profissionais", isUrgent: false },
    { id: 4, time: "16:00", activity: "Visitas Domiciliares", participants: 5, description: "Acompanhamento de pacientes em situação de vulnerabilidade", isUrgent: false },
  ]);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<typeof scheduleItems[0] | null>(null);

  const [newSchedule, setNewSchedule] = useState({
    time: "",
    activity: "",
    participants: "",
    description: "",
    isUrgent: false
  });

  const stats = [
    { label: "Pacientes Ativos", value: "247", icon: Users, color: "bg-blue-500", change: "+12 este mês" },
    { label: "Acolhimentos Hoje", value: "8", icon: UserPlus, color: "bg-green-500", change: "3 aguardando" },
    { label: "Atendimentos Hoje", value: "23", icon: Activity, color: "bg-purple-500", change: "15 concluídos" },
    { label: "Faltas esta Semana", value: "14", icon: AlertCircle, color: "bg-orange-500", change: "-3 vs semana passada" },
  ];

  const recentPatients = [
    { name: "Maria Silva Santos", status: "Aguardando", type: "Acolhimento", time: "10:30" },
    { name: "João Pedro Oliveira", status: "Em atendimento", type: "Consulta", time: "11:00" },
    { name: "Ana Paula Costa", status: "Aguardando", type: "Grupo Terapêutico", time: "14:00" },
    { name: "Carlos Eduardo Lima", status: "Concluído", type: "Evolução", time: "09:15" },
  ];

  const handleViewDetails = (schedule: typeof scheduleItems[0]) => {
    setSelectedSchedule(schedule);
    setShowDetailModal(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este item da agenda?")) {
      setScheduleItems(scheduleItems.filter(item => item.id !== id));
    }
  };

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();

    const newId = Math.max(...scheduleItems.map(item => item.id), 0) + 1;
    const newItem = {
      id: newId,
      time: newSchedule.time,
      activity: newSchedule.activity,
      participants: parseInt(newSchedule.participants) || 0,
      description: newSchedule.description,
      isUrgent: newSchedule.isUrgent
    };

    setScheduleItems([...scheduleItems, newItem].sort((a, b) => a.time.localeCompare(b.time)));

    setNewSchedule({
      time: "",
      activity: "",
      participants: "",
      description: "",
      isUrgent: false
    });

    setShowAddModal(false);
  };

  const handleStartAppointment = (schedule: typeof scheduleItems[0]) => {
    navigate('/appointment-session', { state: { appointment: schedule } });
  };

  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const handleStatClick = (label: string) => {
    setSelectedStat(label);
    setShowStatsModal(true);
  };

  const handlePatientClick = (patient: any) => {
    setSelectedPatient({
      ...patient,
      fullInfo: {
        cpf: "123.456.789-00",
        birthDate: "15/03/1985",
        phone: "(62) 98765-4321",
        address: "Rua das Flores, 123 - Centro, Ceres/GO",
        diagnosis: "F32 - Episódio Depressivo",
        admissionDate: "10/01/2024",
        attendingPhysician: "Dr. João Silva",
        medications: ["Fluoxetina 20mg - 1x/dia", "Clonazepam 2mg - 1x/dia (noite)"],
        lastAppointment: "20/04/2026",
        nextAppointment: "05/05/2026"
      }
    });
    setShowPatientModal(true);
  };

  const getStatsDetailContent = () => {
    if (selectedStat === "Pacientes Ativos") {
      return (
        <div className="space-y-3">
          {[
            { name: "Maria Silva Santos", cpf: "123.456.789-00", status: "Intensivo" },
            { name: "João Pedro Oliveira", cpf: "234.567.890-11", status: "Semi-Intensivo" },
            { name: "Ana Paula Costa", cpf: "345.678.901-22", status: "Não Intensivo" },
            { name: "Carlos Eduardo Lima", cpf: "456.789.012-33", status: "Intensivo" },
            { name: "Juliana Ferreira Souza", cpf: "567.890.123-44", status: "Semi-Intensivo" },
          ].map((patient, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium text-foreground">{patient.name}</p>
                <p className="text-sm text-muted-foreground">CPF: {patient.cpf}</p>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                {patient.status}
              </span>
            </div>
          ))}
        </div>
      );
    } else if (selectedStat === "Acolhimentos Hoje") {
      return (
        <div className="space-y-3">
          {[
            { name: "Pedro Santos", time: "09:00", type: "Álcool e Drogas" },
            { name: "Mariana Oliveira", time: "10:30", type: "Transtorno Mental" },
            { name: "Ricardo Costa", time: "14:00", type: "Geral" },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium text-foreground">{item.name}</p>
                <p className="text-sm text-muted-foreground">Tipo: {item.type}</p>
              </div>
              <span className="text-sm font-medium text-primary">{item.time}</span>
            </div>
          ))}
        </div>
      );
    } else if (selectedStat === "Atendimentos Hoje") {
      return (
        <div className="space-y-3">
          {[
            { patient: "Maria Silva Santos", type: "Consulta Médica", time: "09:00", status: "Concluído" },
            { patient: "João Pedro Oliveira", type: "Psicologia", time: "10:00", status: "Concluído" },
            { patient: "Ana Paula Costa", type: "Grupo Terapêutico", time: "14:00", status: "Aguardando" },
            { patient: "Carlos Eduardo Lima", type: "Enfermagem", time: "15:30", status: "Aguardando" },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium text-foreground">{item.patient}</p>
                <p className="text-sm text-muted-foreground">{item.type} - {item.time}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                item.status === "Concluído" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
              }`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      );
    } else if (selectedStat === "Faltas esta Semana") {
      return (
        <div className="space-y-3">
          {[
            { patient: "Roberto Santos", date: "22/04", type: "Consulta Individual" },
            { patient: "Fernanda Lima", date: "21/04", type: "Grupo Terapêutico" },
            { patient: "Paulo Henrique", date: "20/04", type: "Oficina de Arte" },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium text-foreground">{item.patient}</p>
                <p className="text-sm text-muted-foreground">{item.type}</p>
              </div>
              <span className="text-sm text-muted-foreground">{item.date}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Painel de Indicadores</h1>
        <p className="text-muted-foreground mt-1">Visão geral do CAPS - {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              onClick={() => handleStatClick(stat.label)}
              className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-semibold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.change}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Pacientes Recentes</h2>
            <Link to="/patients" className="text-sm text-primary hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="space-y-4">
            {recentPatients.map((patient, index) => (
              <div
                key={index}
                onClick={() => handlePatientClick(patient)}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-sm">
                    {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{patient.name}</p>
                    <p className="text-sm text-muted-foreground">{patient.type} • {patient.time}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  patient.status === "Aguardando" ? "bg-yellow-100 text-yellow-700" :
                  patient.status === "Em atendimento" ? "bg-blue-100 text-blue-700" :
                  "bg-green-100 text-green-700"
                }`}>
                  {patient.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Agenda de Hoje</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all text-sm"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>
          <div className="space-y-3">
            {scheduleItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum atendimento agendado para hoje</p>
              </div>
            ) : (
              scheduleItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-all group ${
                    item.isUrgent
                      ? "border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className={`px-3 py-2 rounded-lg flex-shrink-0 ${
                    item.isUrgent ? "bg-red-100 dark:bg-red-900/30" : "bg-primary/10"
                  }`}>
                    <p className={`text-sm font-medium ${
                      item.isUrgent ? "text-red-700 dark:text-red-400" : "text-primary"
                    }`}>
                      {item.time}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{item.activity}</p>
                      {item.isUrgent && (
                        <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          URGENTE
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.participants} participante(s)</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStartAppointment(item)}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 text-sm font-medium"
                      title="Iniciar atendimento"
                    >
                      <Play className="w-4 h-4" />
                      Iniciar
                    </button>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleViewDetails(item)}
                        className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                        title="Visualizar detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-all"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Link to="/admission" className="bg-gradient-to-br from-primary to-secondary rounded-xl p-6 text-white hover:shadow-xl transition-all group">
          <UserPlus className="w-10 h-10 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-semibold mb-2">Novo Acolhimento</h3>
          <p className="text-white/80 text-sm">Realizar admissão de novo paciente</p>
        </Link>

        <Link to="/patients" className="bg-gradient-to-br from-accent to-secondary rounded-xl p-6 text-white hover:shadow-xl transition-all group">
          <Users className="w-10 h-10 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-semibold mb-2">Ver Pacientes</h3>
          <p className="text-white/80 text-sm">Acessar lista completa de pacientes</p>
        </Link>

        <Link to="/daily-production" className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-white hover:shadow-xl transition-all group">
          <TrendingUp className="w-10 h-10 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-semibold mb-2">Produção Diária</h3>
          <p className="text-white/80 text-sm">Visualizar relatórios e indicadores</p>
        </Link>
      </div>

      {/* Modal de Detalhes */}
      {showDetailModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
          <div className="bg-card rounded-xl border border-border p-6 max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-foreground">{selectedSchedule.activity}</h3>
                  {selectedSchedule.isUrgent && (
                    <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      URGENTE
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Horário: {selectedSchedule.time}</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Participantes</p>
                <p className="font-semibold text-foreground">{selectedSchedule.participants} pessoa(s)</p>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Descrição</p>
                <p className="text-foreground">{selectedSchedule.description}</p>
              </div>

              <div className={`p-4 rounded-lg border ${
                selectedSchedule.isUrgent
                  ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                  : "bg-primary/10 border-primary/20"
              }`}>
                <p className={`text-sm font-medium ${
                  selectedSchedule.isUrgent
                    ? "text-red-700 dark:text-red-400"
                    : "text-primary"
                }`}>
                  📅 Agendado para hoje - {selectedSchedule.time}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-border">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-all"
              >
                Fechar
              </button>
              <button className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all">
                Editar Agenda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adicionar Atendimento */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-card rounded-xl border border-border p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Adicionar Atendimento</h3>
                <p className="text-sm text-muted-foreground mt-1">Preencha os dados do novo atendimento</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Horário *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="time"
                    required
                    value={newSchedule.time}
                    onChange={(e) => setNewSchedule({...newSchedule, time: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tipo de Atendimento *
                </label>
                <input
                  type="text"
                  required
                  value={newSchedule.activity}
                  onChange={(e) => setNewSchedule({...newSchedule, activity: e.target.value})}
                  placeholder="Ex: Consulta Individual, Grupo Terapêutico..."
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Número de Participantes *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newSchedule.participants}
                  onChange={(e) => setNewSchedule({...newSchedule, participants: e.target.value})}
                  placeholder="Ex: 1, 5, 10..."
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Descrição
                </label>
                <textarea
                  rows={3}
                  value={newSchedule.description}
                  onChange={(e) => setNewSchedule({...newSchedule, description: e.target.value})}
                  placeholder="Descreva detalhes do atendimento..."
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newSchedule.isUrgent}
                    onChange={(e) => setNewSchedule({...newSchedule, isUrgent: e.target.checked})}
                    className="mt-1 w-5 h-5 rounded border-input"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">Marcar como Urgente</span>
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Atendimentos urgentes são destacados em vermelho na agenda
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all"
                >
                  Adicionar Atendimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Estatísticas */}
      {showStatsModal && selectedStat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowStatsModal(false)}>
          <div className="bg-card rounded-xl border border-border p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-xl font-semibold text-foreground">{selectedStat}</h3>
              <button
                onClick={() => setShowStatsModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {getStatsDetailContent()}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
              <button
                onClick={() => setShowStatsModal(false)}
                className="px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Paciente */}
      {showPatientModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPatientModal(false)}>
          <div className="bg-card rounded-xl border border-border p-6 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xl">
                  {selectedPatient.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-foreground">{selectedPatient.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Status atual: {selectedPatient.status}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPatientModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">CPF</p>
                  <p className="font-semibold text-foreground">{selectedPatient.fullInfo.cpf}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Data de Nascimento</p>
                  <p className="font-semibold text-foreground">{selectedPatient.fullInfo.birthDate}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Telefone</p>
                  <p className="font-semibold text-foreground">{selectedPatient.fullInfo.phone}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Data de Admissão</p>
                  <p className="font-semibold text-foreground">{selectedPatient.fullInfo.admissionDate}</p>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Endereço</p>
                <p className="font-semibold text-foreground">{selectedPatient.fullInfo.address}</p>
              </div>

              <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">Diagnóstico</p>
                <p className="font-semibold text-foreground">{selectedPatient.fullInfo.diagnosis}</p>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Médico Responsável</p>
                <p className="font-semibold text-foreground">{selectedPatient.fullInfo.attendingPhysician}</p>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Medicamentos em Uso</p>
                <ul className="space-y-1">
                  {selectedPatient.fullInfo.medications.map((med: string, idx: number) => (
                    <li key={idx} className="text-sm text-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                      {med}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Último Atendimento</p>
                  <p className="font-semibold text-foreground">{selectedPatient.fullInfo.lastAppointment}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Próximo Atendimento</p>
                  <p className="font-semibold text-foreground">{selectedPatient.fullInfo.nextAppointment}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-border">
              <button
                onClick={() => setShowPatientModal(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-all"
              >
                Fechar
              </button>
              <button
                onClick={() => navigate(`/patients/${selectedPatient.name}`)}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all"
              >
                Ver Prontuário Completo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 45. `revitalize1-main/src/app/pages/Schedule.tsx` (alterado)

**O que foi corrigido:** Iniciar atendimento sem gravar no localStorage. Achado 8.

**Configuração externa:** Nenhuma.

```tsx
import { useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Eye, Edit2, Trash2, AlertCircle, Play } from "lucide-react";
import { useNavigate } from "react-router";

export default function Schedule() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<number | null>(null);

  const [newAppointment, setNewAppointment] = useState({
    title: "",
    professional: "",
    startHour: 9,
    endHour: 10,
    participants: "",
    description: "",
    isUrgent: false,
    color: "bg-green-500"
  });

  const timeSlots = Array.from({ length: 13 }, (_, i) => i + 7); // 7h às 19h

  const colorOptions = [
    { value: "bg-green-500", label: "Verde - Baixa Urgência", description: "Atendimento de rotina" },
    { value: "bg-yellow-500", label: "Amarelo - Média Urgência", description: "Atenção necessária" },
    { value: "bg-red-500", label: "Vermelho - Alta Urgência", description: "Prioridade máxima" },
  ];

  const [appointments, setAppointments] = useState([
    { id: 1, date: new Date(2026, 3, 24), startHour: 9, endHour: 10, title: "Grupo Terapêutico - Ansiedade", participants: 12, isUrgent: false, color: "bg-green-500", description: "Técnicas de respiração" },
    { id: 2, date: new Date(2026, 3, 24), startHour: 14, endHour: 15.5, title: "Atendimento Individual", participants: 1, isUrgent: false, color: "bg-yellow-500", description: "Consulta psicológica" },
    { id: 3, date: new Date(2026, 3, 25), startHour: 11, endHour: 12, title: "Oficina de Arte", participants: 8, isUrgent: false, color: "bg-green-500", description: "Pintura livre" },
    { id: 4, date: new Date(2026, 3, 26), startHour: 9, endHour: 10, title: "Consulta Psiquiátrica", participants: 1, isUrgent: true, color: "bg-red-500", description: "Avaliação urgente" },
    { id: 5, date: new Date(2026, 3, 27), startHour: 15, endHour: 16, title: "Grupo de Familiares", participants: 10, isUrgent: false, color: "bg-yellow-500", description: "Acolhimento familiar" },
    { id: 6, date: new Date(2026, 3, 28), startHour: 10, endHour: 11, title: "Visita Domiciliar", participants: 1, isUrgent: false, color: "bg-green-500", description: "Acompanhamento" },
  ]);

  const navigateDay = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    setSelectedDate(newDate);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    setCurrentMonth(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  };

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(apt => isSameDay(apt.date, date));
  };

  const getAppointmentsForSlot = (hour: number) => {
    const dayAppointments = getAppointmentsForDay(selectedDate);
    return dayAppointments.filter(apt => hour >= apt.startHour && hour < apt.endHour);
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Dias do mês anterior para preencher
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }

    // Dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true });
    }

    // Dias do próximo mês para preencher
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }

    return days;
  };

  const handleStartAppointment = (appointment: typeof appointments[0]) => {
    navigate('/appointment-session', {
      state: {
        appointment: {
          id: appointment.id,
          time: `${appointment.startHour.toString().padStart(2, '0')}:00`,
          activity: appointment.title,
          participants: appointment.participants,
          description: appointment.description,
          isUrgent: appointment.isUrgent
        }
      }
    });
  };

  const openAddModal = (timeSlot?: number) => {
    if (timeSlot !== undefined && timeSlot !== null) {
      setNewAppointment({
        ...newAppointment,
        startHour: timeSlot,
        endHour: timeSlot + 1
      });
    }
    setShowAddModal(true);
  };

  const handleAddAppointment = (e: React.FormEvent) => {
    e.preventDefault();

    const newId = Math.max(...appointments.map(apt => apt.id), 0) + 1;
    const newApt = {
      id: newId,
      date: new Date(selectedDate),
      startHour: newAppointment.startHour,
      endHour: newAppointment.endHour,
      title: newAppointment.title,
      participants: parseInt(newAppointment.participants) || 0,
      description: newAppointment.description,
      isUrgent: newAppointment.isUrgent,
      color: newAppointment.color
    };

    setAppointments([...appointments, newApt]);

    setNewAppointment({
      title: "",
      professional: "",
      startHour: 9,
      endHour: 10,
      participants: "",
      description: "",
      isUrgent: false,
      color: "bg-green-500"
    });

    setShowAddModal(false);
  };

  const monthDays = getDaysInMonth();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Agenda</h1>
          <p className="text-muted-foreground mt-1">Calendário de atendimentos por dia</p>
        </div>
        <button
          onClick={() => openAddModal()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendário Mensal */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">
              {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex gap-1">
              <button
                onClick={() => navigateMonth("prev")}
                className="p-1.5 hover:bg-muted rounded-lg transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigateMonth("next")}
                className="p-1.5 hover:bg-muted rounded-lg transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
              <div key={i} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day, index) => {
              const hasAppointments = getAppointmentsForDay(day.date).length > 0;
              const isSelected = isSameDay(day.date, selectedDate);
              const isTodayDate = isToday(day.date);

              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(day.date)}
                  className={`aspect-square rounded-lg text-sm transition-all relative ${
                    !day.isCurrentMonth
                      ? "text-muted-foreground/40"
                      : isSelected
                      ? "bg-primary text-primary-foreground font-semibold"
                      : isTodayDate
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-muted"
                  }`}
                >
                  {day.date.getDate()}
                  {hasAppointments && (
                    <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                      isSelected ? "bg-primary-foreground" : "bg-primary"
                    }`} />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={() => setSelectedDate(new Date())}
              className="w-full px-4 py-2 border border-border rounded-lg hover:bg-muted transition-all text-sm font-medium"
            >
              Hoje
            </button>
          </div>
        </div>

        {/* Vista do Dia Selecionado */}
        <div className="lg:col-span-2 space-y-4">{/* ... Continua abaixo ... */}

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => navigateDay("prev")}
                    className="p-2 hover:bg-muted rounded-lg transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="text-center">
                    <h2 className="text-xl font-semibold text-foreground capitalize">
                      {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                    </h2>
                    {isToday(selectedDate) && (
                      <span className="text-sm text-primary">Hoje</span>
                    )}
                  </div>
                  <button
                    onClick={() => navigateDay("next")}
                    className="p-2 hover:bg-muted rounded-lg transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="text-sm text-muted-foreground">
                  {getAppointmentsForDay(selectedDate).length} atendimento(s)
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {timeSlots.map((hour) => {
                const slotAppointments = getAppointmentsForSlot(hour);
                return (
                  <div key={hour} className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="flex">
                      <div className="w-24 p-4 bg-muted/30 border-r border-border flex flex-col items-center justify-center">
                        <span className="text-lg font-semibold text-foreground">
                          {hour.toString().padStart(2, '0')}:00
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {(hour + 1).toString().padStart(2, '0')}:00
                        </span>
                      </div>
                      <div className="flex-1 min-h-[100px] p-3">
                        {slotAppointments.length === 0 ? (
                          <button
                            onClick={() => openAddModal(hour)}
                            className="w-full h-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all rounded-lg group"
                          >
                            <div className="text-center">
                              <Plus className="w-6 h-6 mx-auto mb-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <p className="text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                Adicionar atendimento
                              </p>
                            </div>
                          </button>
                        ) : (
                          <div className="space-y-2">
                            {slotAppointments.map((apt) => (
                              <div
                                key={apt.id}
                                className={`${apt.color} text-white rounded-lg p-4 shadow-md hover:shadow-lg transition-all group/apt`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className="font-semibold text-base">{apt.title}</h4>
                                      {apt.isUrgent && (
                                        <span className="px-2 py-0.5 bg-white/20 backdrop-blur rounded-full text-xs flex items-center gap-1">
                                          <AlertCircle className="w-3 h-3" />
                                          URGENTE
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm opacity-90 mb-1">
                                      {apt.startHour.toString().padStart(2, '0')}:00 - {apt.endHour.toString().padStart(2, '0')}:00
                                    </p>
                                    <p className="text-sm opacity-75 mb-2">
                                      {apt.participants} participante(s)
                                    </p>
                                    <p className="text-sm opacity-90">{apt.description}</p>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <button
                                      onClick={() => handleStartAppointment(apt)}
                                      className="px-3 py-2 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition-all flex items-center gap-2 text-sm font-medium"
                                      title="Iniciar atendimento"
                                    >
                                      <Play className="w-4 h-4" />
                                      Iniciar
                                    </button>
                                    <div className="flex gap-1">
                                      <button className="p-2 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition-all">
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <button className="p-2 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition-all">
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button className="p-2 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition-all">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Atendimentos no Dia</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {getAppointmentsForDay(selectedDate).length}
              </p>
            </div>
            <CalendarIcon className="w-8 h-8 text-primary opacity-50" />
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Participantes</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {getAppointmentsForDay(selectedDate).reduce((sum, apt) => sum + apt.participants, 0)}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-green-600"></div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Atendimentos Urgentes</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {getAppointmentsForDay(selectedDate).filter(apt => apt.isUrgent).length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500 opacity-50" />
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Horários Ocupados</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {timeSlots.filter(hour => getAppointmentsForSlot(hour).length > 0).length}/{timeSlots.length}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full border-4 border-primary opacity-50"></div>
          </div>
        </div>
      </div>

      {/* Modal de Adicionar Agendamento */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-card rounded-xl border border-border p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Novo Agendamento</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddAppointment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tipo de Atendimento *
                </label>
                <input
                  type="text"
                  required
                  value={newAppointment.title}
                  onChange={(e) => setNewAppointment({...newAppointment, title: e.target.value})}
                  placeholder="Ex: Consulta Individual, Grupo Terapêutico..."
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Profissional Responsável *
                </label>
                <select
                  required
                  value={newAppointment.professional}
                  onChange={(e) => setNewAppointment({...newAppointment, professional: e.target.value})}
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Selecione o profissional...</option>
                  <option value="Dr. João Silva">Dr. João Silva — Médico Psiquiatra</option>
                  <option value="Psic. Ana Costa">Psic. Ana Costa — Psicóloga</option>
                  <option value="Enf. Carlos Lima">Enf. Carlos Lima — Enfermeiro</option>
                  <option value="TO Maria Souza">TO Maria Souza — Terapeuta Ocupacional</option>
                  <option value="Ass. Social Carla Santos">Ass. Social Carla Santos — Assistente Social</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Horário de Início *
                  </label>
                  <select
                    value={newAppointment.startHour}
                    onChange={(e) => setNewAppointment({...newAppointment, startHour: parseInt(e.target.value)})}
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {timeSlots.map(hour => (
                      <option key={hour} value={hour}>
                        {hour.toString().padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Horário de Término *
                  </label>
                  <select
                    value={newAppointment.endHour}
                    onChange={(e) => setNewAppointment({...newAppointment, endHour: parseInt(e.target.value)})}
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {timeSlots.filter(h => h > newAppointment.startHour).map(hour => (
                      <option key={hour} value={hour}>
                        {hour.toString().padStart(2, '0')}:00
                      </option>
                    ))}
                    <option value={20}>20:00</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Número de Participantes *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newAppointment.participants}
                  onChange={(e) => setNewAppointment({...newAppointment, participants: e.target.value})}
                  placeholder="Ex: 1, 5, 10..."
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Descrição
                </label>
                <textarea
                  rows={3}
                  value={newAppointment.description}
                  onChange={(e) => setNewAppointment({...newAppointment, description: e.target.value})}
                  placeholder="Descreva detalhes do atendimento..."
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nível de Urgência *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setNewAppointment({...newAppointment, color: color.value})}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        newAppointment.color === color.value
                          ? "border-primary scale-105"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className={`w-full h-10 ${color.value} rounded-md mb-2`}></div>
                      <p className="text-sm font-medium text-center text-foreground">{color.label}</p>
                      <p className="text-xs text-center text-muted-foreground mt-1">{color.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAppointment.isUrgent}
                    onChange={(e) => setNewAppointment({...newAppointment, isUrgent: e.target.checked})}
                    className="mt-1 w-5 h-5 rounded border-input"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">Marcar como Urgente</span>
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Atendimentos urgentes são destacados em vermelho e têm prioridade
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 border border-border rounded-lg font-medium hover:bg-muted transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all"
                >
                  Adicionar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

