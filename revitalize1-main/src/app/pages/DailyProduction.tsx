import { BarChart3, Download, Calendar, TrendingUp, Activity, Users, UserPlus, Home, X, ChevronDown } from "lucide-react";
import { useState } from "react";

type ModalKey = "Acolhimentos" | "Consultas Individuais" | "Atendimentos em Grupo" | "Visitas Domiciliares" | null;

export default function DailyProduction() {
  const [activeModal, setActiveModal] = useState<ModalKey>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterFrom, setFilterFrom] = useState("2026-04-18");
  const [filterTo, setFilterTo] = useState("2026-04-23");
  const [appliedFilter, setAppliedFilter] = useState({ from: "18/04/2026", to: "23/04/2026" });

  const stats = [
    { label: "Acolhimentos" as ModalKey, value: 8, icon: UserPlus, color: "bg-blue-500" },
    { label: "Consultas Individuais" as ModalKey, value: 15, icon: Activity, color: "bg-green-500" },
    { label: "Atendimentos em Grupo" as ModalKey, value: 3, icon: Users, color: "bg-purple-500" },
    { label: "Visitas Domiciliares" as ModalKey, value: 5, icon: Home, color: "bg-orange-500" },
  ];

  const productionData = [
    { date: "23/04/2026", acolhimentos: 8, consultas: 15, grupos: 3, visitas: 5, total: 31 },
    { date: "22/04/2026", acolhimentos: 6, consultas: 18, grupos: 2, visitas: 4, total: 30 },
    { date: "21/04/2026", acolhimentos: 5, consultas: 12, grupos: 3, visitas: 6, total: 26 },
    { date: "20/04/2026", acolhimentos: 7, consultas: 15, grupos: 2, visitas: 3, total: 27 },
    { date: "19/04/2026", acolhimentos: 4, consultas: 20, grupos: 4, visitas: 5, total: 33 },
    { date: "18/04/2026", acolhimentos: 8, consultas: 16, grupos: 3, visitas: 4, total: 31 },
  ];

  const modalDetails: Record<NonNullable<ModalKey>, { patient: string; professional: string; time: string; type?: string }[]> = {
    "Acolhimentos": [
      { patient: "Fernanda Lima", professional: "Enf. Carlos Lima", time: "08:30", type: "Acolhimento Geral" },
      { patient: "Marcos Vinícius", professional: "Dr. João Silva", time: "09:00", type: "Acolhimento AD" },
      { patient: "Beatriz Santos", professional: "Psic. Ana Costa", time: "09:45", type: "Acolhimento Geral" },
      { patient: "Ricardo Alves", professional: "Enf. Carlos Lima", time: "10:15", type: "Acolhimento MT" },
      { patient: "Carla Mendes", professional: "Dr. João Silva", time: "11:00", type: "Acolhimento Geral" },
      { patient: "Paulo Rodrigues", professional: "Psic. Ana Costa", time: "11:30", type: "Acolhimento AD" },
      { patient: "Sofia Carvalho", professional: "Enf. Carlos Lima", time: "13:00", type: "Acolhimento Geral" },
      { patient: "Lucas Martins", professional: "Dr. João Silva", time: "14:00", type: "Acolhimento MT" },
    ],
    "Consultas Individuais": [
      { patient: "Maria Silva Santos", professional: "Dr. João Silva", time: "08:00" },
      { patient: "João Pedro Oliveira", professional: "Psic. Ana Costa", time: "08:30" },
      { patient: "Ana Paula Costa", professional: "Dr. João Silva", time: "09:00" },
      { patient: "Carlos Eduardo Lima", professional: "Psic. Ana Costa", time: "09:30" },
      { patient: "Juliana Ferreira", professional: "Dr. João Silva", time: "10:00" },
      { patient: "Roberto Santos", professional: "Psic. Ana Costa", time: "10:30" },
      { patient: "Mariana Costa", professional: "Dr. João Silva", time: "11:00" },
      { patient: "Fernando Silva", professional: "Psic. Ana Costa", time: "11:30" },
      { patient: "Paula Fernandes", professional: "Dr. João Silva", time: "13:00" },
      { patient: "Ricardo Almeida", professional: "Psic. Ana Costa", time: "13:30" },
      { patient: "Tatiane Oliveira", professional: "Dr. João Silva", time: "14:00" },
      { patient: "Eduardo Lima", professional: "Psic. Ana Costa", time: "14:30" },
      { patient: "Cláudia Borges", professional: "Dr. João Silva", time: "15:00" },
      { patient: "Henrique Sousa", professional: "Psic. Ana Costa", time: "15:30" },
      { patient: "Vanessa Pereira", professional: "Dr. João Silva", time: "16:00" },
    ],
    "Atendimentos em Grupo": [
      { patient: "Grupo Terapêutico - Ansiedade (12 participantes)", professional: "Psic. Ana Costa", time: "09:00" },
      { patient: "Grupo de Familiares (8 participantes)", professional: "Ass. Social Carla Santos", time: "14:00" },
      { patient: "Grupo de Usuários de AD (6 participantes)", professional: "Dr. João Silva", time: "16:00" },
    ],
    "Visitas Domiciliares": [
      { patient: "Roberto Santos Alves", professional: "Enf. Carlos Lima", time: "08:00" },
      { patient: "Paulo Henrique Silva", professional: "Psic. Ana Costa", time: "09:30" },
      { patient: "Fernanda Lima Costa", professional: "Enf. Carlos Lima", time: "11:00" },
      { patient: "Sebastião Ferreira", professional: "TO Maria Souza", time: "13:30" },
      { patient: "Antônia Rodrigues", professional: "Enf. Carlos Lima", time: "15:00" },
    ],
  };

  const applyFilter = () => {
    const fmt = (s: string) => {
      const d = new Date(s + "T00:00:00");
      return d.toLocaleDateString("pt-BR");
    };
    setAppliedFilter({ from: fmt(filterFrom), to: fmt(filterTo) });
    setShowFilterModal(false);
  };

  const handleExport = () => {
    const rows = [
      ["Data", "Acolhimentos", "Consultas", "Grupos", "Visitas", "Total"],
      ...productionData.map(r => [r.date, r.acolhimentos, r.consultas, r.grupos, r.visitas, r.total]),
    ];
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "producao_diaria.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Produção Diária</h1>
          <p className="text-muted-foreground mt-1">Relatórios e indicadores de atendimento</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilterModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-all"
          >
            <Calendar className="w-5 h-5" />
            Filtrar Período
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all"
          >
            <Download className="w-5 h-5" />
            Exportar CSV
          </button>
        </div>
      </div>

      {(appliedFilter.from || appliedFilter.to) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg w-fit">
          <Calendar className="w-4 h-4" />
          Período: {appliedFilter.from} a {appliedFilter.to}
        </div>
      )}

      <div className="bg-gradient-to-r from-primary to-secondary rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 mb-1">Produção de Hoje</p>
            <p className="text-4xl font-semibold">31 atendimentos</p>
            <p className="text-white/80 mt-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              +15% em relação à média semanal
            </p>
          </div>
          <BarChart3 className="w-24 h-24 text-white/20" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <button
              key={stat.label}
              onClick={() => setActiveModal(stat.label)}
              className="bg-card rounded-xl border border-border p-6 text-left hover:shadow-lg hover:border-primary/50 transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-semibold text-foreground">{stat.value}</span>
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-xs text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Ver detalhes →</p>
            </button>
          );
        })}
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-semibold text-foreground mb-6">Histórico de Produção (Últimos 6 Dias)</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-foreground">Data</th>
                <th className="text-center py-3 px-4 font-medium text-foreground">Acolhimentos</th>
                <th className="text-center py-3 px-4 font-medium text-foreground">Consultas</th>
                <th className="text-center py-3 px-4 font-medium text-foreground">Grupos</th>
                <th className="text-center py-3 px-4 font-medium text-foreground">Visitas</th>
                <th className="text-center py-3 px-4 font-medium text-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {productionData.map((row, index) => (
                <tr key={index} className="border-b border-border hover:bg-muted/50 transition-all">
                  <td className="py-4 px-4 text-foreground font-medium">{row.date}</td>
                  <td className="py-4 px-4 text-center"><span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-medium">{row.acolhimentos}</span></td>
                  <td className="py-4 px-4 text-center"><span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-medium">{row.consultas}</span></td>
                  <td className="py-4 px-4 text-center"><span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-medium">{row.grupos}</span></td>
                  <td className="py-4 px-4 text-center"><span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-medium">{row.visitas}</span></td>
                  <td className="py-4 px-4 text-center"><span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold">{row.total}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">Atendimentos por Profissional</h3>
        <div className="space-y-3">
          {[
            { name: "Dr. João Silva", role: "Médico Psiquiatra", count: 12 },
            { name: "Psic. Ana Costa", role: "Psicóloga", count: 8 },
            { name: "Enf. Carlos Lima", role: "Enfermeiro", count: 6 },
            { name: "TO Maria Souza", role: "Terapeuta Ocupacional", count: 5 },
          ].map((prof, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium text-foreground">{prof.name}</p>
                <p className="text-sm text-muted-foreground">{prof.role}</p>
              </div>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full font-semibold">{prof.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de detalhes dos dashboards */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setActiveModal(null)}>
          <div className="bg-card rounded-xl border border-border p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-foreground">{activeModal}</h3>
                <p className="text-sm text-muted-foreground mt-1">Hoje — {productionData[0].date}</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-muted rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {modalDetails[activeModal].map((item, idx) => (
                <div key={idx} className="p-3 bg-muted/50 rounded-lg flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">{item.patient}</p>
                    <p className="text-xs text-muted-foreground">{item.professional}{item.type ? ` · ${item.type}` : ""}</p>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground flex-shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-6 pt-4 border-t border-border">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-all">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de filtro de período */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowFilterModal(false)}>
          <div className="bg-card rounded-xl border border-border p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-foreground">Filtrar Período</h3>
              <button onClick={() => setShowFilterModal(false)} className="p-2 hover:bg-muted rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Data Inicial</label>
                <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Data Final</label>
                <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="flex gap-3 pt-4 mt-4 border-t border-border">
              <button onClick={() => setShowFilterModal(false)} className="flex-1 py-2.5 border border-border rounded-lg font-medium hover:bg-muted transition-all">Cancelar</button>
              <button onClick={applyFilter} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all">Aplicar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
