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
    localStorage.setItem('currentAppointment', JSON.stringify(schedule));
    navigate('/appointment-session');
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
