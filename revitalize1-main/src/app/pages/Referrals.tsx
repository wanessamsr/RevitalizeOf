import { ArrowRightLeft, Plus, Building2, FileText, CheckCircle, X, Eye, Save, Send, PenLine, Edit2, Trash2 } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

type Referral = {
  id: number;
  patient: string;
  cpf: string;
  from: string;
  to: string;
  reason: string;
  observations: string;
  date: string;
  status: "Pendente" | "Em Andamento" | "Concluído" | "Rascunho";
  professional: string;
  signature?: string; // base64 data URL
};

type ModalMode = "details" | "stats" | "signature" | null;

// ─── Signature Pad ────────────────────────────────────────────────────────────
function SignaturePad({
  onConfirm,
  onCancel,
  existingSignature,
}: {
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
  existingSignature?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(!existingSignature);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (existingSignature) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = existingSignature;
    }
  }, [existingSignature]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getPos(e, canvas);
    setIsEmpty(false);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext("2d");
    if (!ctx || !lastPos.current) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#0A1433";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = () => {
    isDrawing.current = false;
    lastPos.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const confirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    onConfirm(canvas.toDataURL("image/png"));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Assine dentro da área abaixo usando o mouse ou toque na tela
        </p>
        <button
          type="button"
          onClick={clearCanvas}
          className="flex items-center gap-1 text-sm text-red-500 hover:underline"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Limpar
        </button>
      </div>

      <div className="border-2 border-border rounded-xl overflow-hidden bg-white cursor-crosshair touch-none select-none">
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="w-full"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>

      <p className="text-center text-xs text-muted-foreground border-t border-dashed border-border pt-2">
        Assinatura do Profissional Responsável
      </p>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 border border-border rounded-lg font-medium hover:bg-muted transition-all"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={isEmpty}
          className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <PenLine className="w-4 h-4" />
          Confirmar Assinatura
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Referrals() {
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [signatureTarget, setSignatureTarget] = useState<number | null>(null); // referral id being signed
  const [pendingEmit, setPendingEmit] = useState(false); // signature step after form submit
  const formRef = useRef<HTMLDivElement>(null);
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    patient: "",
    date: new Date().toISOString().split("T")[0],
    destination: "",
    reason: "",
    observations: "",
  });

  const [referrals, setReferrals] = useState<Referral[]>([
    { id: 1, patient: "Maria Silva Santos", cpf: "123.456.789-00", from: "CAPS Ceres", to: "CRAS - Centro", reason: "Necessidade de acompanhamento social e assistencial", observations: "", date: "23/04/2026", status: "Pendente", professional: "Ass. Social Carla Santos" },
    { id: 2, patient: "João Pedro Oliveira", cpf: "234.567.890-11", from: "CAPS Ceres", to: "CREAS - Especializado", reason: "Violação de direitos - necessidade de proteção especial", observations: "", date: "22/04/2026", status: "Em Andamento", professional: "Ass. Social Carla Santos" },
    { id: 3, patient: "Roberto Santos Alves", cpf: "678.901.234-55", from: "CAPS Ceres", to: "PSF - Unidade Básica Central", reason: "Acompanhamento clínico de condições físicas associadas", observations: "", date: "20/04/2026", status: "Concluído", professional: "Dr. João Silva", signature: undefined },
  ]);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedStat(null);
    setSelectedReferral(null);
    setPendingEmit(false);
    setSignatureTarget(null);
  };

  const openDetails = (r: Referral) => {
    setSelectedReferral(r);
    setModalMode("details");
  };

  const openSignatureForReferral = (r: Referral) => {
    setSelectedReferral(r);
    setSignatureTarget(r.id);
    setPendingEmit(false);
    setModalMode("signature");
  };

  const clearForm = () => {
    setFormData({ patient: "", date: new Date().toISOString().split("T")[0], destination: "", reason: "", observations: "" });
    setEditingDraftId(null);
  };

  const saveDraft = () => {
    if (!formData.patient || !formData.destination) {
      alert("Informe o paciente e o destino antes de salvar o rascunho.");
      return;
    }
    if (editingDraftId !== null) {
      // Update existing draft
      setReferrals(prev => prev.map(r => r.id === editingDraftId ? {
        ...r,
        patient: formData.patient,
        to: formData.destination,
        reason: formData.reason,
        observations: formData.observations,
        date: new Date(formData.date + "T00:00:00").toLocaleDateString("pt-BR"),
      } : r));
    } else {
      const newId = Math.max(...referrals.map(r => r.id), 0) + 1;
      setReferrals(prev => [...prev, {
        id: newId,
        patient: formData.patient,
        cpf: "",
        from: "CAPS Ceres",
        to: formData.destination,
        reason: formData.reason,
        observations: formData.observations,
        date: new Date(formData.date + "T00:00:00").toLocaleDateString("pt-BR"),
        status: "Rascunho",
        professional: "Usuário atual",
      }]);
    }
    clearForm();
  };

  const handleEmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patient || !formData.destination || !formData.reason) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }
    // Open signature modal before saving
    setPendingEmit(true);
    setSignatureTarget(null);
    setModalMode("signature");
  };

  const onSignatureConfirmed = (dataUrl: string) => {
    if (pendingEmit) {
      // Emit new referral with signature
      const newId = Math.max(...referrals.map(r => r.id), 0) + 1;
      const newReferral: Referral = {
        id: newId,
        patient: formData.patient,
        cpf: "",
        from: "CAPS Ceres",
        to: formData.destination,
        reason: formData.reason,
        observations: formData.observations,
        date: new Date(formData.date + "T00:00:00").toLocaleDateString("pt-BR"),
        status: "Pendente",
        professional: "Usuário atual",
        signature: dataUrl,
      };
      if (editingDraftId !== null) {
        setReferrals(prev => prev.map(r => r.id === editingDraftId ? { ...newReferral, id: editingDraftId } : r));
      } else {
        setReferrals(prev => [...prev, newReferral]);
      }
      clearForm();
    } else if (signatureTarget !== null) {
      // Sign an existing referral
      setReferrals(prev => prev.map(r => r.id === signatureTarget ? { ...r, signature: dataUrl } : r));
    }
    closeModal();
  };

  const editDraft = (r: Referral) => {
    setFormData({
      patient: r.patient,
      date: (() => {
        const [d, m, y] = r.date.split("/");
        return `${y}-${m}-${d}`;
      })(),
      destination: r.to,
      reason: r.reason,
      observations: r.observations,
    });
    setEditingDraftId(r.id);
    scrollToForm();
  };

  const deleteDraft = (id: number) => {
    setReferrals(prev => prev.filter(r => r.id !== id));
    if (editingDraftId === id) clearForm();
  };

  const handleStatClick = (label: string) => {
    setSelectedStat(label);
    setModalMode("stats");
  };

  const getStatsContent = () => {
    if (selectedStat === "Total este Mês") return (
      <div className="space-y-3">
        {[
          { patient: "Maria Silva Santos", to: "CRAS - Centro", date: "23/04" },
          { patient: "João Pedro Oliveira", to: "CREAS", date: "22/04" },
          { patient: "Roberto Santos Alves", to: "PSF Central", date: "20/04" },
          { patient: "Ana Paula Costa", to: "UBS", date: "18/04" },
        ].map((item, idx) => (
          <div key={idx} className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="font-medium text-foreground">{item.patient}</p>
              <span className="text-sm text-muted-foreground">{item.date}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Destino: {item.to}</p>
          </div>
        ))}
      </div>
    );
    if (selectedStat === "Em Andamento") return (
      <div className="space-y-3">
        {[
          { patient: "João Pedro Oliveira", to: "CREAS", since: "22/04" },
          { patient: "Paula Fernandes", to: "CRAS", since: "19/04" },
          { patient: "Ricardo Almeida", to: "Hospital Regional", since: "17/04" },
        ].map((item, idx) => (
          <div key={idx} className="p-3 bg-muted/50 rounded-lg border-l-4 border-yellow-500">
            <p className="font-medium text-foreground">{item.patient}</p>
            <p className="text-sm text-muted-foreground mt-1">Para: {item.to}</p>
            <p className="text-xs text-muted-foreground mt-1">Desde: {item.since}</p>
          </div>
        ))}
      </div>
    );
    if (selectedStat === "Concluídos") return (
      <div className="space-y-3">
        {[
          { patient: "Roberto Santos Alves", to: "PSF Central", completed: "20/04" },
          { patient: "Mariana Costa", to: "CRAS", completed: "18/04" },
          { patient: "Fernando Silva", to: "UBS Norte", completed: "15/04" },
        ].map((item, idx) => (
          <div key={idx} className="p-3 bg-muted/50 rounded-lg border-l-4 border-green-500">
            <p className="font-medium text-foreground">{item.patient}</p>
            <p className="text-sm text-muted-foreground mt-1">Para: {item.to}</p>
            <div className="flex items-center gap-2 mt-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <p className="text-xs text-muted-foreground">Concluído em {item.completed}</p>
            </div>
          </div>
        ))}
      </div>
    );
    return null;
  };

  const statusColors: Record<string, string> = {
    "Concluído": "bg-green-100 text-green-700",
    "Em Andamento": "bg-blue-100 text-blue-700",
    "Pendente": "bg-yellow-100 text-yellow-700",
    "Rascunho": "bg-gray-100 text-gray-600",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Encaminhamentos</h1>
          <p className="text-muted-foreground mt-1">Integração com a rede de assistência</p>
        </div>
        <button
          onClick={scrollToForm}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all"
        >
          <Plus className="w-5 h-5" />
          Novo Encaminhamento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Total este Mês", value: referrals.filter(r => r.status !== "Rascunho").length + 25, color: "from-blue-500 to-blue-600", icon: ArrowRightLeft },
          { label: "Em Andamento", value: referrals.filter(r => r.status === "Em Andamento").length + 11, color: "from-yellow-500 to-yellow-600", icon: FileText },
          { label: "Concluídos", value: referrals.filter(r => r.status === "Concluído").length + 15, color: "from-green-500 to-green-600", icon: CheckCircle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} onClick={() => handleStatClick(label)} className={`bg-gradient-to-br ${color} rounded-xl p-6 text-white cursor-pointer hover:shadow-xl transition-all`}>
            <Icon className="w-10 h-10 mb-4" />
            <p className="text-3xl font-semibold">{value}</p>
            <p className="text-white/80 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {referrals.map((referral) => (
          <div
            key={referral.id}
            className={`bg-card rounded-xl border p-6 hover:shadow-lg transition-all ${
              referral.status === "Rascunho" ? "border-dashed border-gray-300 opacity-80" : "border-border"
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium flex-shrink-0">
                  {referral.patient.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-foreground text-lg">{referral.patient}</h3>
                    {referral.status === "Rascunho" && (
                      <span className="text-xs text-muted-foreground italic">rascunho</span>
                    )}
                  </div>
                  {referral.cpf && <p className="text-sm text-muted-foreground">CPF: {referral.cpf}</p>}

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Origem</p>
                      <p className="font-medium text-foreground flex items-center gap-2"><Building2 className="w-4 h-4" />{referral.from}</p>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Destino</p>
                      <p className="font-medium text-foreground flex items-center gap-2"><Building2 className="w-4 h-4" />{referral.to}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-1">Motivo do Encaminhamento</p>
                    <p className="text-sm text-foreground">{referral.reason || <span className="italic text-muted-foreground">Não informado</span>}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span><strong>Data:</strong> {referral.date}</span>
                    {referral.professional && <span><strong>Responsável:</strong> {referral.professional}</span>}
                  </div>

                  {/* Signature indicator */}
                  {referral.signature && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg w-fit">
                      <PenLine className="w-3.5 h-3.5" />
                      Assinatura digital coletada
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[referral.status] || "bg-gray-100 text-gray-700"}`}>
                  {referral.status}
                </span>

                {referral.status === "Rascunho" ? (
                  <div className="flex flex-col gap-2 w-full">
                    <button
                      onClick={() => editDraft(referral)}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all flex items-center gap-2 justify-center"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar Rascunho
                    </button>
                    <button
                      onClick={() => deleteDraft(referral.id)}
                      className="px-4 py-2 border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-all flex items-center gap-2 justify-center text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => openDetails(referral)}
                      className="px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-all flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Ver Detalhes
                    </button>
                    <button
                      onClick={() => openSignatureForReferral(referral)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                        referral.signature
                          ? "border border-green-300 text-green-700 hover:bg-green-50"
                          : "border border-primary/50 text-primary hover:bg-primary/5"
                      }`}
                    >
                      <PenLine className="w-4 h-4" />
                      {referral.signature ? "Re-assinar" : "Assinar"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Form */}
      <div ref={formRef} className="bg-card rounded-xl border border-border p-6 scroll-mt-6">
        <h2 className="font-semibold text-foreground mb-6 flex items-center gap-2">
          {editingDraftId !== null ? (
            <><Edit2 className="w-5 h-5" /> Editar Rascunho</>
          ) : (
            <><Plus className="w-5 h-5" /> Novo Encaminhamento</>
          )}
        </h2>

        {editingDraftId !== null && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            Você está editando um rascunho. As alterações serão salvas ao clicar em "Salvar Rascunho" ou finalizadas ao "Emitir Encaminhamento".
          </div>
        )}

        <form onSubmit={handleEmitClick} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Paciente *</label>
              <select
                value={formData.patient}
                onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
                className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selecione o paciente...</option>
                <option>Maria Silva Santos</option>
                <option>João Pedro Oliveira</option>
                <option>Ana Paula Costa</option>
                <option>Carlos Eduardo Lima</option>
                <option>Juliana Ferreira Souza</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Data do Encaminhamento *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="bg-muted/50 p-6 rounded-lg space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5" />
              Unidades de Referência
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Origem *</label>
                <input type="text" value="CAPS Ceres" readOnly className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg opacity-60" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Destino *</label>
                <select
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Selecione...</option>
                  <option>CRAS - Centro de Referência de Assistência Social</option>
                  <option>CREAS - Centro de Referência Especializado</option>
                  <option>PSF - Programa Saúde da Família</option>
                  <option>UBS - Unidade Básica de Saúde</option>
                  <option>Hospital Regional</option>
                  <option>Outro</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Motivo do Encaminhamento *</label>
            <textarea
              rows={4}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Descreva detalhadamente o motivo do encaminhamento e as necessidades do paciente..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Observações Adicionais</label>
            <textarea
              rows={3}
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Informações complementares relevantes para a unidade de destino..."
            />
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={clearForm}
              className="px-6 py-2.5 border border-border rounded-lg font-medium hover:bg-muted transition-all flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
            <button
              type="button"
              onClick={saveDraft}
              className="px-6 py-2.5 border border-border rounded-lg font-medium hover:bg-muted transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Salvar Rascunho
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Emitir Encaminhamento
            </button>
          </div>
        </form>
      </div>

      {/* Modals */}
      {(modalMode === "stats" || modalMode === "details" || modalMode === "signature") && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={modalMode === "signature" ? undefined : closeModal}
        >
          <div
            className="bg-card rounded-xl border border-border p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-xl font-semibold text-foreground">
                {modalMode === "stats" && selectedStat}
                {modalMode === "details" && selectedReferral?.patient}
                {modalMode === "signature" && "Assinatura Digital do Profissional"}
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

            {modalMode === "details" && selectedReferral && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Origem</p>
                    <p className="font-medium text-foreground flex items-center gap-2"><Building2 className="w-4 h-4" />{selectedReferral.from}</p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Destino</p>
                    <p className="font-medium text-foreground flex items-center gap-2"><Building2 className="w-4 h-4" />{selectedReferral.to}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Motivo</p>
                  <p className="text-sm text-foreground">{selectedReferral.reason}</p>
                </div>
                {selectedReferral.observations && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm text-foreground">{selectedReferral.observations}</p>
                  </div>
                )}

                {/* Signature area in details */}
                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-medium text-foreground mb-3">Assinatura Digital</p>
                  {selectedReferral.signature ? (
                    <div className="border border-border rounded-xl overflow-hidden bg-white p-2">
                      <img src={selectedReferral.signature} alt="Assinatura digital" className="max-h-28 mx-auto" />
                      <p className="text-center text-xs text-muted-foreground mt-2 border-t border-dashed border-border pt-2">
                        {selectedReferral.professional}
                      </p>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center text-muted-foreground">
                      <PenLine className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Assinatura não coletada</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button onClick={closeModal} className="px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-all">Fechar</button>
                  <button
                    onClick={() => openSignatureForReferral(selectedReferral)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all flex items-center gap-2"
                  >
                    <PenLine className="w-4 h-4" />
                    {selectedReferral.signature ? "Re-assinar" : "Coletar Assinatura"}
                  </button>
                </div>
              </div>
            )}

            {modalMode === "signature" && (
              <SignaturePad
                onConfirm={onSignatureConfirmed}
                onCancel={closeModal}
                existingSignature={
                  signatureTarget !== null
                    ? referrals.find(r => r.id === signatureTarget)?.signature
                    : undefined
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
