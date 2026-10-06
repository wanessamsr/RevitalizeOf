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
