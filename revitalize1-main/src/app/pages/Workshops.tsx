import { Palette, Plus, Calendar, Users, Image, X, Edit2, Eye, Upload, Trash2 } from "lucide-react";
import { useState, useRef } from "react";

type Workshop = {
  id: number;
  name: string;
  date: string;
  time: string;
  participants: number;
  facilitator: string;
  description: string;
  photos: string[];
};

type ModalMode = "stats" | "details" | "edit" | "new" | null;

export default function Workshops() {
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [editForm, setEditForm] = useState<Partial<Workshop>>({});
  const [newForm, setNewForm] = useState({ name: "", facilitator: "", date: "", time: "", description: "" });
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([
    { id: 1, name: "Oficina de Arte", date: "23/04/2026", time: "14:00", participants: 12, facilitator: "TO Maria Souza", description: "Expressão artística através de pintura e desenho", photos: [] },
    { id: 2, name: "Grupo de Música", date: "22/04/2026", time: "10:00", participants: 8, facilitator: "Musicoterapeuta João Carlos", description: "Prática musical e expressão através do som", photos: [] },
    { id: 3, name: "Artesanato Terapêutico", date: "21/04/2026", time: "15:00", participants: 15, facilitator: "TO Maria Souza", description: "Confecção de peças artesanais", photos: [] },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const newPhotoRef = useRef<HTMLInputElement>(null);

  const closeModal = () => {
    setModalMode(null);
    setSelectedStat(null);
    setSelectedWorkshop(null);
    setEditForm({});
    setUploadedPhotos([]);
  };

  const handleStatClick = (label: string) => {
    setSelectedStat(label);
    setModalMode("stats");
  };

  const openDetails = (w: Workshop) => {
    setSelectedWorkshop(w);
    setModalMode("details");
  };

  const openEdit = (w: Workshop) => {
    setSelectedWorkshop(w);
    setEditForm({ ...w });
    setModalMode("edit");
  };

  const openNew = () => {
    setNewForm({ name: "", facilitator: "", date: "", time: "", description: "" });
    setUploadedPhotos([]);
    setModalMode("new");
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, target: "edit" | "new") => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        if (target === "new") {
          setUploadedPhotos(prev => [...prev, url]);
        } else {
          setEditForm(prev => ({ ...prev, photos: [...(prev.photos || []), url] }));
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const saveEdit = () => {
    if (!selectedWorkshop) return;
    setWorkshops(ws => ws.map(w => w.id === selectedWorkshop.id ? { ...w, ...editForm } as Workshop : w));
    closeModal();
  };

  const saveNew = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = Math.max(...workshops.map(w => w.id), 0) + 1;
    setWorkshops(prev => [...prev, {
      id: newId,
      name: newForm.name,
      facilitator: newForm.facilitator,
      date: newForm.date ? new Date(newForm.date).toLocaleDateString("pt-BR") : "",
      time: newForm.time,
      description: newForm.description,
      participants: 0,
      photos: uploadedPhotos,
    }]);
    closeModal();
  };

  const getStatsContent = () => {
    if (selectedStat === "Oficinas este Mês") return (
      <div className="space-y-3">
        {[
          { name: "Oficina de Arte", date: "23/04", participants: 12 },
          { name: "Grupo de Música", date: "22/04", participants: 8 },
          { name: "Artesanato", date: "21/04", participants: 15 },
          { name: "Teatro Terapêutico", date: "20/04", participants: 10 },
          { name: "Dança Circular", date: "19/04", participants: 14 },
        ].map((item, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div><p className="font-medium text-foreground">{item.name}</p><p className="text-sm text-muted-foreground">Data: {item.date}</p></div>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">{item.participants} participantes</span>
          </div>
        ))}
      </div>
    );
    if (selectedStat === "Participações Totais") return (
      <div className="space-y-3">
        {[
          { patient: "Maria Silva Santos", count: 18 },
          { patient: "João Pedro Oliveira", count: 15 },
          { patient: "Ana Paula Costa", count: 12 },
          { patient: "Carlos Eduardo Lima", count: 10 },
        ].map((item, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <p className="font-medium text-foreground">{item.patient}</p>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{item.count} participações</span>
          </div>
        ))}
      </div>
    );
    if (selectedStat === "Agendadas p/ Semana") return (
      <div className="space-y-3">
        {[
          { name: "Oficina de Arte", date: "Segunda-feira 26/04", time: "14:00" },
          { name: "Grupo de Música", date: "Quarta-feira 28/04", time: "10:00" },
          { name: "Artesanato", date: "Sexta-feira 30/04", time: "15:00" },
        ].map((item, idx) => (
          <div key={idx} className="p-3 bg-muted/50 rounded-lg">
            <p className="font-medium text-foreground">{item.name}</p>
            <p className="text-sm text-muted-foreground">{item.date} às {item.time}</p>
          </div>
        ))}
      </div>
    );
    return null;
  };

  const PhotoGrid = ({ photos }: { photos: string[] }) => (
    photos.length > 0 ? (
      <div className="grid grid-cols-3 gap-2 mt-4">
        {photos.map((src, i) => (
          <img key={i} src={src} alt={`Foto ${i + 1}`} className="rounded-lg object-cover w-full h-24" />
        ))}
      </div>
    ) : <p className="text-sm text-muted-foreground mt-2">Nenhuma foto registrada.</p>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Oficinas Terapêuticas</h1>
          <p className="text-muted-foreground mt-1">Gestão e registro de atividades em grupo</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all"
        >
          <Plus className="w-5 h-5" />
          Nova Oficina
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { label: "Oficinas este Mês", value: workshops.length + 21, color: "from-purple-500 to-purple-600", icon: Palette },
          { label: "Participações Totais", value: workshops.reduce((s, w) => s + w.participants, 0) + 111, color: "from-blue-500 to-blue-600", icon: Users },
          { label: "Agendadas p/ Semana", value: 3, color: "from-green-500 to-green-600", icon: Calendar },
        ].map(({ label, value, color, icon: Icon }) => (
          <div
            key={label}
            onClick={() => handleStatClick(label)}
            className={`bg-gradient-to-br ${color} rounded-xl p-6 text-white cursor-pointer hover:shadow-xl transition-all`}
          >
            <Icon className="w-10 h-10 mb-4" />
            <p className="text-3xl font-semibold">{value}</p>
            <p className="text-white/80 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {workshops.map((workshop) => (
          <div key={workshop.id} className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-all">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <Palette className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-foreground text-lg">{workshop.name}</h3>
                    {workshop.photos.length > 0 && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                        <Image className="w-3 h-3" />
                        {workshop.photos.length} foto(s)
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{workshop.description}</p>
                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{workshop.date} às {workshop.time}</span>
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" />{workshop.participants} participantes</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Facilitador: {workshop.facilitator}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openDetails(workshop)}
                  className="px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-all flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Ver Detalhes
                </button>
                <button
                  onClick={() => openEdit(workshop)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-card rounded-xl border border-border p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-xl font-semibold text-foreground">
                {modalMode === "stats" && selectedStat}
                {modalMode === "details" && selectedWorkshop?.name}
                {modalMode === "edit" && `Editar: ${selectedWorkshop?.name}`}
                {modalMode === "new" && "Nova Oficina Terapêutica"}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-muted rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalMode === "stats" && (
              <>
                {getStatsContent()}
                <div className="flex justify-end mt-6 pt-4 border-t border-border">
                  <button onClick={closeModal} className="px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-all">Fechar</button>
                </div>
              </>
            )}

            {modalMode === "details" && selectedWorkshop && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-muted-foreground">Data</p><p className="font-medium">{selectedWorkshop.date} às {selectedWorkshop.time}</p></div>
                  <div><p className="text-muted-foreground">Participantes</p><p className="font-medium">{selectedWorkshop.participants}</p></div>
                  <div className="col-span-2"><p className="text-muted-foreground">Facilitador</p><p className="font-medium">{selectedWorkshop.facilitator}</p></div>
                  <div className="col-span-2"><p className="text-muted-foreground">Descrição</p><p className="font-medium">{selectedWorkshop.description}</p></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Fotos da Oficina</p>
                  <PhotoGrid photos={selectedWorkshop.photos} />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button onClick={closeModal} className="px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-all">Fechar</button>
                  <button onClick={() => openEdit(selectedWorkshop)} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all">Editar</button>
                </div>
              </div>
            )}

            {modalMode === "edit" && editForm && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Nome da Oficina</label>
                    <input type="text" value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Facilitador</label>
                    <input type="text" value={editForm.facilitator || ""} onChange={(e) => setEditForm({ ...editForm, facilitator: e.target.value })} className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Horário</label>
                    <input type="time" value={editForm.time || ""} onChange={(e) => setEditForm({ ...editForm, time: e.target.value })} className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Participantes</label>
                    <input type="number" value={editForm.participants || 0} onChange={(e) => setEditForm({ ...editForm, participants: parseInt(e.target.value) })} className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Descrição</label>
                  <textarea rows={3} value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Fotos</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-all cursor-pointer"
                  >
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Clique para adicionar fotos</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG até 10MB</p>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handlePhotoUpload(e, "edit")} />
                  </div>
                  <PhotoGrid photos={editForm.photos || []} />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button onClick={closeModal} className="px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-all">Cancelar</button>
                  <button onClick={saveEdit} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all">Salvar Alterações</button>
                </div>
              </div>
            )}

            {modalMode === "new" && (
              <form onSubmit={saveNew} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Nome da Oficina *</label>
                    <input required type="text" placeholder="Ex: Oficina de Arte" value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Facilitador *</label>
                    <input required type="text" placeholder="Nome do profissional" value={newForm.facilitator} onChange={(e) => setNewForm({ ...newForm, facilitator: e.target.value })} className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Data *</label>
                    <input required type="date" value={newForm.date} onChange={(e) => setNewForm({ ...newForm, date: e.target.value })} className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Horário *</label>
                    <input required type="time" value={newForm.time} onChange={(e) => setNewForm({ ...newForm, time: e.target.value })} className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Descrição da Atividade</label>
                  <textarea rows={3} placeholder="Descreva a proposta terapêutica da oficina..." value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Upload de Fotos</label>
                  <div
                    onClick={() => newPhotoRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-all cursor-pointer"
                  >
                    <Image className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Clique para adicionar fotos da oficina</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG até 10MB</p>
                    <input ref={newPhotoRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handlePhotoUpload(e, "new")} />
                  </div>
                  {uploadedPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {uploadedPhotos.map((src, i) => (
                        <div key={i} className="relative group">
                          <img src={src} alt={`Preview ${i + 1}`} className="rounded-lg object-cover w-full h-24" />
                          <button
                            type="button"
                            onClick={() => setUploadedPhotos(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button type="button" onClick={closeModal} className="px-6 py-2.5 border border-border rounded-lg font-medium hover:bg-muted transition-all">Cancelar</button>
                  <button type="submit" className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all">Salvar Oficina</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
