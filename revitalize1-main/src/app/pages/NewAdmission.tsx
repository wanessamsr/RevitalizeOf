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
