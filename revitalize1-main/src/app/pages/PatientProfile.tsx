import { useParams, Link } from "react-router";
import { ArrowLeft, FileText, Calendar, Pill, Phone, Mail, MapPin, User, AlertCircle } from "lucide-react";
import { useState } from "react";

export default function PatientProfile() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");

  const patient = {
    name: "Maria Silva Santos",
    cpf: "123.456.789-00",
    birthDate: "15/03/1985",
    age: 41,
    phone: "(62) 98765-4321",
    email: "maria.silva@email.com",
    address: "Rua das Flores, 123 - Centro, Ceres-GO",
    status: "Ativo",
    admissionDate: "10/01/2024",
    diagnosis: "F32 - Episódio Depressivo",
    responsibleDoctor: "Dr. João Silva",
  };

  const timeline = [
    { date: "22/04/2026", type: "Evolução Médica", professional: "Dr. João Silva", content: "Paciente apresenta melhora significativa do quadro depressivo. Relatou estar dormindo melhor e com mais disposição para atividades diárias. Medicação mantida." },
    { date: "15/04/2026", type: "Atendimento em Grupo", professional: "Psic. Ana Costa", content: "Participação ativa no grupo terapêutico sobre ansiedade. Compartilhou experiências e demonstrou empatia com outros participantes." },
    { date: "08/04/2026", type: "Oficina Terapêutica", professional: "TO Maria Souza", content: "Oficina de arte - paciente produziu desenho expressando seus sentimentos. Demonstrou criatividade e engajamento na atividade." },
    { date: "01/04/2026", type: "Evolução de Enfermagem", professional: "Enf. Carlos Lima", content: "Sinais vitais normais. PA: 120/80 mmHg, FC: 72 bpm. Paciente relata adesão à medicação prescrita. Sem queixas no momento." },
  ];

  const medications = [
    { name: "Fluoxetina 20mg", dose: "1 comprimido", frequency: "1x ao dia (manhã)", startDate: "10/01/2024" },
    { name: "Clonazepam 2mg", dose: "1/2 comprimido", frequency: "1x ao dia (noite)", startDate: "10/01/2024" },
  ];

  const tabs = [
    { id: "overview", label: "Visão Geral" },
    { id: "timeline", label: "Histórico Clínico" },
    { id: "medications", label: "Medicamentos" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/patients" className="p-2 hover:bg-muted rounded-lg transition-all">
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
              {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <h2 className="text-2xl font-semibold">{patient.name}</h2>
              <p className="text-white/80 mt-1">CPF: {patient.cpf} • {patient.age} anos</p>
              <div className="flex flex-wrap gap-4 mt-2 text-sm">
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {patient.phone}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {patient.email}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/evolution/${id}`}
              className="px-4 py-2 bg-white text-primary rounded-lg font-medium hover:bg-white/90 transition-all"
            >
              Nova Evolução
            </Link>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-white/20 backdrop-blur text-white rounded-lg font-medium hover:bg-white/30 transition-all"
            >
              Imprimir Prontuário
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-border">
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
                <span className="font-medium">{patient.birthDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Idade:</span>
                <span className="font-medium">{patient.age} anos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Telefone:</span>
                <span className="font-medium">{patient.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">E-mail:</span>
                <span className="font-medium">{patient.email}</span>
              </div>
              <div className="pt-2 border-t border-border">
                <span className="text-muted-foreground">Endereço:</span>
                <p className="font-medium mt-1">{patient.address}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Informações Clínicas
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                  {patient.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data de Admissão:</span>
                <span className="font-medium">{patient.admissionDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Médico Responsável:</span>
                <span className="font-medium">{patient.responsibleDoctor}</span>
              </div>
              <div className="pt-2 border-t border-border">
                <span className="text-muted-foreground">Diagnóstico Principal:</span>
                <p className="font-medium mt-1">{patient.diagnosis}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <Pill className="w-5 h-5" />
              Medicamentos em Uso
            </h3>
            <div className="space-y-3">
              {medications.map((med, index) => (
                <div key={index} className="p-4 bg-muted/50 rounded-lg border border-border">
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
          </div>
        </div>
      )}

      {activeTab === "timeline" && (
        <div className="space-y-4">
          {timeline.map((entry, index) => (
            <div key={index} className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-foreground">{entry.type}</h4>
                      <p className="text-sm text-muted-foreground">{entry.professional}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {entry.date}
                    </div>
                  </div>
                  <p className="text-sm text-foreground">{entry.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "medications" && (
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-foreground">Histórico de Medicamentos</h3>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all">
              Prescrever Medicamento
            </button>
          </div>
          <div className="space-y-4">
            {medications.map((med, index) => (
              <div key={index} className="p-6 bg-muted/50 rounded-lg border border-border">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground text-lg">{med.name}</h4>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Ativo
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
