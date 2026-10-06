import { UsersRound, Plus, Calendar, CheckSquare } from "lucide-react";
import { useState } from "react";

export default function GroupSession() {
  const [selectedPatients, setSelectedPatients] = useState<number[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedStat, setSelectedStat] = useState<string | null>(null);

  const handleStatClick = (label: string) => {
    setSelectedStat(label);
    setShowModal(true);
  };

  const getModalContent = () => {
    if (selectedStat === "Grupos este Mês") {
      return (
        <div className="space-y-3">
          {[
            { name: "Grupo Terapêutico - Ansiedade", date: "23/04", participants: 8 },
            { name: "Grupo de Acolhimento", date: "22/04", participants: 12 },
            { name: "Grupo de Familiares", date: "21/04", participants: 15 },
            { name: "Grupo - Dependência Química", date: "20/04", participants: 6 },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium text-foreground">{item.name}</p>
                <p className="text-sm text-muted-foreground">Data: {item.date}</p>
              </div>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                {item.participants} participantes
              </span>
            </div>
          ))}
        </div>
      );
    } else if (selectedStat === "Participações Totais") {
      return (
        <div className="space-y-3">
          {[
            { patient: "Maria Silva Santos", count: 24 },
            { patient: "João Pedro Oliveira", count: 18 },
            { patient: "Ana Paula Costa", count: 16 },
            { patient: "Carlos Eduardo Lima", count: 14 },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <p className="font-medium text-foreground">{item.patient}</p>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                {item.count} sessões
              </span>
            </div>
          ))}
        </div>
      );
    } else if (selectedStat === "Grupos Agendados") {
      return (
        <div className="space-y-3">
          {[
            { name: "Grupo Ansiedade", date: "Segunda 26/04", time: "09:00" },
            { name: "Grupo Familiares", date: "Terça 27/04", time: "14:00" },
            { name: "Grupo Depressão", date: "Quarta 28/04", time: "10:00" },
            { name: "Grupo Acolhimento", date: "Quinta 29/04", time: "15:00" },
            { name: "Grupo Dependência", date: "Sexta 30/04", time: "11:00" },
          ].map((item, idx) => (
            <div key={idx} className="p-3 bg-muted/50 rounded-lg">
              <p className="font-medium text-foreground">{item.name}</p>
              <p className="text-sm text-muted-foreground">{item.date} às {item.time}</p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const availablePatients = [
    { id: 1, name: "Maria Silva Santos", diagnosis: "F32 - Episódio Depressivo" },
    { id: 2, name: "João Pedro Oliveira", diagnosis: "F20 - Esquizofrenia" },
    { id: 3, name: "Ana Paula Costa", diagnosis: "F41 - Outros Transtornos Ansiosos" },
    { id: 4, name: "Carlos Eduardo Lima", diagnosis: "F31 - Transtorno Afetivo Bipolar" },
    { id: 5, name: "Juliana Ferreira Souza", diagnosis: "F10 - Transtornos Uso de Álcool" },
    { id: 6, name: "Roberto Santos Alves", diagnosis: "F33 - Transtorno Depressivo Recorrente" },
  ];

  const togglePatient = (id: number) => {
    setSelectedPatients(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Atendimento em Grupo</h1>
        <p className="text-muted-foreground mt-1">Registro de sessões terapêuticas coletivas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          onClick={() => handleStatClick("Grupos este Mês")}
          className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white cursor-pointer hover:shadow-xl transition-all"
        >
          <UsersRound className="w-10 h-10 mb-4" />
          <p className="text-3xl font-semibold">18</p>
          <p className="text-white/80 mt-1">Grupos este Mês</p>
        </div>
        <div
          onClick={() => handleStatClick("Participações Totais")}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white cursor-pointer hover:shadow-xl transition-all"
        >
          <Calendar className="w-10 h-10 mb-4" />
          <p className="text-3xl font-semibold">142</p>
          <p className="text-white/80 mt-1">Participações Totais</p>
        </div>
        <div
          onClick={() => handleStatClick("Grupos Agendados")}
          className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl p-6 text-white cursor-pointer hover:shadow-xl transition-all"
        >
          <CheckSquare className="w-10 h-10 mb-4" />
          <p className="text-3xl font-semibold">5</p>
          <p className="text-white/80 mt-1">Grupos Agendados</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-semibold text-foreground mb-6 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Novo Atendimento em Grupo
        </h2>

        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Tipo de Grupo *</label>
              <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                <option>Selecione...</option>
                <option>Grupo Terapêutico - Ansiedade</option>
                <option>Grupo Terapêutico - Depressão</option>
                <option>Grupo de Acolhimento</option>
                <option>Grupo de Familiares</option>
                <option>Grupo de Dependência Química</option>
                <option>Outro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Facilitador(es) *</label>
              <input
                type="text"
                placeholder="Nome do profissional"
                className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Data *</label>
              <input
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Horário *</label>
              <input
                type="time"
                defaultValue={new Date().toTimeString().slice(0, 5)}
                className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="bg-muted/50 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Selecionar Participantes *</h3>
              <span className="text-sm text-muted-foreground">
                {selectedPatients.length} selecionado(s)
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
              {availablePatients.map((patient) => (
                <label
                  key={patient.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedPatients.includes(patient.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPatients.includes(patient.id)}
                    onChange={() => togglePatient(patient.id)}
                    className="mt-1 w-5 h-5 rounded border-input"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{patient.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{patient.diagnosis}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Tema da Sessão</label>
            <input
              type="text"
              placeholder="Ex: Estratégias de enfrentamento da ansiedade"
              className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Registro da Sessão *
            </label>
            <textarea
              rows={8}
              className="w-full px-4 py-3 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono text-sm"
              placeholder="Descreva a dinâmica do grupo, participação dos pacientes, temas abordados e observações relevantes...&#10;&#10;Exemplo:&#10;Grupo terapêutico focado em ansiedade com participação de 6 pacientes. Discussão sobre técnicas de respiração e mindfulness. Pacientes compartilharam experiências e estratégias de enfrentamento. Boa participação e interação entre os membros."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              className="px-6 py-2.5 border border-border rounded-lg font-medium hover:bg-muted transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all"
            >
              Salvar Atendimento
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Detalhes */}
      {showModal && selectedStat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-card rounded-xl border border-border p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-xl font-semibold text-foreground">{selectedStat}</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {getModalContent()}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
