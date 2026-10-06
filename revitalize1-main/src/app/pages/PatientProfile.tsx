import { useParams, Link } from "react-router";
import { ArrowLeft, FileText, Calendar, Pill, User, AlertCircle, EyeOff, PlusCircle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  PATIENT_STATUS_LABELS,
  ageFrom,
  createAddendum,
  formatDateBR,
  formatDateTimeBR,
  getEvolutions,
  getPatient,
  initials,
  updatePatientStatus,
  type Evolution,
  type PatientDetail,
  type PatientStatus,
} from "../api";
import { useAuth } from "../contexts/AuthContext";
import { CLINICAL_ROLES, ROLE_LABELS, hasRole } from "../roles";

const EVOLUTION_TYPE_LABELS: Record<Evolution["type"], string> = {
  MEDICA: "Evolução Médica",
  ENFERMAGEM: "Evolução de Enfermagem",
  MULTIPROFISSIONAL: "Evolução Multiprofissional",
};

const ADMISSION_TYPE_LABELS: Record<string, string> = {
  geral: "Geral",
  "transtorno-mental": "Transtorno Mental",
  "alcool-drogas": "Álcool e Drogas",
};

export default function PatientProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const canSeeClinical = hasRole(user?.role, CLINICAL_ROLES);
  const [activeTab, setActiveTab] = useState("overview");

  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [evolutions, setEvolutions] = useState<Evolution[]>([]);
  const [evolutionsError, setEvolutionsError] = useState("");

  const [addendumFor, setAddendumFor] = useState<Evolution | null>(null);
  const [addendumText, setAddendumText] = useState("");
  const [addendumError, setAddendumError] = useState("");
  const [savingAddendum, setSavingAddendum] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    getPatient(id)
      .then((data) => {
        if (active) setPatient(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Não foi possível carregar o paciente.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    if (canSeeClinical) {
      getEvolutions(id)
        .then((data) => {
          if (active) setEvolutions(data);
        })
        .catch((requestError) => {
          if (active) setEvolutionsError(requestError instanceof Error ? requestError.message : "Não foi possível carregar o histórico.");
        });
    }
    return () => {
      active = false;
    };
  }, [id, canSeeClinical]);

  // Evoluções originais com seus adendos logo abaixo.
  const timeline = useMemo(() => {
    const originals = evolutions.filter((item) => item.amendsId === null);
    return originals.map((original) => ({
      original,
      addenda: evolutions
        .filter((item) => item.amendsId === original.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    }));
  }, [evolutions]);

  // Prescrições registradas nas evoluções médicas, da mais recente para a mais antiga.
  const medications = useMemo(() => {
    const seen = new Set<string>();
    const list: { name: string; dose: string; frequency: string; startDate: string; prescriber: string }[] = [];
    for (const evolution of evolutions) {
      if (evolution.type !== "MEDICA" || evolution.amendsId !== null) continue;
      for (const item of evolution.details?.prescriptions ?? []) {
        const key = item.medicine.trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        list.push({
          name: item.medicine,
          dose: item.dosage,
          frequency: item.frequency,
          startDate: formatDateBR(evolution.occurredAt),
          prescriber: evolution.author.name,
        });
      }
    }
    return list;
  }, [evolutions]);

  const tabs = [
    { id: "overview", label: "Visão Geral" },
    { id: "timeline", label: "Histórico Clínico" },
    { id: "medications", label: "Medicamentos" },
  ];

  const handleStatusChange = async (status: PatientStatus) => {
    if (!patient || status === patient.status) return;
    try {
      const updated = await updatePatientStatus(patient.id, status);
      setPatient({ ...patient, status: updated.status });
    } catch (requestError) {
      alert(requestError instanceof Error ? requestError.message : "Não foi possível alterar o status.");
    }
  };

  const handleAddendum = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!addendumFor) return;
    setAddendumError("");
    setSavingAddendum(true);
    try {
      const created = await createAddendum(addendumFor.id, addendumText.trim());
      setEvolutions((current) => [created, ...current]);
      setAddendumFor(null);
      setAddendumText("");
    } catch (requestError) {
      setAddendumError(requestError instanceof Error ? requestError.message : "Não foi possível salvar o adendo.");
    } finally {
      setSavingAddendum(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-muted-foreground">Carregando prontuário...</div>;
  }

  if (error || !patient) {
    return (
      <div className="p-6 space-y-4">
        <Link to="/patients" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Voltar para pacientes
        </Link>
        <div className="bg-red-100 px-4 py-3 rounded-lg text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error || "Paciente não encontrado."}
        </div>
      </div>
    );
  }

  const age = ageFrom(patient.birthDate);
  const clinicalBlocked = (
    <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
      Seu perfil não tem acesso ao histórico clínico.
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/patients" className="p-2 hover:bg-muted rounded-lg transition-all print:hidden">
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
              {initials(patient.fullName)}
            </div>
            <div>
              <h2 className="text-2xl font-semibold">{patient.fullName}</h2>
              {patient.socialName && <p className="text-white/90">Nome social: {patient.socialName}</p>}
              <p className="text-white/80 mt-1">
                CPF: {patient.cpf}
                {age !== null ? ` • ${age} anos` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 print:hidden">
            {canSeeClinical && (
              <Link
                to={`/evolution/${patient.id}`}
                className="px-4 py-2 bg-white text-primary rounded-lg font-medium hover:bg-white/90 transition-all"
              >
                Nova Evolução
              </Link>
            )}
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-white/20 backdrop-blur text-white rounded-lg font-medium hover:bg-white/30 transition-all"
            >
              Imprimir Prontuário
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-border print:hidden">
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
                <span className="font-medium">{formatDateBR(patient.birthDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Idade:</span>
                <span className="font-medium">{age !== null ? `${age} anos` : "Não informado"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nome social:</span>
                <span className="font-medium">{patient.socialName || "Não informado"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cadastrado em:</span>
                <span className="font-medium">{formatDateBR(patient.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Informações Clínicas
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                <select
                  value={patient.status}
                  onChange={(e) => void handleStatusChange(e.target.value as PatientStatus)}
                  className={`px-3 py-1 rounded-full font-medium border-none ${
                    patient.status === "ATIVO"
                      ? "bg-green-100 text-green-700"
                      : patient.status === "EM_CRISE"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {(Object.keys(PATIENT_STATUS_LABELS) as PatientStatus[]).map((status) => (
                    <option key={status} value={status}>{PATIENT_STATUS_LABELS[status]}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Último acolhimento:</span>
                <span className="font-medium">
                  {patient.lastAdmission ? formatDateBR(patient.lastAdmission.date) : "Não registrado"}
                </span>
              </div>
              {patient.lastAdmission && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo de acolhimento:</span>
                    <span className="font-medium">{ADMISSION_TYPE_LABELS[patient.lastAdmission.type] ?? patient.lastAdmission.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Acolhido por:</span>
                    <span className="font-medium">
                      {patient.lastAdmission.author.name} ({ROLE_LABELS[patient.lastAdmission.author.role]})
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <Pill className="w-5 h-5" />
              Medicamentos em Uso
            </h3>
            {!canSeeClinical ? (
              <p className="text-sm text-muted-foreground">Seu perfil não tem acesso a prescrições.</p>
            ) : medications.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma prescrição registrada em evolução médica.</p>
            ) : (
              <div className="space-y-3">
                {medications.map((med) => (
                  <div key={med.name} className="p-4 bg-muted/50 rounded-lg border border-border">
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
            )}
          </div>
        </div>
      )}

      {activeTab === "timeline" &&
        (!canSeeClinical ? (
          clinicalBlocked
        ) : (
          <div className="space-y-4">
            {evolutionsError && (
              <div className="bg-red-100 px-4 py-3 rounded-lg text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{evolutionsError}</div>
            )}
            {timeline.length === 0 && !evolutionsError && (
              <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
                Nenhuma evolução registrada.
              </div>
            )}
            {timeline.map(({ original, addenda }) => (
              <div key={original.id} className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-semibold text-foreground">{EVOLUTION_TYPE_LABELS[original.type]}</h4>
                        <p className="text-sm text-muted-foreground">
                          {original.author.name} ({ROLE_LABELS[original.author.role]}) • {original.attendanceType}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                        <Calendar className="w-4 h-4" />
                        {formatDateTimeBR(original.occurredAt)}
                      </div>
                    </div>

                    {original.details?.vitalSigns && (
                      <p className="text-sm text-muted-foreground">
                        Sinais vitais:
                        {original.details.vitalSigns.bloodPressure ? ` PA ${original.details.vitalSigns.bloodPressure} mmHg;` : ""}
                        {original.details.vitalSigns.heartRate ? ` FC ${original.details.vitalSigns.heartRate} bpm;` : ""}
                        {original.details.vitalSigns.temperature ? ` Temp. ${original.details.vitalSigns.temperature} °C;` : ""}
                        {original.details.vitalSigns.spo2 ? ` SpO2 ${original.details.vitalSigns.spo2}%` : ""}
                      </p>
                    )}

                    {original.notes && <p className="text-sm text-foreground whitespace-pre-wrap">{original.notes}</p>}

                    {(original.details?.topics ?? []).map((topic, index) => (
                      <div
                        key={index}
                        className={`rounded-lg p-3 ${topic.isPrivate ? "bg-amber-50 dark:bg-amber-950/20 print:hidden" : "bg-muted/50"}`}
                      >
                        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                          {topic.title}
                          {topic.isPrivate && (
                            <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                              <EyeOff className="w-3 h-3" /> Privado
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-foreground whitespace-pre-wrap mt-1">{topic.content}</p>
                      </div>
                    ))}

                    {(original.details?.prescriptions ?? []).length > 0 && (
                      <div className="text-sm">
                        <p className="font-medium text-foreground">Prescrição:</p>
                        <ul className="list-disc pl-5 text-foreground">
                          {(original.details?.prescriptions ?? []).map((item, index) => (
                            <li key={index}>
                              {item.medicine} - {item.dosage} - {item.frequency}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {addenda.map((addendum) => (
                      <div key={addendum.id} className="border-l-4 border-primary/40 pl-4 py-1">
                        <p className="text-xs text-muted-foreground">
                          Adendo de {addendum.author.name} ({ROLE_LABELS[addendum.author.role]}) em {formatDateTimeBR(addendum.createdAt)}
                        </p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{addendum.notes}</p>
                      </div>
                    ))}

                    <div className="flex justify-between items-center pt-1 print:hidden">
                      <p className="text-xs text-muted-foreground">Registrado em {formatDateTimeBR(original.createdAt)}. Registros não podem ser editados.</p>
                      <button
                        onClick={() => {
                          setAddendumFor(original);
                          setAddendumText("");
                          setAddendumError("");
                        }}
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Adicionar adendo
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

      {activeTab === "medications" &&
        (!canSeeClinical ? (
          clinicalBlocked
        ) : (
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-foreground">Histórico de Medicamentos</h3>
              {hasRole(user?.role, ["MEDICO"]) && (
                <Link
                  to={`/evolution/${patient.id}`}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all print:hidden"
                >
                  Prescrever Medicamento
                </Link>
              )}
            </div>
            {medications.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma prescrição registrada em evolução médica.</p>
            ) : (
              <div className="space-y-4">
                {medications.map((med) => (
                  <div key={med.name} className="p-6 bg-muted/50 rounded-lg border border-border">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground text-lg">{med.name}</h4>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
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
                          <div>
                            <span className="text-muted-foreground">Prescrito por:</span>
                            <p className="font-medium mt-1">{med.prescriber}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

      {addendumFor && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setAddendumFor(null)}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Adendo à evolução de {formatDateTimeBR(addendumFor.occurredAt)}</h3>
              <button onClick={() => setAddendumFor(null)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              A evolução original não é alterada. O adendo fica registrado com seu nome, data e hora.
            </p>
            <form onSubmit={handleAddendum} className="space-y-4">
              <textarea
                rows={6}
                required
                minLength={3}
                maxLength={10000}
                value={addendumText}
                onChange={(e) => setAddendumText(e.target.value)}
                className="w-full px-4 py-3 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                placeholder="Descreva a correção ou complemento..."
              />
              {addendumError && (
                <p className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{addendumError}</p>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setAddendumFor(null)} className="flex-1 py-2.5 border border-border rounded-lg font-medium hover:bg-muted">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAddendum}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-60"
                >
                  {savingAddendum ? "Salvando..." : "Salvar adendo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
