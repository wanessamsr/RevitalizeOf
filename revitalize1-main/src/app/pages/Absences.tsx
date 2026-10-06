import { CalendarX, Search, Filter, AlertCircle, X } from "lucide-react";
import { useState } from "react";

export default function Absences() {
  const [showModal, setShowModal] = useState(false);
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todas");
  const [filterType, setFilterType] = useState("Todos");

  const handleStatClick = (label: string) => {
    setSelectedStat(label);
    setShowModal(true);
  };

  const getModalContent = () => {
    if (selectedStat === "Faltas esta Semana") {
      return (
        <div className="space-y-3">
          {[
            { patient: "Maria Silva Santos", date: "22/04", type: "Consulta Individual" },
            { patient: "Carlos Eduardo Lima", date: "21/04", type: "Grupo Terapêutico" },
            { patient: "Roberto Santos Alves", date: "20/04", type: "Consulta Individual" },
            { patient: "Ana Paula Costa", date: "19/04", type: "Oficina Terapêutica" },
          ].map((item, idx) => (
            <div key={idx} className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">{item.patient}</p>
                <span className="text-sm text-muted-foreground">{item.date}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{item.type}</p>
            </div>
          ))}
        </div>
      );
    } else if (selectedStat === "Pacientes com 3+ Faltas") {
      return (
        <div className="space-y-3">
          {[
            { patient: "Roberto Santos Alves", count: 3, lastAbsence: "20/04" },
            { patient: "Paulo Henrique Silva", count: 4, lastAbsence: "18/04" },
            { patient: "Fernanda Lima Costa", count: 5, lastAbsence: "15/04" },
          ].map((item, idx) => (
            <div key={idx} className="p-3 bg-muted/50 rounded-lg border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">{item.patient}</p>
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                  {item.count} faltas
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Última falta: {item.lastAbsence}</p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const absences = [
    { id: 1, patient: "Maria Silva Santos", cpf: "123.456.789-00", date: "22/04/2026", type: "Consulta Individual", professional: "Dr. João Silva", status: "Não Justificada", consecutiveAbsences: 1 },
    { id: 2, patient: "Carlos Eduardo Lima", cpf: "456.789.012-33", date: "21/04/2026", type: "Grupo Terapêutico", professional: "Psic. Ana Costa", status: "Justificada", consecutiveAbsences: 1 },
    { id: 3, patient: "Roberto Santos Alves", cpf: "678.901.234-55", date: "20/04/2026", type: "Consulta Individual", professional: "Dr. João Silva", status: "Não Justificada", consecutiveAbsences: 3 },
    { id: 4, patient: "Ana Paula Costa", cpf: "345.678.901-22", date: "19/04/2026", type: "Oficina Terapêutica", professional: "TO Maria Souza", status: "Não Justificada", consecutiveAbsences: 2 },
  ];

  const filteredAbsences = absences.filter(a => {
    const matchesSearch = a.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.cpf.replace(/\D/g, "").includes(searchTerm.replace(/\D/g, ""));
    const matchesStatus = filterStatus === "Todas" || a.status === filterStatus;
    const matchesType = filterType === "Todos" || a.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Gestão de Faltas</h1>
        <p className="text-muted-foreground mt-1">Monitoramento e controle de ausências</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          onClick={() => handleStatClick("Faltas esta Semana")}
          className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white cursor-pointer hover:shadow-xl transition-all"
        >
          <CalendarX className="w-10 h-10 mb-4" />
          <p className="text-3xl font-semibold">14</p>
          <p className="text-white/80 mt-1">Faltas esta Semana</p>
        </div>
        <div
          onClick={() => handleStatClick("Pacientes com 3+ Faltas")}
          className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white cursor-pointer hover:shadow-xl transition-all"
        >
          <AlertCircle className="w-10 h-10 mb-4" />
          <p className="text-3xl font-semibold">6</p>
          <p className="text-white/80 mt-1">Pacientes com 3+ Faltas</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por paciente ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Todas">Todas as Faltas</option>
              <option value="Justificada">Justificadas</option>
              <option value="Não Justificada">Não Justificadas</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Todos">Todos os Tipos</option>
              <option value="Consulta Individual">Consulta Individual</option>
              <option value="Grupo Terapêutico">Grupo Terapêutico</option>
              <option value="Oficina Terapêutica">Oficina Terapêutica</option>
              <option value="Visita Domiciliar">Visita Domiciliar</option>
            </select>
            {(searchTerm || filterStatus !== "Todas" || filterType !== "Todos") && (
              <button
                onClick={() => { setSearchTerm(""); setFilterStatus("Todas"); setFilterType("Todos"); }}
                className="flex items-center gap-1 px-3 py-2.5 text-sm text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-all"
              >
                <X className="w-4 h-4" />
                Limpar
              </button>
            )}
          </div>
        </div>

        <div className="text-sm text-muted-foreground mb-4">
          {filteredAbsences.length} resultado(s) encontrado(s)
        </div>

        <div className="space-y-3">
          {filteredAbsences.length === 0 ? (
            <div className="text-center py-12">
              <CalendarX className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhuma falta encontrada com os filtros aplicados</p>
            </div>
          ) : filteredAbsences.map((absence) => (
            <div key={absence.id} className="p-5 bg-muted/50 rounded-lg border border-border hover:shadow-md transition-all">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium flex-shrink-0">
                    {absence.patient.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-foreground">{absence.patient}</h3>
                      {absence.consecutiveAbsences >= 3 && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          <AlertCircle className="w-3 h-3" />
                          {absence.consecutiveAbsences} faltas consecutivas
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">CPF: {absence.cpf}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm">
                      <span className="text-muted-foreground"><strong>Data:</strong> {absence.date}</span>
                      <span className="text-muted-foreground"><strong>Tipo:</strong> {absence.type}</span>
                      <span className="text-muted-foreground"><strong>Profissional:</strong> {absence.professional}</span>
                    </div>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium self-start lg:self-center ${
                  absence.status === "Justificada"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}>
                  {absence.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-semibold text-foreground mb-4">Registrar Nova Falta</h2>
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Paciente *</label>
              <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                <option>Selecione o paciente...</option>
                <option>Maria Silva Santos</option>
                <option>João Pedro Oliveira</option>
                <option>Ana Paula Costa</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Data da Falta *</label>
              <input type="date" className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Tipo de Atendimento *</label>
              <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                <option>Selecione...</option>
                <option>Consulta Individual</option>
                <option>Grupo Terapêutico</option>
                <option>Oficina Terapêutica</option>
                <option>Visita Domiciliar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Status *</label>
              <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                <option>Não Justificada</option>
                <option>Justificada</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Observações</label>
            <textarea rows={3} placeholder="Adicione observações sobre a falta ou justificativa..." className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="px-6 py-2.5 border border-border rounded-lg font-medium hover:bg-muted transition-all">Cancelar</button>
            <button type="submit" className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all">Registrar Falta</button>
          </div>
        </form>
      </div>

      {showModal && selectedStat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-card rounded-xl border border-border p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-xl font-semibold text-foreground">{selectedStat}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-muted rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            {getModalContent()}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-all">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
