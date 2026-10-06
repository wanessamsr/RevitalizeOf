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
